import { assetUrl } from './assetUrl'

export interface SetImageOptions {
  /** Detail view and first paint — avoid lazy-load blanks. */
  eager?: boolean
}

/**
 * Assign src on a stable <img> node. Never replaces the element (GIFs stay animated).
 */
export function setImageSrc(
  img: HTMLImageElement,
  filePath: string,
  options: SetImageOptions = {}
): void {
  if (img.dataset.srcKey === filePath) return

  img.dataset.srcKey = filePath
  const url = assetUrl(filePath)
  img.loading = options.eager ? 'eager' : 'lazy'
  img.decoding = 'async'
  img.src = url
}
