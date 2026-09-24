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

  const base = import.meta.env.BASE_URL || '/';

  let cleanPath = path;

  // 1. إذا كان المسار يحتوي مسبقاً على الـ base (مثل /Hikaya/)، نقوم بإزالته لتجنب التكرار
  if (cleanPath.startsWith(base)) {
    cleanPath = cleanPath.slice(base.length);
  }

  // 2. تنظيف أي شرطة مائلة في بداية المسار المتبقي
  cleanPath = cleanPath.replace(/^\/+/, '');

  // 3. التأكد من أن الـ base ينتهي بشرطة مائلة واحدة صحيحة
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  const finalUrl = `${normalizedBase}${cleanPath}`;

  // للتتبع العملي في الكونسول
  console.log("🛠️ [AssetUrl Check] Input:", path, "===> Output:", finalUrl);

  return finalUrl;
}