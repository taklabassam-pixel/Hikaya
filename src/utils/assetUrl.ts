/**
 * يبني مسار صحيح لأي ملف بمجلد public (صور، صوت، فيديو)
 * بغض النظر عن مكان تشغيل التطبيق: محلياً (base = "/")
 * أو منشور تحت مسار فرعي متل GitHub Pages (base = "/Hikaya/").
 *
 * استخدام:
 *   assetUrl('/audio/static/bg_music.mp3')
 *   assetUrl(`/audio/stories/${storyId}/cover.png`)
 */
export function assetUrl(path: string): string {
  if (!path) return '';
  
  // إزالة أي شرطة مائلة في البداية لتجنب تكرارها
  const cleanPath = path.replace(/^\/+/, '');
  const finalUrl = `${import.meta.env.BASE_URL}${cleanPath}`;
  
  // 🔍 فحص عملي مباشر لمعرفة المسار الناتج في الـ Console
  console.log("🛠️ [AssetUrl Check] Input:", path, "===> Output:", finalUrl);
  
  return finalUrl;
}
