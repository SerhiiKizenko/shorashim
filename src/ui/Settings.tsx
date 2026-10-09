import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toDateString } from '../engine/scheduler'
import { useContent } from '../store/content'
import { BackupSchema, makeBackup, useProgress } from '../store/progress'
import { Button, Card, Screen } from './components'
import { TenseFocus } from './TenseFocus'

export function Settings() {
  const settings = useProgress((s) => s.settings)
  const setSettings = useProgress((s) => s.setSettings)
  const importBackup = useProgress((s) => s.importBackup)
  const resetProgress = useProgress((s) => s.resetProgress)
  const lock = useContent((s) => s.lock)
  const manifest = useContent((s) => s.manifest)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function backup() {
    const data = makeBackup(useProgress.getState())
    const json = JSON.stringify(data, null, 2)
    const name = `shorashim-backup-${toDateString(new Date())}.json`
    const file = new File([json], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Shorashim backup' })
        setMsg('Backup shared.')
        return
      }
    } catch {
      /* user cancelled the share sheet → fall through to download */
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setMsg('Backup file saved.')
  }

  async function restore(f: File | undefined) {
    if (!f) return
    try {
      const parsed = BackupSchema.safeParse(JSON.parse(await f.text()))
      if (!parsed.success) {
        setMsg('This is not a Shorashim backup file.')
        return
      }
      importBackup(parsed.data)
      setMsg(`Restored ${Object.keys(parsed.data.progress).length} items from the backup of ${parsed.data.exportedAt.slice(0, 10)}.`)
    } catch {
      setMsg('Could not read the file.')
    }
  }

  return (
    <Screen title="Settings" back="/">
      <div className="flex flex-col gap-4 pt-2">
        <Card className="flex flex-col gap-3">
          <TenseFocus />
        </Card>
        <Card className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">New items per day</span>
            <input data-testid="settings-new-per-day" type="number" inputMode="numeric" min={0} value={settings.newPerDay} onChange={(e) => setSettings({ newPerDay: Math.max(0, Number(e.target.value) || 0) })} className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base" />
            <span className="text-xs text-ink-muted">Reviews are always added on top. 10 is a steady pace next to a class.</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Theme</span>
            <select value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value as typeof settings.theme })} className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base">
              <option value="auto">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Progress</h2>
          <p className="text-sm text-ink-muted">Progress is stored only on this device. Make a backup once a week.</p>
          <Button variant="secondary" onClick={backup}>Backup</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Restore from file</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
          {confirmReset ? (
            <div className="flex gap-2">
              <Button variant="bad" className="flex-1" onClick={() => { resetProgress(); setConfirmReset(false); setMsg('Progress reset.') }}>Yes, reset</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>Reset progress…</Button>
          )}
          {msg ? <p className="rounded-2xl bg-surface-2 px-4 py-2 text-sm">{msg}</p> : null}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Materials</h2>
          <p className="text-sm text-ink-muted">Build of {manifest ? manifest.builtAt.slice(0, 10) : '—'}.</p>
          <Button variant="ghost" onClick={lock}>Forget the passphrase on this device</Button>
        </Card>

        <Link to="/help" className="block"><Button variant="secondary" className="w-full">How to study</Button></Link>
      </div>
    </Screen>
  )
}
