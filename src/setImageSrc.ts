import { assetUrl } from './assetUrl'

const assigned = new WeakMap<HTMLImageElement, string>()

/** Assign image URL; GIFs only reload when the file path actually changes. */
export function setImageSrc(img: HTMLImageElement, filePath: string) {
  const prev = assigned.get(img)
  if (prev === filePath) return

  assigned.set(img, filePath)
  const url = assetUrl(filePath)
  const isGif = /\.gif$/i.test(filePath)

  if (isGif) {
    img.loading = 'eager'
    img.src = ''
    void img.offsetWidth
    img.src = url
    return
  }

  img.loading = 'lazy'
  img.src = url
}

export function clearImageAssignment(img: HTMLImageElement) {
  assigned.delete(img)
}
