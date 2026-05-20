import {
  getCoverImage,
  getGridDimensions,
  getProjects,
  projectIndexForCell,
  TILE_PITCH,
  TILE_SIZE,
} from './content'
import { lerp, prefersReducedMotion } from './motion'
import { setImageSrc } from './setImageSrc'
import type { Project } from './types'

const DRAG_THRESHOLD = 8
const PAN_LERP = 0.14
const DRIFT_STRENGTH = 0.045
const INERTIA_DECAY = 0.9
const TAP_MAX_MS = 320

interface CanvasOptions {
  onOpenProject: (project: Project, thumbEl: HTMLElement, imageIndex: number) => void
}

interface PooledTile {
  el: HTMLButtonElement
  img: HTMLImageElement
  fileKey: string
  projectSlug: string
  lastX: number
  lastY: number
}

export class InfiniteCanvas {
  private readonly root: HTMLElement
  private readonly viewport: HTMLElement
  private readonly world: HTMLElement
  private readonly projects: Project[]

  private readonly active = new Map<string, PooledTile>()
  private readonly pool: HTMLButtonElement[] = []

  private camX = 0
  private camY = 0
  private targetX = 0
  private targetY = 0
  private velX = 0
  private velY = 0
  private frozen = false
  private frozenX = 0
  private frozenY = 0
  private pauseSync = false

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
  private readonly onOpenProject: CanvasOptions['onOpenProject']

  private pointerX = window.innerWidth / 2
  private pointerY = window.innerHeight / 2
  private hasPointer = false
  private rafId = 0
  private enabled = true

  constructor(root: HTMLElement, options: CanvasOptions) {
    this.root = root
    this.onOpenProject = options.onOpenProject
    this.projects = getProjects()

    this.viewport = document.createElement('div')
    this.viewport.className = 'canvas-viewport'

    this.world = document.createElement('div')
    this.world.className = 'canvas-world'
    this.viewport.appendChild(this.world)

    this.root.appendChild(this.viewport)
    this.resetCamera()
    this.bindEvents()
    this.loop()
  }

  freeze() {
    this.frozen = true
    this.frozenX = this.targetX
    this.frozenY = this.targetY
    this.velX = 0
    this.velY = 0
    this.dragging = false
    this.pauseSync = true
    this.syncTiles()
  }

  unfreeze() {
    this.frozen = false
    this.pauseSync = false
  }

  setEnabled(value: boolean) {
    this.enabled = value
    this.viewport.classList.toggle('is-paused', !value)
    if (!value) {
      this.velX = 0
      this.velY = 0
      this.dragging = false
    }
  }

  getThumbBySlug(slug: string): HTMLElement | null {
    for (const pooled of this.active.values()) {
      if (pooled.projectSlug === slug && pooled.el.style.opacity !== '0') {
        return pooled.el
      }
    }
    return null
  }

  private resetCamera() {
    this.camX = 0
    this.camY = 0
    this.targetX = 0
    this.targetY = 0
    this.syncTiles()
  }

  private normalizeCamera() {
    const { width, height } = getGridDimensions()
    const limitX = width * 4
    const limitY = height * 4
    if (Math.abs(this.targetX) > limitX) {
      const shift = Math.sign(this.targetX) * width * 2
      this.targetX -= shift
      this.camX -= shift
      if (this.frozen) this.frozenX -= shift
    }
    if (Math.abs(this.targetY) > limitY) {
      const shift = Math.sign(this.targetY) * height * 2
      this.targetY -= shift
      this.camY -= shift
      if (this.frozen) this.frozenY -= shift
    }
  }

  private cellKey(col: number, row: number) {
    return `${col},${row}`
  }

  private projectAt(col: number, row: number, cols: number, rows: number): Project | null {
    if (this.projects.length === 0) return null
    const wrappedCol = ((col % cols) + cols) % cols
    const wrappedRow = ((row % rows) + rows) % rows
    const idx = projectIndexForCell(wrappedCol, wrappedRow, this.projects.length)
    return this.projects[idx] ?? null
  }

  private acquireTile(): PooledTile {
    let el = this.pool.pop()
    if (!el) {
      el = document.createElement('button')
      el.type = 'button'
      el.className = 'canvas-tile'
      const img = document.createElement('img')
      img.draggable = false
      el.appendChild(img)
      this.world.appendChild(el)
    }
    const img = el.querySelector('img')!
    return {
      el,
      img,
      fileKey: '',
      projectSlug: '',
      lastX: NaN,
      lastY: NaN,
    }
  }

  private releaseTile(key: string) {
    const pooled = this.active.get(key)
    if (!pooled) return
    pooled.el.style.opacity = '0'
    pooled.el.style.pointerEvents = 'none'
    pooled.projectSlug = ''
    this.pool.push(pooled.el)
    this.active.delete(key)
  }

