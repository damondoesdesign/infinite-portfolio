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
  freezeCanvas: () => {
    canvas.setEnabled(false)
    canvas.freeze()
  },
  unfreezeCanvas: () => {
    canvas.unfreeze()
  },
})

canvas = new InfiniteCanvas(stage, {
  onOpenProject: (project, thumbEl, imageIndex) => {
    detail.open(project, thumbEl, imageIndex)
  },
})
