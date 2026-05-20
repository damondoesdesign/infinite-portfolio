export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export function domRect(el: Element): Rect {
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

/** Visible pixels for object-fit: contain (excludes letterbox padding). */
export function visualImageRect(img: HTMLImageElement): Rect {
  const box = img.getBoundingClientRect()
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  if (!nw || !nh) return domRect(img)

  const scale = Math.min(box.width / nw, box.height / nh)
  const w = nw * scale
  const h = nh * scale
  return {
    left: box.left + (box.width - w) / 2,
    top: box.top + (box.height - h) / 2,
    width: w,
    height: h,
  }
}

export function thumbImageRect(tileEl: HTMLElement): Rect {
  const img = tileEl.querySelector('img')
  return img ? visualImageRect(img) : domRect(tileEl)
}

/** FLIP transform from `from` rect to `to` rect (centered scale). */
export function flipKeyframes(from: Rect, to: Rect) {
  const fromCx = from.left + from.width / 2
  const fromCy = from.top + from.height / 2
  const toCx = to.left + to.width / 2
  const toCy = to.top + to.height / 2
  const dx = fromCx - toCx
  const dy = fromCy - toCy
  const sx = from.width / Math.max(to.width, 1)
  const sy = from.height / Math.max(to.height, 1)

  return {
    from: {
      transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
      opacity: 0.85,
    },
    to: {
      transform: 'translate(0px, 0px) scale(1, 1)',
      opacity: 1,
    },
  }
}
