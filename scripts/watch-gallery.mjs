import { spawn } from 'node:child_process'
import { watch } from 'chokidar'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const DROP_DIR = join(root, 'public', 'images', 'drop')

let timer = null
let running = false

function publish() {
  if (running) return
  running = true
  console.log('\n[watch] Changes detected — publishing...\n')
  const child = spawn('bash', ['scripts/publish-gallery.sh'], {
    cwd: root,
    stdio: 'inherit',
  })
  child.on('close', (code) => {
    running = false
    if (code === 0) console.log('[watch] Done. Drop more images anytime.\n')
    else console.log(`[watch] Publish exited with code ${code}\n`)
  })
}

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(publish, 2500)
}

console.log('Watching for new images in:')
console.log(`  ${DROP_DIR}`)
console.log('Add a folder per project. Auto-publish runs ~2.5s after you stop adding files.')
console.log('Press Ctrl+C to stop.\n')

watch(DROP_DIR, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 },
}).on('all', schedule)
