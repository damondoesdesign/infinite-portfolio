import raw from '../content/projects.json'
import type { Project, ProjectsFile, TileLayout } from './types'

export const GRID_COLS = 7
export const TILE_SIZE = 200
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

export function getWorldSize(tileCount: number) {
  const rows = Math.ceil(tileCount / GRID_COLS)
  return {
    width: GRID_COLS * TILE_PITCH + TILE_GAP,
    height: rows * TILE_PITCH + TILE_GAP,
    rows,
  }
}
