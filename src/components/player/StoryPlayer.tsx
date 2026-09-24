import React, { useRef, useState, useEffect } from 'react';
import { getStoryById } from "../../data/stories";
import { StoryMeta, StoryChunk } from "../../types/types";
import { CharacterVideoOverlay } from '../CharacterVideoOverlay';
import BedtimeEndScreen from '../../screens/BedtimeEndScreen'; // (أو المسار الصحيح حسب مكان الملف لديك)
import { assetUrl } from '../../utils/assetUrl';

interface StoryPlayerProps {
  storyId: string;
  childName?: string;
  childGender?: 'boy' | 'girl' | null;
  onBack?: () => void;
  onFinish?: () => void;
}

// 💤 ملف الصوت الهادئ الذي يُشغَّل مع شاشة النعس بعد انتهاء القصة.
// عدّل هذا المسار لاحقاً عندما يتوفر الملف النهائي (تهويدة / موسيقى هادئة) — بدون أي تعديل آخر بالكود.
const SLEEP_AUDIO_SRC = `${import.meta.env.BASE_URL}audio/sleep/yalla_tnam_1.mp3`;

const StoryPlayer: React.FC<StoryPlayerProps> = ({
  storyId,
  childName,
  childGender,
  onBack,
  onFinish,
}) => {
  const story = getStoryById(storyId);

  const storyAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bgVolume, setBgVolume] = useState<number>(0.25);
  const [showSleepyEnding, setShowSleepyEnding] = useState<boolean>(false);
  const sleepAudioRef = useRef<HTMLAudioElement | null>(null);

 // 🌟 حقن المقطع التمهيدي (id: 0) تلقائياً في بداية القصة إذا لم يكن موجوداً
  const initializedChunks = React.useMemo(() => {
    if (!story || !story.chunks) return [];

    const hasIntro = story.chunks.some((chunk: any) => chunk.id === 0 || chunk.id === '0');

    if (!hasIntro) {
      const introChunk = {
        id: 0,
        text: story.title || "بداية القصة",
        startTime: 0,
        // 👈 استخدام الدالة الموحدة هنا
        imageAsset: assetUrl(`audio/stories/${story.title?.replace(/\s+/g, '_') || 'story'}/cover.png`),
      };
      return [introChunk, ...story.chunks];
    }

    return story.chunks;
  }, [story]);

  // 1. إنشاء حالة محلية للـ chunks لتمكين التحديث البرمجي الآمن
  const [localChunks, setLocalChunks] = useState<StoryChunk[]>(initializedChunks);

  useEffect(() => {
    setLocalChunks(initializedChunks);
  }, [initializedChunks]);

  const chunksRef = useRef(localChunks);
  useEffect(() => {
    chunksRef.current = localChunks;
  }, [localChunks]);

  // 🔧 إصلاح: نحتفظ بقيمة currentChunkIndex الحقيقية دايماً عبر ref،
  // لأن الأحداث الصوتية (مثل 'ended') كانت بتشوف قيمة قديمة (stale) وما توصل أبداً لآخر مقطع فعلياً.
  const currentChunkIndexRef = useRef(currentChunkIndex);
  useEffect(() => {
    currentChunkIndexRef.current = currentChunkIndex;
  }, [currentChunkIndex]);

  const chunks: StoryChunk[] = localChunks;
  const currentChunk: StoryChunk | null = chunks.length > 0 ? chunks[currentChunkIndex] : null;
  const currentAudioUrl = currentChunk?.audioUrl || story?.audioUrl || '';

  // ⏱️ حسابات الأوقات بناءً على إجمالي عدد الحروف والوقت الكلي
  const processChunkTimes = (totalDuration: number) => {
    const currentChunks = chunksRef.current;
    if (currentChunks.length === 0 || totalDuration <= 0) return;
    
    if (currentChunks[0].endTime !== undefined && currentChunks[0].endTime !== null) return;

    let totalChars = 0;
    currentChunks.forEach(chunk => {
      totalChars += chunk.text?.length || 1;
    });

    if (totalChars === 0) totalChars = 1;

    let accumulatedTime = 0;
    const updatedChunks = currentChunks.map(chunk => {
      const charCount = chunk.text?.length || 1;
      const chunkDuration = totalDuration * (charCount / totalChars);
      const startTime = accumulatedTime;
      const endTime = accumulatedTime + chunkDuration;
      accumulatedTime = endTime;

      return {
        ...chunk,
        startTime,
        endTime,
      };
    });

    if (updatedChunks.length > 0) {
      updatedChunks[updatedChunks.length - 1].endTime = totalDuration;
    }

    setLocalChunks(updatedChunks);
    console.log("🛠️ [CHUNKS PROCESSED BY CHARS SUCCESS]:", updatedChunks.map(c => ({ id: c.id, start: c.startTime?.toFixed(2), end: c.endTime?.toFixed(2) })));
  };

  // 🖼️ دالة العرض بناءً على نطاق المقطع المحوري (Pivot Span) وقاعدة 85% صورة و 15% بومة
  const getActiveVisual = () => {
    if (!chunks.length) {
      return { type: 'image', src: `${import.meta.env.BASE_URL}${story?.coverImage?.replace(/^\//, '') || ''}` };
    }

    // 1. البحث عن المقطع المحوري الحالي (Pivot) الذي يحمل imageAsset
    let pivotChunkIndex = currentChunkIndex;
    while (pivotChunkIndex >= 0 && !chunks[pivotChunkIndex]?.imageAsset) {
      pivotChunkIndex--;
    }

    if (pivotChunkIndex < 0) {
      return { type: 'image', src: `${import.meta.env.BASE_URL}${story?.coverImage?.replace(/^\//, '') || ''}` };
    }

    const pivotChunk = chunks[pivotChunkIndex];
    const activeImageSrc = pivotChunk.imageAsset!;
    const pivotStartTime = pivotChunk.startTime ?? 0;

    // 2. البحث عن المقطع المحوري التالي لتحديد نهاية النطاق الزمني لهذه الصورة
    let nextPivotIndex = pivotChunkIndex + 1;
    while (nextPivotIndex < chunks.length && !chunks[nextPivotIndex]?.imageAsset) {
      nextPivotIndex++;
    }

    const pivotEndTime = nextPivotIndex < chunks.length ? (chunks[nextPivotIndex].startTime ?? duration) : duration;
    
    // 3. حساب المدة الكلية لهذا المقطع المحوري وتطبيق نسبة 85% صورة و 15% بومة
    const pivotDuration = pivotEndTime - pivotStartTime;
    const elapsedInPivot = currentTime - pivotStartTime;
    const imageTimeLimit = pivotDuration * 0.85; // أول 85% من عمر الصورة المحورية
    const isImagePhase = elapsedInPivot <= imageTimeLimit && elapsedInPivot >= 0;

    if (isImagePhase && activeImageSrc) {
      return { type: 'image', src: activeImageSrc };
    } else {
      return { type: 'owl', src: '' };
    }
  };

  const visual = getActiveVisual();

  // ⏱️ إدارة ملف الصوت والأحداث الزمنية
  useEffect(() => {
    if (!currentAudioUrl) return;

    let isMounted = true;
    let hasFinished = false; // 🛟 يمنع تفعيل نهاية القصة أكتر من مرة (من 'ended' ومن شبكة الأمان مع بعض)
    const storyAudio = new Audio(currentAudioUrl);
    storyAudioRef.current = storyAudio;

    const finishStory = () => {
      if (hasFinished) return;
      const currentChunks = chunksRef.current;
      const activeIndex = currentChunkIndexRef.current;

      if (currentChunks.length > 0 && activeIndex < currentChunks.length - 1) {
        setCurrentChunkIndex(activeIndex + 1);
      } else {
        // 💤 القصة خلصت فعلياً: نوقف كل شي بهدوء ونعرض شاشة النعس بدل الرجوع الفوري للرئيسية
        hasFinished = true;
        setIsPlaying(false);
        if (bgAudioRef.current) bgAudioRef.current.pause();
        setShowSleepyEnding(true);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isMounted) return;
      const totalDuration = storyAudio.duration;
      if (!isNaN(totalDuration) && totalDuration > 0) {
        setDuration(totalDuration);
        processChunkTimes(totalDuration);
      }
    };

    const handleTimeUpdate = () => {
      if (!isMounted) return;
      const time = storyAudio.currentTime;
      setCurrentTime(time);

      const currentChunks = chunksRef.current;
      if (currentChunks.length > 0) {
        const matchingIndex = currentChunks.findIndex((chunk) => {
          if (chunk.startTime !== undefined && chunk.endTime !== undefined) {
            return time >= chunk.startTime && time < chunk.endTime;
          }
          return false;
        });

        if (matchingIndex !== -1) {
          setCurrentChunkIndex((prevIndex) => {
            if (prevIndex !== matchingIndex) {
              return matchingIndex;
            }
            return prevIndex;
          });
        }
      }

      // 🛟 شبكة أمان: لو اقتربنا كتير من نهاية الزمن الكلي الحقيقي (من عنصر الصوت نفسه،
      // مش من الـ state حتى ما نقع بنفس مشكلة القيم القديمة) ولسا حدث 'ended' ما انطلق،
      // نفعّل نهاية القصة يدوياً بدل ما نضل عالقين.
      const totalDuration = storyAudio.duration;
      if (!hasFinished && totalDuration && isFinite(totalDuration) && time >= totalDuration - 0.25) {
        finishStory();
      }
    };

    const handleEnded = () => {
      if (!isMounted) return;
      finishStory();
    };

    storyAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    storyAudio.addEventListener('timeupdate', handleTimeUpdate);
    storyAudio.addEventListener('ended', handleEnded);

    if (!isNaN(storyAudio.duration) && storyAudio.duration > 0) {
      setDuration(storyAudio.duration);
      processChunkTimes(storyAudio.duration);
    }

    if (isPlaying) {
      storyAudio.play().catch(() => setIsPlaying(false));
    }

    return () => {
      isMounted = false;
      storyAudio.pause();
      storyAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      storyAudio.removeEventListener('timeupdate', handleTimeUpdate);
      storyAudio.removeEventListener('ended', handleEnded);
    };
  }, [currentAudioUrl]);

  const togglePlay = (shouldPlay?: boolean) => {
    const nextState = shouldPlay !== undefined ? shouldPlay : !isPlaying;
    setIsPlaying(nextState);

    if (storyAudioRef.current) {
      if (nextState) {
        storyAudioRef.current.play().catch(() => {});
        if (bgAudioRef.current) bgAudioRef.current.play().catch(() => {});
      } else {
        storyAudioRef.current.pause();
        if (bgAudioRef.current) bgAudioRef.current.pause();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (storyAudioRef.current) {
      storyAudioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!story) {
    return (
      <div className="p-8 text-center text-white">
        <h2>❌ القصة غير موجودة.</h2>
        {onBack && <button onClick={onBack} className="mt-4 px-6 py-2 bg-slate-700 rounded-lg">العودة</button>}
      </div>
    );
  }

 // 💤 شاشة النعس بعد انتهاء القصة
  if (showSleepyEnding) {
    return <BedtimeEndScreen />;
  }
return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-900 text-white p-6 max-w-md mx-auto relative rounded-2xl shadow-2xl overflow-hidden">
      
      <div className="w-full flex justify-between items-center z-10">
        {onBack && (
          <button onClick={onBack} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-xl transition active:scale-95">
            ↩️
          </button>
        )}
        <span className="text-sm font-semibold text-amber-400">
          {childName ? `✨ لـ ${childName}` : 'حكاية مشوقة'}
        </span>
      </div>

      <div className="my-6 z-10 text-center w-full">
        <div className="relative w-72 h-72 mx-auto rounded-2xl overflow-hidden shadow-xl border-4 border-amber-300/30 bg-black flex items-center justify-center">
          {visual.type === 'image' ? (
            // 👈 استخدام assetUrl لصورة المشهد القادمة من الـ JSON (مثل scene.imageAsset أو visual.src)
            <img 
              key={visual.src} 
              src={assetUrl(visual.src)} 
              alt="مشهد القصة" 
              className="w-full h-full object-cover transition-opacity duration-500 ease-in-out" 
            />
          ) : (
            // 👈 استخدام assetUrl لفيديو الترحيب وصورة الغلاف الاحتياطية
            <CharacterVideoOverlay 
              videoSrc={assetUrl('videos/koko_welcome.mp4')} 
              idleImageSrc={assetUrl(story.coverImage || '')} 
              isSpeaking={isPlaying} 
            />
          )}
        </div>

        <h1 className="text-2xl font-black mt-4 text-amber-300">{story.title}</h1>
        
        <p className="text-base font-bold text-amber-100 mt-3 p-3 bg-slate-800/60 rounded-xl border border-white/10 shadow-inner min-h-[4rem] flex items-center justify-center">
          "{currentChunk?.text || story.description}"
        </p>
      </div>

      <div className="w-full bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl z-10 shadow-lg border border-slate-700">
        
        <div className="w-full mb-4">
          <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="w-full accent-amber-400 h-2 bg-slate-700 rounded-lg cursor-pointer" />
          <div className="flex justify-between text-xs text-slate-400 font-mono mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex justify-center items-center gap-6 my-2">
          <button onClick={() => setCurrentChunkIndex((prev) => Math.max(0, prev - 1))} disabled={currentChunkIndex === 0} className="p-3 text-slate-300 text-xl disabled:opacity-30">⏭️</button>
          <button onClick={() => togglePlay()} className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black shadow-xl ${isPlaying ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}>
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button onClick={() => setCurrentChunkIndex((prev) => Math.min(chunks.length - 1, prev + 1))} disabled={chunks.length === 0 || currentChunkIndex === chunks.length - 1} className="p-3 text-slate-300 text-xl disabled:opacity-30">⏭️</button>
        </div>

      </div>
    </div>
  );
};

export default StoryPlayer;