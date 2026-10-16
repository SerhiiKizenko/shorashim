import { Keyboard, Save, Smartphone } from 'lucide-react'
import { useProgress } from '../store/progress'
import { Button, Card } from './components'

export function Onboarding() {
  const setSettings = useProgress((s) => s.setSettings)
  return (
    <main className="safe-top safe-bottom safe-x mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5">
      <h1 className="text-2xl font-bold">Before you start</h1>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Smartphone size={20} className="text-sage-strong" /> Install the app
        </div>
        <p className="text-sm text-ink-muted">In Chrome: the ⋮ menu → «Add to Home screen» (or «Install app»). It then opens full-screen, works offline, and keeps the same progress as this Chrome tab.</p>
      </Card>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Keyboard size={20} className="text-sage-strong" /> Hebrew keyboard
        </div>
        <p className="text-sm text-ink-muted">You type the answers in Hebrew — without vowel points. Gboard: Settings → System → Languages & input → On-screen keyboard → Gboard → Languages → add Hebrew; switch with the globe key. Details are in Help.</p>
      </Card>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Save size={20} className="text-sage-strong" /> Weekly backup
        </div>
        <p className="text-sm text-ink-muted">Progress lives only in Chrome on this phone. Settings → «Backup» opens the share sheet: save the file to Drive or Files, or send it to yourself.</p>
      </Card>
      <Button data-testid="onboarding-start" onClick={() => setSettings({ onboarded: true })}>
        Start
      </Button>
    </main>
  )
}
