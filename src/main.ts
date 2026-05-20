import './styles/main.css'
import { InfiniteCanvas } from './canvas'
import { DetailView } from './detail'

const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('#app not found')

const stage = document.createElement('main')
stage.className = 'stage'
app.appendChild(stage)

let canvas: InfiniteCanvas

const detail = new DetailView(app, {
  onClose: () => canvas.setEnabled(true),
  getThumbBySlug: (slug) => canvas.getThumbBySlug(slug),
})

canvas = new InfiniteCanvas(stage, {
  onOpenProject: (project, thumbEl, imageIndex) => {
    canvas.setEnabled(false)
    detail.open(project, thumbEl, imageIndex)
  },
})
