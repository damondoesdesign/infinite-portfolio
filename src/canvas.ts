import { assetUrl } from './assetUrl'
import {
  buildTileLayouts,
  getCoverImage,
  getProjects,
  getWorldSize,
  TILE_SIZE,
} from './content'
import { clamp, lerp, prefersReducedMotion } from './motion'
import type { Project, TileLayout } from './types'

const DRAG_THRESHOLD = 8
const PAN_LERP = 0.14
const DRIFT_STRENGTH = 0.045
const INERTIA_DECAY = 0.9
const TAP_MAX_MS = 320

interface CanvasOptions {
  onOpenProject: (project: Project, thumbEl: HTMLElement, imageIndex: number) => void
}

export class InfiniteCanvas {
  private readonly root: HTMLElement
  private readonly viewport: HTMLElement
  private readonly world: HTMLElement
  private readonly tiles: TileLayout[]
  private readonly worldSize: { width: number; height: number }
  private readonly tileEls = new Map<number, HTMLElement>()

  private camX = 0
  private camY = 0
  private targetX = 0
  private targetY = 0
  private velX = 0
  private velY = 0

  private dragging = false
  private dragPointerId: number | null = null
  private dragStartX = 0
  private dragStartY = 0
  private dragOriginX = 0
  private dragOriginY = 0
  private dragMoved = false
  private pressTime = 0
  private pressedTile: HTMLElement | null = null
  private pressedProject: Project | null = null
  private tilePointerId: number | null = null
  private onOpenProject: CanvasOptions['onOpenProject']

  private pointerX = 0
  private pointerY = 0
  private hasPointer = false
  private rafId = 0
  private enabled = true

  constructor(root: HTMLElement, options: CanvasOptions) {
    this.root = root
    this.onOpenProject = options.onOpenProject
    this.tiles = buildTileLayouts(getProjects())
    this.worldSize = getWorldSize(this.tiles.length)

    this.viewport = document.createElement('div')
    this.viewport.className = 'canvas-viewport'

    this.world = document.createElement('div')
    this.world.className = 'canvas-world'
    this.viewport.appendChild(this.world)

    for (const tile of this.tiles) {
      const el = this.createTile(tile)
      this.tileEls.set(tile.index, el)
      this.world.appendChild(el)
    }

    this.root.appendChild(this.viewport)
    this.centerCamera()
    this.bindEvents()
    this.loop()
  }

  private centerCamera() {
    const cx = (window.innerWidth - this.worldSize.width) / 2
    const cy = (window.innerHeight - this.worldSize.height) / 2
    this.camX = cx
    this.camY = cy
    this.targetX = cx
    this.targetY = cy
    this.syncTiles()
  }

  setEnabled(value: boolean) {
    this.enabled = value
    this.viewport.classList.toggle('is-disabled', !value)
  }

  getCamera() {
    return { x: this.camX, y: this.camY }
  }

  setCamera(x: number, y: number) {
    this.camX = x
    this.camY = y
    this.targetX = x
    this.targetY = y
    this.velX = 0
    this.velY = 0
    this.syncTiles()
  }

  getTileElement(index: number) {
    return this.tileEls.get(index)
  }

  getProjectIndex(project: Project) {
    return this.tiles.findIndex((t) => t.project.slug === project.slug)
  }

  private createTile(tile: TileLayout): HTMLElement {
    const cover = getCoverImage(tile.project)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'canvas-tile'
    button.dataset.index = String(tile.index)
    button.setAttribute('aria-label', `Open ${tile.project.title}`)

    const img = document.createElement('img')
    img.src = assetUrl(cover.file)
    img.alt = cover.alt
    img.width = TILE_SIZE
    img.height = TILE_SIZE
    img.draggable = false
    img.loading = 'lazy'
    button.appendChild(img)

    if (tile.project.images.length > 1) {
      const badge = document.createElement('span')
      badge.className = 'canvas-tile-badge'
      badge.textContent = String(tile.project.images.length)
      button.appendChild(badge)
    }

    return button
  }

  private bindEvents() {
    this.viewport.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    window.addEventListener('resize', this.syncTiles)
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled) return
    const target = e.target as HTMLElement
    const tile = target.closest<HTMLElement>('.canvas-tile')

