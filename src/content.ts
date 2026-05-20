import raw from '../content/projects.json'
import type { Project, ProjectsFile, TileLayout } from './types'

export const GRID_COLS = 7
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

/** Stable pseudo-random project index per grid cell (varies across the plane). */
export function projectIndexForCell(col: number, row: number, count: number): number {
  if (count === 0) return 0
  let h = Math.imul(col, 374761393) ^ Math.imul(row, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h >>> 0) % count
}

export function getWorldSize(projectCount: number) {
  const rows = Math.max(4, Math.ceil(projectCount / GRID_COLS))
  return {
    width: GRID_COLS * TILE_PITCH,
    height: rows * TILE_PITCH,
    rows,
    cols: GRID_COLS,
  }
}

/** @deprecated Used only if needed for legacy helpers */
export function buildTileLayouts(projects: Project[]): TileLayout[] {
  return projects.map((project, index) => {
    const col = index % GRID_COLS
    const row = Math.floor(index / GRID_COLS)
    return {
      index,
      project,
      col,
      row,
      baseX: col * TILE_PITCH + TILE_GAP,
      baseY: row * TILE_PITCH + TILE_GAP,
    }
  })
}
