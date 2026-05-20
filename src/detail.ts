import { setImageSrc } from './setImageSrc'
import type { Project } from './types'

const ZOOM_MS = 560

interface DetailOptions {
  onClose: () => void
  getThumbBySlug: (slug: string) => HTMLElement | null
}

export class DetailView {
  private readonly options: DetailOptions
  private readonly root: HTMLElement
  private readonly overlay: HTMLElement
  private readonly frame: HTMLElement
  private readonly img: HTMLImageElement
  private readonly caption: HTMLElement
  private readonly prevBtn: HTMLButtonElement
  private readonly nextBtn: HTMLButtonElement
  private readonly closeBtn: HTMLButtonElement

  private project: Project | null = null
  private imageIndex = 0
  private originSlug = ''
  private isOpen = false
  private animating = false

  constructor(root: HTMLElement, options: DetailOptions) {
    this.options = options
    this.root = root

    this.overlay = document.createElement('div')
    this.overlay.className = 'detail-overlay'
    this.overlay.hidden = true

    this.frame = document.createElement('div')
    this.frame.className = 'detail-frame'

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

    this.frame.append(this.prevBtn, this.img, this.nextBtn, this.caption)
    this.overlay.append(this.closeBtn, this.frame)
    this.root.appendChild(this.overlay)

    this.overlay.addEventListener('click', () => {
      if (!this.animating) this.close()
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
    this.frame.addEventListener('touchstart', this.onTouchStart, { passive: true })
    this.frame.addEventListener('touchend', this.onTouchEnd, { passive: true })
  }

  private touchStartX = 0

  private onTouchStart = (e: TouchEvent) => {
    this.touchStartX = e.changedTouches[0]?.clientX ?? 0
  }

  private onTouchEnd = (e: TouchEvent) => {
    if (!this.isOpen) return
    const len = this.project?.images.length ?? 0
    if (len <= 1) return
    const endX = e.changedTouches[0]?.clientX ?? 0
    const dx = endX - this.touchStartX
    if (Math.abs(dx) < 48) return
    e.stopPropagation()
    this.step(dx < 0 ? 1 : -1)
  }

  open(project: Project, thumbEl: HTMLElement, imageIndex = 0) {
    if (this.animating) return
    this.project = project
    this.imageIndex = imageIndex
    this.originSlug = project.slug
    this.isOpen = true
    this.overlay.hidden = false
    this.root.classList.add('detail-active')
    this.renderImage(false)
    this.updateNav()

    this.runFlipOpen(thumbEl)
  }

  private runFlipOpen(thumbEl: HTMLElement) {
    const thumbRect = thumbEl.getBoundingClientRect()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    requestAnimationFrame(() => {
      if (reduced) {
        this.frame.style.transform = 'none'
        this.frame.style.opacity = '1'
        return
      }

      this.animating = true
      const frameRect = this.frame.getBoundingClientRect()
      const dx =
        thumbRect.left +
        thumbRect.width / 2 -
        (frameRect.left + frameRect.width / 2)
      const dy =
        thumbRect.top +
        thumbRect.height / 2 -
        (frameRect.top + frameRect.height / 2)
      const sx = thumbRect.width / frameRect.width
      const sy = thumbRect.height / frameRect.height

      this.frame
        .animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
              opacity: 0.7,
            },
            { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
          ],
          {
            duration: ZOOM_MS,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both',
          }
        )
        .onfinish = () => {
          this.animating = false
          this.frame.style.transform = ''
        }
    })
  }

  private runFlipClose(onDone: () => void) {
    const thumb =
      this.options.getThumbBySlug(this.originSlug) ??
      document.querySelector<HTMLElement>(
        `.canvas-tile[data-slug="${this.originSlug}"]`
      )

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!thumb || reduced) {
      this.frame
        .animate(
          [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.94)' }],
          { duration: 280, easing: 'ease-in', fill: 'forwards' }
        )
        .onfinish = onDone
      return
    }

    const thumbRect = thumb.getBoundingClientRect()
    const frameRect = this.frame.getBoundingClientRect()
    const dx =
      thumbRect.left +
      thumbRect.width / 2 -
      (frameRect.left + frameRect.width / 2)
    const dy =
      thumbRect.top +
      thumbRect.height / 2 -
      (frameRect.top + frameRect.height / 2)
    const sx = thumbRect.width / frameRect.width
    const sy = thumbRect.height / frameRect.height

    this.animating = true
    this.frame
      .animate(
        [
          { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
          {
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
            opacity: 0.75,
          },
        ],
        {
          duration: ZOOM_MS,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      )
      .onfinish = () => {
        this.animating = false
        onDone()
      }
  }

  close() {
    if (!this.isOpen || this.animating) return

    const finish = () => {
      this.isOpen = false
      this.project = null
      this.originSlug = ''
      this.overlay.hidden = true
      this.root.classList.remove('detail-active')
      this.animating = false
      this.frame.style.transform = ''
      this.frame.style.opacity = ''
      this.options.onClose()
    }

    this.runFlipClose(finish)
  }

  private step(delta: number) {
    if (!this.project) return
    const len = this.project.images.length
    if (len <= 1) return
    this.imageIndex = (this.imageIndex + delta + len) % len
    this.renderImage(true)
  }

  private renderImage(animate: boolean) {
    if (!this.project) return
    const item = this.project.images[this.imageIndex]
    if (!item) return

    const swap = () => {
      setImageSrc(this.img, item.file)
      this.img.alt = item.alt
      this.caption.textContent = item.caption
    }

    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      swap()
      return
    }

    this.img.animate(
      [{ opacity: 0.15 }, { opacity: 1 }],
      { duration: 240, easing: 'ease-out' }
    )
    swap()
  }

  private updateNav() {
    const multi = (this.project?.images.length ?? 0) > 1
    this.prevBtn.hidden = !multi
    this.nextBtn.hidden = !multi
    this.prevBtn.style.display = multi ? '' : 'none'
    this.nextBtn.style.display = multi ? '' : 'none'
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
