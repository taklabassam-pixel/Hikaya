/**
 * يبني مسار صحيح لأي ملف بمجلد public (صور، صوت، فيديو)
 * بغض النظر عن مكان تشغيل التطبيق: محلياً (base = "/")
 * أو منشور تحت مسار فرعي متل GitHub Pages (base = "/Hikaya/").
 *
 * استخدام:
 *   assetUrl('/audio/static/bg_music.mp3')
 *   assetUrl(`/audio/stories/${storyId}/cover.png`)
 */
export const assetUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL; // دايماً بينتهي بـ "/"
  const cleanPath = path.replace(/^\/+/, ''); // نشيل أي "/" بالبداية حتى ما يتكرر
  return `${base}${cleanPath}`;
};
