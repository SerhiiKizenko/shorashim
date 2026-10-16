import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toDateString } from '../engine/scheduler'
import { useContent } from '../store/content'
import { BackupSchema, makeBackup, useProgress, type Backup } from '../store/progress'
import { Button, Card, Screen } from './components'
import { TenseFocus } from './TenseFocus'

export function Settings() {
  const settings = useProgress((s) => s.settings)
  const setSettings = useProgress((s) => s.setSettings)
  const importBackup = useProgress((s) => s.importBackup)
  const resetProgress = useProgress((s) => s.resetProgress)
  const deviceItems = useProgress((s) => Object.keys(s.progress).length)
  const lock = useContent((s) => s.lock)
  const manifest = useContent((s) => s.manifest)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  /** a backup file read and validated, waiting for the learner to confirm the replacement */
  const [pending, setPending] = useState<Backup | null>(null)
  /** what is typed in «New items per day» while editing; null = show the stored value */
  const [newPerDayDraft, setNewPerDayDraft] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function backup() {
    const data = makeBackup(useProgress.getState())
    const json = JSON.stringify(data, null, 2)
    const name = `shorashim-backup-${toDateString(new Date())}.json`
    const file = new File([json], name, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Shorashim backup' })
        setMsg('Backup shared.')
        return
      } catch (e) {
        // The share sheet was dismissed: nothing was saved, and no download sneaks in behind it.
        if (e instanceof DOMException && e.name === 'AbortError') {
          setMsg('Backup cancelled — nothing was saved.')
          return
        }
        /* any other share failure → fall through to the download */
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setMsg('Backup file saved to Downloads.')
  }

  async function readBackup(f: File | undefined) {
    // Clear the picker so choosing the same file again fires onChange (a file input only reports changes).
    if (fileRef.current) fileRef.current.value = ''
    if (!f) return
    setPending(null)
    try {
      const parsed = BackupSchema.safeParse(JSON.parse(await f.text()))
      if (!parsed.success) {
        setMsg('This is not a Shorashim backup file.')
        return
      }
      setMsg(null)
      setPending(parsed.data)
    } catch {
      setMsg('Could not read the file.')
    }
  }

  function confirmRestore() {
    if (!pending) return
    importBackup(pending)
    setMsg(`Restored ${Object.keys(pending.progress).length} items from the backup of ${pending.exportedAt.slice(0, 10)}.`)
    setPending(null)
  }

  function changeNewPerDay(text: string) {
    setNewPerDayDraft(text)
    const n = Number(text)
    if (text.trim() !== '' && Number.isFinite(n)) setSettings({ newPerDay: Math.max(0, Math.floor(n)) })
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
            <input
              data-testid="settings-new-per-day"
              type="number"
              inputMode="numeric"
              min={0}
              value={newPerDayDraft ?? String(settings.newPerDay)}
              onChange={(e) => changeNewPerDay(e.target.value)}
              onBlur={() => setNewPerDayDraft(null)}
              className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base"
            />
            <span className="text-xs text-ink-muted">Counted per calendar day; reviews are always added on top. 10 is a steady pace next to a class.</span>
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
          <p className="text-sm text-ink-muted">Progress lives in Chrome on this phone. Make a backup once a week: it opens the share sheet — save the file to Drive or Files.</p>
          <Button data-testid="settings-backup" variant="secondary" onClick={backup}>Backup</Button>
          <Button data-testid="settings-restore" variant="secondary" onClick={() => fileRef.current?.click()}>Restore from file</Button>
          <input ref={fileRef} data-testid="settings-restore-input" type="file" accept="application/json,.json" className="hidden" onChange={(e) => readBackup(e.target.files?.[0])} />
          {pending ? (
            <Card data-testid="settings-restore-confirm" className="flex flex-col gap-3 bg-surface-2">
              <p className="text-sm">
                Backup of {pending.exportedAt.slice(0, 10)}: {Object.keys(pending.progress).length} items, {pending.stats.totalReviews} reviews. This device has {deviceItems} items. Replace what is on this device?
              </p>
              <div className="flex gap-2">
                <Button data-testid="settings-restore-yes" className="flex-1" onClick={confirmRestore}>Replace</Button>
                <Button data-testid="settings-restore-no" variant="secondary" className="flex-1" onClick={() => setPending(null)}>Cancel</Button>
              </div>
            </Card>
          ) : null}
          {confirmReset ? (
            <div className="flex gap-2">
              <Button data-testid="settings-reset-yes" variant="bad" className="flex-1" onClick={() => { resetProgress(); setConfirmReset(false); setMsg('Progress reset.') }}>Yes, reset</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          ) : (
            <Button data-testid="settings-reset" variant="ghost" onClick={() => setConfirmReset(true)}>Reset progress…</Button>
          )}
          {msg ? <p data-testid="settings-msg" className="rounded-2xl bg-surface-2 px-4 py-2 text-sm">{msg}</p> : null}
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
