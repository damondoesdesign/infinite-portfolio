/** Resolve /images/... paths for GitHub Pages base (e.g. /infinite-portfolio/). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const relative = path.startsWith('/') ? path.slice(1) : path
  const encoded = relative
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${base}${encoded}`
}
