import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/nunito'
import '@fontsource-variable/noto-sans-hebrew'
import './index.css'
import { App } from './App'
import { registerSW } from 'virtual:pwa-register'

// A new build activates as soon as the service worker finds it (autoUpdate) and the page must reload to run it.
// Reloading in the middle of a drill would throw away the card or grid in progress, so the reload waits until
// the learner leaves the study screen; everywhere else it happens at once.
const inStudy = () => location.hash.startsWith('#/study')
let reloadPending = false
registerSW({
  immediate: true,
  onNeedReload() {
    if (inStudy()) reloadPending = true
    else location.reload()
  },
})
window.addEventListener('hashchange', () => {
  if (reloadPending && !inStudy()) location.reload()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
