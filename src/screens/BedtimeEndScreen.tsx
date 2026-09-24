import React, { useEffect, useState, useRef } from 'react';
// تأكد من ضبط مسار الاستيراد بحسب مكان الملف الحالي لديك
import { assetUrl } from '../utils/assetUrl';

export default function BedtimeEndScreen() {
  const [showVideo, setShowVideo] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(1.0);
  const [playCount, setPlayCount] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // عدد مرات التكرار المطلوبة
  const maxRepeats = 3;

  useEffect(() => {
    // 1. تشغيل ملف الصوت الهادئ (التهويدة) باستخدام assetUrl
    const audioPath = assetUrl('audio/sleep/yalla_tnam_1.mp3');
    const audio = new Audio(audioPath);
    audio.volume = 0.4;
    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("تعذر تشغيل الصوت تلقائياً بسبب سياسة المتصفح:", error);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // دالة تُستدعى كلما انتهى الفيديو من العرض
  const handleVideoEnded = () => {
    if (playCount + 1 < maxRepeats) {
      // التكرار مستمر
      setPlayCount((prev) => prev + 1);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      // اكتملت مرات التكرار المطلوبة:
      // نترك الفيديو على الفريم الأخير متوقفاً لمدة 3 ثوانٍ، ثم ننتقل لشاشة البومة الساكنة
      setTimeout(() => {
        setShowVideo(false);
        setTimeout(() => {
          setOpacity(0.05);
        }, 1000);
      }, 3000); // 3 ثوانٍ انتظار على الفريم الأخير
    }
  };

  return (
    <div style={{
      backgroundColor: '#04060A',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      {showVideo ? (
        <video 
          ref={videoRef}
          src={assetUrl('videos/sleeping_moon.mp4')} // 👈 استخدام الدالة الموحدة لفيديو النهاية
          autoPlay 
          muted 
          playsInline
          onEnded={handleVideoEnded}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div style={{
          opacity: opacity,
          transition: 'opacity 5s ease-in-out',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <img 
            src={assetUrl('images/sleeping_moon.png')} // 👈 استخدام الدالة الموحدة لصورة البومة الساكنة
            alt="البومة النائمة" 
            style={{
              width: '110px',
              height: '110px',
              opacity: 0.5,
              marginBottom: '28px',
              objectFit: 'contain'
            }} 
          />
          <h2 style={{
            fontSize: '20px',
            fontWeight: 300,
            color: 'rgba(255, 255, 255, 0.38)',
            letterSpacing: '2px',
            margin: 0
          }}>
            تصبح على خير...
          </h2>
        </div>
      )}
    </div>
  );
}