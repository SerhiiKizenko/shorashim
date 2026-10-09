import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useContent } from './store/content'
import { useProgress } from './store/progress'
import { Help } from './ui/Help'
import { Home } from './ui/Home'
import { Lock } from './ui/Lock'
import { Onboarding } from './ui/Onboarding'
import { Settings } from './ui/Settings'
import { Study } from './ui/Study'
import { Topics } from './ui/Topics'
import { Weak } from './ui/Weak'

/** A new mode or topic must start a new session, so the study screen is remounted per URL. */
function StudyRoute() {
  const loc = useLocation()
  return <Study key={loc.pathname + loc.search} />
}

function Gate() {
  const status = useContent((s) => s.status)
  const init = useContent((s) => s.init)
  const onboarded = useProgress((s) => s.settings.onboarded)
  useEffect(() => {
    if (status === 'idle') void init()
  }, [status, init])

  if (status === 'idle' || status === 'checking')
    return (
      <main className="flex min-h-dvh items-center justify-center text-ink-muted" data-testid="splash">
        Открываю материалы…
      </main>
    )
  if (status !== 'ready') return <Lock />
  if (!onboarded) return <Onboarding />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/study/:mode" element={<StudyRoute />} />
      <Route path="/topics" element={<Topics />} />
      <Route path="/weak" element={<Weak />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/help" element={<Help />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  const theme = useProgress((s) => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])
  return (
    <HashRouter>
      <Gate />
    </HashRouter>
  )
}
