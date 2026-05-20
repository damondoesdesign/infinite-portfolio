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
const MAX_CAROUSEL = 5

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

function slugFromFilename(filename) {
  const base = basename(filename, extname(filename))
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readMetaFile(dir, name) {
  const path = join(dir, name)
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf8').trim()
}

/** Read info.json beside images (folder) or as {slug}.info.json (loose file). */
function readInfoJson(dir, slug) {
  const candidates = [
    join(dir, 'info.json'),
    join(DROP_DIR, `${slug}.info.json`),
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      return JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      console.warn(`Invalid JSON in ${path}`)
    }
  }
  return null
}

function captionForFile(info, filename) {
  const key = basename(filename)
  const fromInfo = info?.captions?.[key] ?? info?.captions?.[filename]
  if (fromInfo) return fromInfo
  if (info?.caption && !info.captions) return info.caption
  return ''
}

function isImageFile(name) {
  return IMAGE_EXT.has(extname(name).toLowerCase())
}

function isMetaFile(name) {
  return name.startsWith('_') && name.endsWith('.txt')
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
    copyFileSync(join(PLACEHOLDER_DIR, file), join(destDir, `${num}.${ext}`))
  }
  console.log('Seeded drop/ from placeholder demos.')
}

function dropHasContent() {
  if (!existsSync(DROP_DIR)) return false
  return readdirSync(DROP_DIR, { withFileTypes: true }).some((entry) => {
    if (entry.name.startsWith('.')) return false
    if (entry.isDirectory()) return true
    return isImageFile(entry.name) && !isMetaFile(entry.name)
  })
}

function seedDropIfEmpty() {
  mkdirSync(DROP_DIR, { recursive: true })
  if (dropHasContent()) return
  seedDropFromPlaceholders()
}

function listImageFiles(dir) {
  return readdirSync(dir)
    .filter((f) => isImageFile(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function writeProject(project) {
  mkdirSync(CONTENT_DIR, { recursive: true })
  writeFileSync(
    join(CONTENT_DIR, `${project.slug}.json`),
    JSON.stringify(project, null, 2) + '\n'
  )
}

function clearDestDir(destDir) {
  mkdirSync(destDir, { recursive: true })
  for (const f of readdirSync(destDir)) {
    rmSync(join(destDir, f), { force: true })
  }
}

function buildImages(slug, title, srcDir, files, info) {
  const destDir = join(OUT_IMG_DIR, slug)
  clearDestDir(destDir)

  return files.map((file, i) => {
    copyFileSync(join(srcDir, file), join(destDir, file))
    const label = basename(file, extname(file))
      .replace(/[-_]/g, ' ')
      .trim()
    const cap = captionForFile(info, file)
    return {
      file: `/images/projects/${slug}/${file}`,
      alt: info?.alts?.[file] ?? `${title} — ${label || `image ${i + 1}`}`,
      caption: cap,
    }
  })
}

/** Folder in drop/ → carousel (2–5 images). */
function syncCollectionFolder(slug, sortIndex) {
  const srcDir = join(DROP_DIR, slug)
  const files = listImageFiles(srcDir)

  if (files.length === 0) {
    console.warn(`Skipping folder "${slug}/" — no images inside.`)
    return null
  }

  if (files.length === 1) {
    console.log(` "${slug}/" has 1 image — single piece (not a carousel).`)
  } else if (files.length > MAX_CAROUSEL) {
    console.warn(
      ` "${slug}/" has ${files.length} images; using first ${MAX_CAROUSEL} for carousel.`
    )
  }

  const used = files.slice(0, MAX_CAROUSEL)
  const info = readInfoJson(srcDir, slug)
  const title =
    info?.title ?? readMetaFile(srcDir, META_TITLE) ?? humanize(slug)
  const yearRaw = info?.year ?? readMetaFile(srcDir, META_YEAR)
  const year = yearRaw ? Number(yearRaw) : new Date().getFullYear()
  const sortRaw = info?.sort ?? readMetaFile(srcDir, META_SORT)
  const sort = sortRaw ? Number(sortRaw) : sortIndex * 10

  const project = {
    slug,
    title,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    sort,
    coverIndex: 0,
    images: buildImages(slug, title, srcDir, used, info),
  }

  writeProject(project)
  return slug
}

/** Loose image in drop/ → single canvas tile. */
function syncLooseImage(filename, sortIndex) {
  const slug = slugFromFilename(filename)
  if (!slug) {
    console.warn(`Skipping "${filename}" — could not derive a project name.`)
    return null
  }

  const folderPath = join(DROP_DIR, slug)
  if (existsSync(folderPath) && statSync(folderPath).isDirectory()) {
    console.warn(
      `Skipping loose file "${filename}" — folder "${slug}/" already defines this piece.`
    )
    return null
  }

  const srcDir = DROP_DIR
  const destDir = join(OUT_IMG_DIR, slug)
  clearDestDir(destDir)
  copyFileSync(join(srcDir, filename), join(destDir, filename))

  const info = readInfoJson(DROP_DIR, slug)
  const title = info?.title ?? humanize(slug)
  const label = basename(filename, extname(filename))
    .replace(/[-_]/g, ' ')
    .trim()
  const year = info?.year ? Number(info.year) : new Date().getFullYear()

  const project = {
    slug,
    title,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    sort: info?.sort ?? sortIndex * 10,
    coverIndex: 0,
    images: [
      {
        file: `/images/projects/${slug}/${filename}`,
        alt: info?.alt ?? `${title}`,
        caption: captionForFile(info, filename),
      },
    ],
  }

  writeProject(project)
  return slug
}

function scanDropEntries() {
  const entries = readdirSync(DROP_DIR, { withFileTypes: true }).filter(
    (e) => !e.name.startsWith('.') && e.name !== 'README.txt'
  )

  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ type: 'folder', name: e.name }))

  const loose = entries
    .filter((e) => e.isFile() && isImageFile(e.name) && !isMetaFile(e.name))
    .map((e) => ({ type: 'file', name: e.name }))

  const combined = [...folders, ...loose].sort((a, b) => {
    const slugA = a.type === 'folder' ? a.name : slugFromFilename(a.name)
    const slugB = b.type === 'folder' ? b.name : slugFromFilename(b.name)
    return slugA.localeCompare(slugB, undefined, { numeric: true })
  })

  return combined
}

function removeOrphanContent(validSlugs) {
  if (!existsSync(CONTENT_DIR)) return
  const valid = new Set(validSlugs)
  for (const file of readdirSync(CONTENT_DIR)) {
    if (!file.endsWith('.json')) continue
    const slug = file.replace(/\.json$/, '')
    if (!valid.has(slug)) {
      rmSync(join(CONTENT_DIR, file))
      console.log(`Removed content for deleted item: ${slug}`)
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
      console.log(`Removed images for deleted item: ${dir.name}`)
    }
  }
}

export function syncGallery() {
  seedDropIfEmpty()
  mkdirSync(DROP_DIR, { recursive: true })

  const slugs = []
  const entries = scanDropEntries()

  entries.forEach((entry, index) => {
    const result =
      entry.type === 'folder'
        ? syncCollectionFolder(entry.name, index)
        : syncLooseImage(entry.name, index)
    if (result) slugs.push(result)
  })

  removeOrphanContent(slugs)
  removeOrphanProjectImages(slugs)

  const folders = entries.filter((e) => e.type === 'folder').length
  const loose = entries.filter((e) => e.type === 'file').length
  console.log(
    `Synced ${slugs.length} piece(s) from drop/ (${loose} single image(s), ${folders} folder collection(s)).`
  )
  return slugs.length
}

syncGallery()
