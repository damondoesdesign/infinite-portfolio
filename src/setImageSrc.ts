import { assetUrl } from './assetUrl'

const assigned = new WeakMap<HTMLImageElement, string>()

function gifUrl(path: string) {
  const base = assetUrl(path)
  return `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`
}

/** Load image; GIFs use a fresh element so animation plays in pooled tiles. */
export function setImageSrc(
  img: HTMLImageElement,
  filePath: string
): HTMLImageElement {
  const isGif = /\.gif$/i.test(filePath)
  const url = isGif ? gifUrl(filePath) : assetUrl(filePath)
  const prev = assigned.get(img)

  if (prev === filePath) return img

  if (isGif) {
    const parent = img.parentElement
    if (parent) {
      const next = document.createElement('img')
      next.className = img.className
      next.alt = img.alt
      next.draggable = false
      next.loading = 'eager'
      next.decoding = 'sync'
      next.src = url
      parent.replaceChild(next, img)
      assigned.set(next, filePath)
      return next
    }
    img.loading = 'eager'
    img.src = url
    assigned.set(img, filePath)
    return img
  }

  assigned.set(img, filePath)
  img.loading = 'lazy'
  img.src = url
  return img
}
