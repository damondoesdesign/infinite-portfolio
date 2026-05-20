import { flipKeyframes, thumbImageRect, visualImageRect, type Rect } from './flip'
import { setImageSrc } from './setImageSrc'
import type { Project } from './types'

const ZOOM_MS = 580
const LOAD_TIMEOUT_MS = 8000

interface DetailOptions {
  onClose: () => void
  getThumbBySlug: (slug: string) => HTMLElement | null
  freezeCanvas: () => void
  unfreezeCanvas: () => void
}

export class DetailView {
  private readonly options: DetailOptions
  private readonly root: HTMLElement
  private readonly overlay: HTMLElement
  private readonly stage: HTMLElement
  private readonly img: HTMLImageElement
  private readonly caption: HTMLElement
  private readonly prevBtn: HTMLButtonElement
  private readonly nextBtn: HTMLButtonElement
  private readonly closeBtn: HTMLButtonElement

  private project: Project | null = null
  private imageIndex = 0
  private originSlug = ''
  private originThumbRect: Rect | null = null
  private isOpen = false
  private animating = false
  private loadToken = 0

  constructor(root: HTMLElement, options: DetailOptions) {
    this.options = options
    this.root = root

    this.overlay = document.createElement('div')
    this.overlay.className = 'detail-overlay'
    this.overlay.hidden = true

    this.stage = document.createElement('div')
    this.stage.className = 'detail-stage'

    this.img = document.createElement('img')
    this.img.className = 'detail-image'
    this.img.draggable = false

    this.caption = document.createElement('p')
    this.caption.className = 'piece-caption'

    this.prevBtn = document.createElement('button')
    this.prevBtn.type = 'button'
    this.prevBtn.className = 'detail-nav detail-nav-prev'
    this.prevBtn.setAttribute('aria-label', 'Previous image')
    this.prevBtn.innerHTML = iconChevron('left')
    this.prevBtn.hidden = true

    this.nextBtn = document.createElement('button')
    this.nextBtn.type = 'button'
    this.nextBtn.className = 'detail-nav detail-nav-next'
    this.nextBtn.setAttribute('aria-label', 'Next image')
    this.nextBtn.innerHTML = iconChevron('right')
    this.nextBtn.hidden = true

    this.closeBtn = document.createElement('button')
    this.closeBtn.type = 'button'
    this.closeBtn.className = 'detail-close'
    this.closeBtn.setAttribute('aria-label', 'Close')
    this.closeBtn.textContent = '×'

    this.stage.append(this.img)
    this.overlay.append(this.closeBtn, this.stage, this.caption, this.prevBtn, this.nextBtn)
    this.root.appendChild(this.overlay)

    this.overlay.addEventListener('click', (e) => {
      if (this.animating) return
      if ((e.target as HTMLElement).closest('.detail-nav, .detail-close')) return
      this.close()
    })

    this.prevBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.step(-1)
    })
    this.nextBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.step(1)
    })
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.close()
    })

    window.addEventListener('keydown', this.onKeyDown)
    this.stage.addEventListener('touchstart', this.onTouchStart, { passive: true })
    this.stage.addEventListener('touchend', this.onTouchEnd, { passive: true })
  }

  private touchStartX = 0

  private onTouchStart = (e: TouchEvent) => {
    this.touchStartX = e.changedTouches[0]?.clientX ?? 0
  }

  private onTouchEnd = (e: TouchEvent) => {
    if (!this.isOpen) return
    if ((this.project?.images.length ?? 0) <= 1) return
    const endX = e.changedTouches[0]?.clientX ?? 0
    const dx = endX - this.touchStartX
    if (Math.abs(dx) < 48) return
    e.stopPropagation()
    this.step(dx < 0 ? 1 : -1)
  }

  open(project: Project, thumbEl: HTMLElement, imageIndex = 0) {
    if (this.animating) return

    this.cancelImgAnimations()
    this.resetImgStyles()

    this.originThumbRect = thumbImageRect(thumbEl)
    this.options.freezeCanvas()

    this.project = project
    this.imageIndex = imageIndex
    this.originSlug = project.slug
    this.isOpen = true
    this.overlay.hidden = false
    this.caption.style.opacity = '0'
    this.root.classList.add('detail-active')
    this.updateNav()

    const token = ++this.loadToken
    this.applyImage(token, false, () => {
      if (token !== this.loadToken) return
      this.runFlipOpen()
    })
  }

  private resetImgStyles() {
    this.img.style.transform = ''
    this.img.style.opacity = '1'
  }

  private cancelImgAnimations() {
    for (const anim of this.img.getAnimations()) {
      anim.cancel()
    }
    this.resetImgStyles()
  }

  private applyImage(token: number, crossfade: boolean, onReady: () => void) {
    if (!this.project) return
    const item = this.project.images[this.imageIndex]
    if (!item) return

    if (crossfade && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.cancelImgAnimations()
      this.img.animate([{ opacity: 0.35 }, { opacity: 1 }], {
        duration: 220,
        easing: 'ease-out',
      })
    }

    setImageSrc(this.img, item.file, { eager: true })

    const show = () => {
      if (token !== this.loadToken) return
      this.img.alt = item.alt
      this.caption.textContent = item.caption
      onReady()
    }

    this.waitForImageLoad(show)
  }

  private waitForImageLoad(cb: () => void) {
    const run = () => requestAnimationFrame(() => requestAnimationFrame(cb))

    if (this.img.complete && this.img.naturalWidth > 0) {
      run()
      return
    }

    const timeout = window.setTimeout(run, LOAD_TIMEOUT_MS)
    const done = () => {
      clearTimeout(timeout)
      this.img.removeEventListener('load', done)
      this.img.removeEventListener('error', done)
      run()
    }
    this.img.addEventListener('load', done, { once: true })
    this.img.addEventListener('error', done, { once: true })
  }

  private runFlipOpen() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = this.originThumbRect
    if (!from || reduced || this.img.naturalWidth === 0) {
      this.caption.style.opacity = '1'
      return
    }

    this.cancelImgAnimations()

    const to = visualImageRect(this.img)
    const k = flipKeyframes(from, to)

    this.animating = true
    const anim = this.img.animate([k.from, k.to], {
      duration: ZOOM_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    })
    anim.onfinish = () => {
      this.resetImgStyles()
      this.caption.style.opacity = '1'
      this.animating = false
    }
    anim.oncancel = () => {
      this.resetImgStyles()
      this.caption.style.opacity = '1'
      this.animating = false
    }
  }

  private runFlipClose(onDone: () => void) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const thumbEl = this.options.getThumbBySlug(this.originSlug)
    const from = thumbEl ? thumbImageRect(thumbEl) : this.originThumbRect

    if (!from || reduced || this.img.naturalWidth === 0) {
      this.animating = true
      const anim = this.img.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 260,
        fill: 'forwards',
      })
      anim.onfinish = () => {
        this.animating = false
        onDone()
      }
      return
    }

    this.cancelImgAnimations()

    const to = visualImageRect(this.img)
    const k = flipKeyframes(from, to)

    this.animating = true
    this.caption.style.opacity = '0'
    const anim = this.img.animate([k.to, k.from], {
      duration: ZOOM_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    })
    anim.onfinish = () => {
      this.resetImgStyles()
      this.animating = false
      onDone()
    }
  }

  close() {
    if (!this.isOpen || this.animating) return

    const finish = () => {
      this.loadToken++
      this.cancelImgAnimations()
      this.isOpen = false
      this.project = null
      this.originSlug = ''
      this.originThumbRect = null
      this.overlay.hidden = true
      this.caption.style.opacity = ''
      this.root.classList.remove('detail-active')
      this.options.unfreezeCanvas()
      this.options.onClose()
    }

    this.runFlipClose(finish)
  }

  private step(delta: number) {
    if (!this.project) return
    const len = this.project.images.length
    if (len <= 1) return
    this.imageIndex = (this.imageIndex + delta + len) % len
    const token = ++this.loadToken
    this.applyImage(token, true, () => {
      if (token !== this.loadToken) return
      this.resetImgStyles()
    })
  }

  private updateNav() {
    const multi = (this.project?.images.length ?? 0) > 1
    this.prevBtn.hidden = !multi
    this.nextBtn.hidden = !multi
    this.prevBtn.style.display = multi ? 'grid' : 'none'
    this.nextBtn.style.display = multi ? 'grid' : 'none'
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.isOpen) return
    if (e.key === 'Escape') this.close()
    if (e.key === 'ArrowLeft') this.step(-1)
    if (e.key === 'ArrowRight') this.step(1)
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown)
  }
}

function iconChevron(dir: 'left' | 'right'): string {
  const path =
    dir === 'left' ? 'M14 4 L6 12 L14 20' : 'M6 4 L14 12 L6 20'
  return `<svg viewBox="0 0 20 24" width="20" height="24" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/></svg>`
}
