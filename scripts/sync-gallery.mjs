import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, dirname, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const DROP_DIR = join(root, 'public', 'images', 'drop')
const OUT_IMG_DIR = join(root, 'public', 'images', 'projects')
const CONTENT_DIR = join(root, 'content', 'projects')
const PLACEHOLDER_DIR = join(root, 'public', 'images', 'placeholders')
const META_TITLE = '_title.txt'
const META_YEAR = '_year.txt'
const META_SORT = '_sort.txt'

const IMAGE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.avif',
])

function humanize(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function readMetaFile(dir, name) {
  const path = join(dir, name)
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf8').trim()
}

function isImageFile(name) {
  return IMAGE_EXT.has(extname(name).toLowerCase())
}

function seedDropFromPlaceholders() {
  if (!existsSync(PLACEHOLDER_DIR)) return
  const entries = readdirSync(PLACEHOLDER_DIR).filter(isImageFile)
  if (entries.length === 0) return

  for (const file of entries) {
    const match = file.match(/^(.+)-(\d{2})\.(\w+)$/i)
    if (!match) continue
    const [, slug, num, ext] = match
    const destDir = join(DROP_DIR, slug)
    mkdirSync(destDir, { recursive: true })
    const destName = `${num}.${ext}`
    copyFileSync(join(PLACEHOLDER_DIR, file), join(destDir, destName))
  }
  console.log('Seeded drop/ from placeholder demos.')
}

function seedDropIfEmpty() {
  mkdirSync(DROP_DIR, { recursive: true })
  const existing = readdirSync(DROP_DIR, { withFileTypes: true }).filter(
    (d) => d.isDirectory() && !d.name.startsWith('.')
  )
  if (existing.length > 0) return
  seedDropFromPlaceholders()
}

function listImageFiles(dir) {
  return readdirSync(dir)
    .filter((f) => isImageFile(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function syncProjectFolder(slug, sortIndex) {
  const srcDir = join(DROP_DIR, slug)
  const destDir = join(OUT_IMG_DIR, slug)
  const files = listImageFiles(srcDir)

  if (files.length === 0) {
    console.warn(`Skipping "${slug}" — no images in folder.`)
    return null
  }

  if (files.length > 5) {
    console.warn(
      ` "${slug}" has ${files.length} images; using first 5 (carousel max).`
    )
  }

  const used = files.slice(0, 5)
  mkdirSync(destDir, { recursive: true })

  // Clear old outputs so renames/removals stay in sync
  if (existsSync(destDir)) {
    for (const f of readdirSync(destDir)) {
      rmSync(join(destDir, f), { force: true })
    }
  }
  mkdirSync(destDir, { recursive: true })

  const title = readMetaFile(srcDir, META_TITLE) || humanize(slug)
  const yearRaw = readMetaFile(srcDir, META_YEAR)
  const year = yearRaw ? Number(yearRaw) : new Date().getFullYear()
  const sortRaw = readMetaFile(srcDir, META_SORT)
  const sort = sortRaw ? Number(sortRaw) : sortIndex * 10

  const images = used.map((file, i) => {
    copyFileSync(join(srcDir, file), join(destDir, file))
    const label = basename(file, extname(file))
      .replace(/[-_]/g, ' ')
      .trim()
    return {
      file: `/images/projects/${slug}/${file}`,
      alt: `${title} — ${label || `image ${i + 1}`}`,
      caption: `${title}. ${label ? label.replace(/\b\w/g, (c) => c.toUpperCase()) : `Image ${i + 1}`}.`,
    }
  })

  const project = {
    slug,
    title,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    sort,
    coverIndex: 0,
    images,
  }

  mkdirSync(CONTENT_DIR, { recursive: true })
  writeFileSync(
    join(CONTENT_DIR, `${slug}.json`),
    JSON.stringify(project, null, 2) + '\n'
  )

  return slug
}

function removeOrphanContent(validSlugs) {
  if (!existsSync(CONTENT_DIR)) return
  const valid = new Set(validSlugs)
  for (const file of readdirSync(CONTENT_DIR)) {
    if (!file.endsWith('.json')) continue
    const slug = file.replace(/\.json$/, '')
    if (!valid.has(slug)) {
      rmSync(join(CONTENT_DIR, file))
      console.log(`Removed content for deleted folder: ${slug}`)
    }
  }
}

function removeOrphanProjectImages(validSlugs) {
  if (!existsSync(OUT_IMG_DIR)) return
  const valid = new Set(validSlugs)
  for (const dir of readdirSync(OUT_IMG_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    if (!valid.has(dir.name)) {
      rmSync(join(OUT_IMG_DIR, dir.name), { recursive: true, force: true })
      console.log(`Removed images for deleted folder: ${dir.name}`)
    }
  }
}

export function syncGallery() {
  seedDropIfEmpty()
  mkdirSync(DROP_DIR, { recursive: true })

  const folders = readdirSync(DROP_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const slugs = []
  folders.forEach((slug, index) => {
    const result = syncProjectFolder(slug, index)
    if (result) slugs.push(result)
  })

  removeOrphanContent(slugs)
  removeOrphanProjectImages(slugs)

  console.log(`Synced ${slugs.length} project(s) from public/images/drop/`)
  return slugs.length
}

syncGallery()
