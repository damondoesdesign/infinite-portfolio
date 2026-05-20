import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const projectsDir = join(root, 'content', 'projects')
const outFile = join(root, 'content', 'projects.json')

const legacy = join(root, 'content', 'projects.json')
let projects = []

if (existsSync(projectsDir)) {
  const files = readdirSync(projectsDir).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(projectsDir, file), 'utf8'))
    projects.push(raw)
  }
}

if (projects.length === 0 && existsSync(legacy)) {
  const raw = JSON.parse(readFileSync(legacy, 'utf8'))
  projects = raw.projects ?? []
}

projects.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
writeFileSync(outFile, JSON.stringify({ projects }, null, 2))
console.log(`Merged ${projects.length} projects → content/projects.json`)
