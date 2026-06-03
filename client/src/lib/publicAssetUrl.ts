/** Resolve stored paths (e.g. /uploads/venues/...) for <img src>. */
export function publicAssetUrl(src: string): string {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
  return src;
}
