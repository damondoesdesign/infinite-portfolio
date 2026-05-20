import { assetUrl } from './assetUrl'

/**
 * Set image src on a stable element. Always eager — lazy breaks on transformed canvas tiles.
 */
export function setImageSrc(img: HTMLImageElement, filePath: string): void {
  if (img.dataset.srcKey === filePath) return
  img.dataset.srcKey = filePath
  img.loading = 'eager'
  img.decoding = 'async'
  img.src = assetUrl(filePath)
}
