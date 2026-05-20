export interface ProjectImage {
  file: string
  alt: string
  caption: string
}

export interface Project {
  slug: string
  title: string
  year: number
  sort: number
  coverIndex?: number
  images: ProjectImage[]
}

export interface ProjectsFile {
  projects: Project[]
}

export interface TileLayout {
  index: number
  project: Project
  col: number
  row: number
  baseX: number
  baseY: number
}
