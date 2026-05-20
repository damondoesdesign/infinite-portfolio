import { assetUrl } from './assetUrl'

/** Assign image URL; GIFs reload so animation keeps playing in pooled tiles. */
export function setImageSrc(img: HTMLImageElement, filePath: string) {
  const url = assetUrl(filePath)
  const isGif = /\.gif$/i.test(filePath)

  if (isGif) {
    img.loading = 'eager'
    if (img.src === url) {
      img.src = ''
      void img.offsetWidth
    }
    img.src = url
    return
  }

  img.loading = 'lazy'
  if (img.src !== url) {
    img.src = url
  }
}
