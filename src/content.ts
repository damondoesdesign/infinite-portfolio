import raw from '../content/projects.json'
import type { Project, ProjectsFile, TileLayout } from './types'

export const TILE_SIZE = 240
export const TILE_GAP = 56
export const TILE_PITCH = TILE_SIZE + TILE_GAP

const data = raw as ProjectsFile

export function getProjects(): Project[] {
  return [...data.projects].sort((a, b) => a.sort - b.sort)
}

export function getCoverImage(project: Project) {
  const idx = project.coverIndex ?? 0
  return project.images[idx] ?? project.images[0]
}

export function projectIndexForCell(col: number, row: number, count: number): number {
  if (count === 0) return 0
  let h = Math.imul(col, 374761393) ^ Math.imul(row, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h >>> 0) % count
}

/** Grid large enough to cover the viewport (Studio Display and smaller). */
export function getGridDimensions(viewW = window.innerWidth, viewH = window.innerHeight) {
  const cols = Math.max(10, Math.ceil(viewW / TILE_PITCH) + 8)
  const rows = Math.max(8, Math.ceil(viewH / TILE_PITCH) + 8)
  return {
    cols,
    rows,
    width: cols * TILE_PITCH,
    height: rows * TILE_PITCH,
  }
}

export function buildTileLayouts(projects: Project[]): TileLayout[] {
  const { cols } = getGridDimensions()
  return projects.map((project, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    return {
      index,
      project,
      col,
      row,
      baseX: col * TILE_PITCH,
      baseY: row * TILE_PITCH,
    }
  })
}