  private bindTile(pooled: PooledTile, project: Project, x: number, y: number) {
    const cover = getCoverImage(project)
    const slug = project.slug

    if (pooled.projectSlug !== slug || pooled.fileKey !== cover.file) {
      setImageSrc(pooled.img, cover.file)
      pooled.fileKey = cover.file
      pooled.projectSlug = slug
      pooled.el.dataset.slug = slug
      pooled.img.alt = cover.alt
      pooled.el.setAttribute('aria-label', `Open ${project.title}`)

      let badge = pooled.el.querySelector<HTMLElement>('.canvas-tile-badge')
      if (project.images.length > 1) {
        if (!badge) {
          badge = document.createElement('span')
          badge.className = 'canvas-tile-badge'
          pooled.el.appendChild(badge)
        }
        badge.textContent = String(project.images.length)
        badge.hidden = false
      } else if (badge) {
        badge.hidden = true
      }
    }

    pooled.el.style.opacity = '1'
    pooled.el.style.pointerEvents = this.enabled ? 'auto' : 'none'

    if (pooled.lastX !== x || pooled.lastY !== y) {
      pooled.el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      pooled.lastX = x
      pooled.lastY = y
    }
  }

  private syncTiles = () => {
    if (this.projects.length === 0) return

    const grid = getGridDimensions()
    const viewW = window.innerWidth
    const viewH = window.innerHeight
    const camX = this.frozen ? this.frozenX : this.camX
    const camY = this.frozen ? this.frozenY : this.camY

    const buf = Math.max(4, Math.ceil(Math.max(viewW, viewH) / TILE_PITCH / 3))
    const startCol = Math.floor(-camX / TILE_PITCH) - buf
    const endCol = Math.ceil((viewW - camX) / TILE_PITCH) + buf
    const startRow = Math.floor(-camY / TILE_PITCH) - buf
    const endRow = Math.ceil((viewH - camY) / TILE_PITCH) + buf

    const needed = new Set<string>()

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const project = this.projectAt(col, row, grid.cols, grid.rows)
        if (!project) continue

        const x = col * TILE_PITCH + camX
        const y = row * TILE_PITCH + camY

        if (
          x > viewW + TILE_SIZE ||
          x < -TILE_SIZE ||
          y > viewH + TILE_SIZE ||
          y < -TILE_SIZE
        ) {
          continue
        }

        const key = this.cellKey(col, row)
        needed.add(key)

        let pooled = this.active.get(key)
        if (!pooled) {
          pooled = this.acquireTile()
          this.active.set(key, pooled)
        }
        this.bindTile(pooled, project, x, y)
      }
    }

    for (const key of [...this.active.keys()]) {
      if (!needed.has(key)) this.releaseTile(key)
    }
  }

  private bindEvents() {
    this.viewport.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    window.addEventListener('resize', () => {
      if (!this.pauseSync) this.syncTiles()
    })
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled || this.frozen) return
    const tile = (e.target as HTMLElement).closest<HTMLElement>('.canvas-tile')

    if (tile) {
      this.tilePointerId = e.pointerId
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY
      this.dragMoved = false
      this.pressTime = performance.now()
      this.pressedTile = tile
      const slug = tile.dataset.slug
      this.pressedProject = this.projects.find((p) => p.slug === slug) ?? null
      return
    }

    this.dragging = true
    this.dragPointerId = e.pointerId
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.dragOriginX = this.targetX
    this.dragOriginY = this.targetY
    this.dragMoved = false
    this.viewport.setPointerCapture(e.pointerId)
    this.viewport.classList.add('is-grabbing')
  }

  private onPointerMove = (e: PointerEvent) => {
    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.hasPointer = true
    if (!this.enabled || this.frozen) return

    if (e.pointerId === this.tilePointerId) {
      if (Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY) > DRAG_THRESHOLD) {
        this.dragMoved = true
      }
      return
    }

    if (!this.dragging || e.pointerId !== this.dragPointerId) return
    const dx = e.clientX - this.dragStartX
    const dy = e.clientY - this.dragStartY
    if (!this.dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD) this.dragMoved = true
    if (this.dragMoved) {
      this.targetX = this.dragOriginX + dx
      this.targetY = this.dragOriginY + dy
      this.velX = dx * 0.35
      this.velY = dy * 0.35
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === this.tilePointerId) {
      if (
        !this.dragMoved &&
        performance.now() - this.pressTime < TAP_MAX_MS &&
        this.pressedTile &&
        this.pressedProject
      ) {
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
      /* released */
    }
  }

  private loop = () => {
    const reduced = prefersReducedMotion()
    const lerpFactor = reduced ? 1 : PAN_LERP

    if (this.enabled && !this.frozen && !this.dragging && !reduced) {
      this.applyDesktopDrift()
      this.targetX += this.velX
      this.targetY += this.velY
      this.velX *= INERTIA_DECAY
      this.velY *= INERTIA_DECAY
      if (Math.abs(this.velX) < 0.08) this.velX = 0
      if (Math.abs(this.velY) < 0.08) this.velY = 0
    }

    if (!this.frozen) {
      this.normalizeCamera()
      this.camX = lerp(this.camX, this.targetX, lerpFactor)
      this.camY = lerp(this.camY, this.targetY, lerpFactor)
    }

    if (!this.pauseSync) this.syncTiles()
    this.rafId = requestAnimationFrame(this.loop)
  }

  private applyDesktopDrift() {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (coarse || !this.hasPointer) return
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    this.targetX += ((this.pointerX - cx) / cx) * DRIFT_STRENGTH * 16
    this.targetY += ((this.pointerY - cy) / cy) * DRIFT_STRENGTH * 16
  }

  destroy() {
    cancelAnimationFrame(this.rafId)
    this.viewport.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
  }
}
