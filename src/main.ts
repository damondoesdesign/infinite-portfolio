import './styles/main.css'
import { InfiniteCanvas } from './canvas'
import { DetailView } from './detail'
import type { Project } from './types'

const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('#app not found')

app.innerHTML = `
  <header class="site-header" aria-hidden="true">
    <span class="site-mark" aria-hidden="true">◆</span>
  </header>
`

const stage = document.createElement('main')
stage.className = 'stage'
app.appendChild(stage)

let canvas: InfiniteCanvas

const detail = new DetailView(app, {
  onClose: () => canvas.setEnabled(true),
})

canvas = new InfiniteCanvas(stage, {
  onOpenProject: (project: Project, thumbEl: HTMLElement, imageIndex: number) => {
    canvas.setEnabled(false)
    detail.open(project, thumbEl, imageIndex)
  },
})
