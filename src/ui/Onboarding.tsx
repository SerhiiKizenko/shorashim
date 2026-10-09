import { Keyboard, Save, Share } from 'lucide-react'
import { useProgress } from '../store/progress'
import { Button, Card } from './components'

export function Onboarding() {
  const setSettings = useProgress((s) => s.setSettings)
  return (
    <main className="safe-top safe-bottom safe-x mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5">
      <h1 className="text-2xl font-bold">Before you start</h1>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Share size={20} className="text-sage-strong" /> Add to the Home Screen
        </div>
        <p className="text-sm text-ink-muted">In Safari: Share → «Add to Home Screen». The app then works offline, and iOS keeps your progress.</p>
      </Card>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Keyboard size={20} className="text-sage-strong" /> Hebrew keyboard
        </div>
        <p className="text-sm text-ink-muted">You type the answers in Hebrew — without vowel points. iPhone: Settings → General → Keyboard → Keyboards → Add New Keyboard → Hebrew. Mac: System Settings → Keyboard → Input Sources. Details are in Help.</p>
      </Card>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Save size={20} className="text-sage-strong" /> Weekly backup
        </div>
        <p className="text-sm text-ink-muted">Progress lives only on this device. Settings → «Backup» saves it as a file you can keep in Files or send to yourself.</p>
      </Card>
      <Button data-testid="onboarding-start" onClick={() => setSettings({ onboarded: true })}>
        Start
      </Button>
    </main>
  )
}