    if (tile) {
      this.tilePointerId = e.pointerId
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY
      this.dragMoved = false
      this.pressTime = performance.now()
      this.pressedTile = tile
      this.pressedProject =
        this.tiles[Number(tile.dataset.index)]?.project ?? null
      return
    }

    this.dragging = true
    this.dragPointerId = e.pointerId
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.dragOriginX = this.targetX
    this.dragOriginY = this.targetY
    this.dragMoved = false
    this.pressedTile = null
    this.pressedProject = null

    this.viewport.setPointerCapture(e.pointerId)
    this.viewport.classList.add('is-grabbing')
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.enabled) return

    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.hasPointer = true

    if (e.pointerId === this.tilePointerId) {
      const dx = e.clientX - this.dragStartX
      const dy = e.clientY - this.dragStartY
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) this.dragMoved = true
      return
    }

    if (!this.dragging || e.pointerId !== this.dragPointerId) return

    const dx = e.clientX - this.dragStartX
    const dy = e.clientY - this.dragStartY

    if (!this.dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      this.dragMoved = true
    }

    if (this.dragMoved) {
      this.targetX = this.dragOriginX + dx
      this.targetY = this.dragOriginY + dy
      this.velX = dx * 0.35
      this.velY = dy * 0.35
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === this.tilePointerId) {
      const quickTap =
        !this.dragMoved &&
        performance.now() - this.pressTime < TAP_MAX_MS &&
        this.pressedTile &&
        this.pressedProject

      if (quickTap && this.pressedTile && this.pressedProject) {
        this.onOpenProject(
          this.pressedProject,
          this.pressedTile,
          this.pressedProject.coverIndex ?? 0
        )
      }

      this.tilePointerId = null
      this.pressedTile = null
      this.pressedProject = null
      this.dragMoved = false
      return
    }

    if (e.pointerId !== this.dragPointerId) return

    this.dragging = false
    this.dragPointerId = null
    this.viewport.classList.remove('is-grabbing')
    try {
      this.viewport.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }

  private loop = () => {
    const reduced = prefersReducedMotion()
    const lerpFactor = reduced ? 1 : PAN_LERP

    if (this.enabled && !this.dragging && !reduced) {
      this.applyDesktopDrift()
    }

    if (!this.dragging && !reduced) {
      this.targetX += this.velX
      this.targetY += this.velY
      this.velX *= INERTIA_DECAY
      this.velY *= INERTIA_DECAY
      if (Math.abs(this.velX) < 0.08) this.velX = 0
      if (Math.abs(this.velY) < 0.08) this.velY = 0
    }

    this.camX = lerp(this.camX, this.targetX, lerpFactor)
    this.camY = lerp(this.camY, this.targetY, lerpFactor)
    this.syncTiles()

    this.rafId = requestAnimationFrame(this.loop)
  }

  private applyDesktopDrift() {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (coarse || !this.hasPointer) return

    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const nx = clamp((this.pointerX - cx) / cx, -1, 1)
    const ny = clamp((this.pointerY - cy) / cy, -1, 1)

    this.targetX += nx * DRIFT_STRENGTH * 16
    this.targetY += ny * DRIFT_STRENGTH * 16
  }

  private syncTiles = () => {
    const { width, height } = this.worldSize
    const viewW = window.innerWidth
    const viewH = window.innerHeight
    const margin = TILE_SIZE * 2

    for (const tile of this.tiles) {
      const el = this.tileEls.get(tile.index)
      if (!el) continue

      let bestX = 0
      let bestY = 0
      let bestDist = Infinity

      for (const ox of [-1, 0, 1]) {
        for (const oy of [-1, 0, 1]) {
          const x = tile.baseX + this.camX + ox * width
          const y = tile.baseY + this.camY + oy * height
          const dx = x + TILE_SIZE / 2 - viewW / 2
          const dy = y + TILE_SIZE / 2 - viewH / 2
          const dist = dx * dx + dy * dy
          if (dist < bestDist) {
            bestDist = dist
            bestX = x
            bestY = y
          }
        }
      }

      const visible =
        bestX > -margin &&
        bestX < viewW + margin &&
        bestY > -margin &&
        bestY < viewH + margin

      el.style.display = visible ? '' : 'none'
      el.style.transform = `translate3d(${bestX}px, ${bestY}px, 0)`
    }
  }

  destroy() {
    cancelAnimationFrame(this.rafId)
    this.viewport.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
    window.removeEventListener('resize', this.syncTiles)
  }
}
