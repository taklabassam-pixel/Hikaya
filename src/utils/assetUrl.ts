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

  // إزالة مسار الأساس إذا وُجد مسبقاً لتجنب التكرار
  if (cleanPath.startsWith(base)) {
    cleanPath = cleanPath.slice(base.length);
  }

  // تنظيف أي شرطة مائلة في البداية
  cleanPath = cleanPath.replace(/^\/+/, '');

  // التأكد من انتهاء الـ base بشرطة مائلة واحدة
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  return `${normalizedBase}${cleanPath}`;
}