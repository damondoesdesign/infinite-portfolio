import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const imagesDir = join(root, 'public', 'images', 'placeholders')

const titles = [
  'Pixel Garden', 'Icon Study', 'Grid Walk', 'Mono Lake', 'Tape Label',
  'Boot Screen', 'Finder Tile', 'Trash Can', 'Happy Mac', 'Menu Bar',
  'Control Panel', 'Font Sample', 'Bitmap Edit', 'Spray Can', 'Pencil Tool',
  'Eraser Test', 'Marquee Box', 'Lasso Loop', 'Hand Tool', 'Zoom Lens',
  'Ruler Line', 'Crop Marks', 'Halftone', 'Dither Field', 'Scan Line',
  'Wire Frame', 'Dot Matrix', 'Stamp Set',
]

const seriesSpecs = [
  { count: 3, slug: 'icon-study' },
  { count: 4, slug: 'grid-walk' },
  { count: 5, slug: 'boot-screen' },
  { count: 2, slug: 'menu-bar' },
  { count: 3, slug: 'bitmap-edit' },
  { count: 4, slug: 'wire-frame' },
]

function svgFor(index, label) {
  const patterns = [
    () => `<rect x="24" y="24" width="72" height="72" fill="#000"/>`,
    () => `<circle cx="60" cy="60" r="36" fill="#000"/>`,
    () => `<polygon points="60,20 100,100 20,100" fill="#000"/>`,
    () => `<path d="M20 60 H100 M60 20 V100" stroke="#000" stroke-width="8"/>`,
    () => Array.from({ length: 5 }, (_, i) =>
      `<rect x="${20 + i * 16}" y="40" width="12" height="${40 + (i % 3) * 12}" fill="#000"/>`
    ).join(''),
  ]
  const pat = patterns[index % patterns.length]()
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="#fff"/>
  ${pat}
  <text x="60" y="112" text-anchor="middle" font-family="Chicago, Geneva, monospace" font-size="7" fill="#000">${label}</text>
</svg>`
}

mkdirSync(imagesDir, { recursive: true })
mkdirSync(join(root, 'content'), { recursive: true })

const projects = titles.map((title, i) => {
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  const spec = seriesSpecs.find((s) => s.slug === slug)
  const imageCount = spec?.count ?? 1
  const images = Array.from({ length: imageCount }, (_, j) => {
    const fileName = `${slug}-${String(j + 1).padStart(2, '0')}.svg`
    const filePath = join(imagesDir, fileName)
    if (!existsSync(filePath)) {
      writeFileSync(filePath, svgFor(i + j, `${i + 1}.${j + 1}`))
    }
    return {
      file: `/images/placeholders/${fileName}`,
      alt: `${title} — frame ${j + 1}`,
      caption: `Placeholder for “${title}”. Frame ${j + 1} of ${imageCount}.`,
    }
  })
  return {
    slug,
    title,
    year: 2024 + (i % 3),
    sort: i,
    coverIndex: 0,
    images,
  }
})

const projectsDir = join(root, 'content', 'projects')
const manifest = join(root, 'content', 'projects.json')
const hasContent =
  existsSync(projectsDir) && readdirSync(projectsDir).some((f) => f.endsWith('.json'))

if (!hasContent && !existsSync(manifest)) {
  mkdirSync(projectsDir, { recursive: true })
  for (const project of projects) {
    writeFileSync(
      join(projectsDir, `${project.slug}.json`),
      JSON.stringify(project, null, 2)
    )
  }
  writeFileSync(manifest, JSON.stringify({ projects }, null, 2))
  console.log(`Seeded ${projects.length} placeholder projects.`)
} else {
  console.log('Content already present — skipped project seed (images still ensured).')
}
