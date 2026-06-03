/** Resolve stored model ref to a URL for useGLTF / preload (basename or absolute path). */
export function resolveGlbUrl(modelRef: string | null | undefined): string | null {
  const m = modelRef?.trim();
  if (!m) return null;
  if (m.startsWith('/')) return m;
  return `/models/${m}`;
}
