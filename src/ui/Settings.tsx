import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toDateString } from '../engine/scheduler'
import { useContent } from '../store/content'
import { BackupSchema, makeBackup, useProgress, type Backup } from '../store/progress'
import { Button, Card, Screen } from './components'
import { TenseFocus } from './TenseFocus'

/** A number setting that keeps what is typed while editing (an emptied field does not snap to 0) and stores only
 * valid numbers at or above `min`. */
function NumberSetting({ label, hint, value, min, testId, onValue }: { label: string; hint: string; value: number; min: number; testId: string; onValue: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="flex flex-col gap-1">
      <span className="font-semibold">{label}</span>
      <input
        data-testid={testId}
        type="number"
        inputMode="numeric"
        min={min}
        value={draft ?? String(value)}
        onChange={(e) => {
          const text = e.target.value
          setDraft(text)
          const n = Number(text)
          if (text.trim() !== '' && Number.isFinite(n)) onValue(Math.max(min, Math.floor(n)))
        }}
        onBlur={() => setDraft(null)}
        className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base"
      />
      <span className="text-xs text-ink-muted">{hint}</span>
    </label>
  )
}

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

  return (
    <Screen title="Settings" back="/">
      <div className="flex flex-col gap-4 pt-2">
        <Card className="flex flex-col gap-3">
          <TenseFocus />
        </Card>
        <Card className="flex flex-col gap-3">
          <NumberSetting label="New items per day" testId="settings-new-per-day" min={0} value={settings.newPerDay} onValue={(n) => setSettings({ newPerDay: n })} hint="Counted per calendar day; reviews are always added on top. 10 is a steady pace next to a class." />
          <NumberSetting label="Reviews per day" testId="settings-reviews-per-day" min={1} value={settings.reviewsPerDay} onValue={(n) => setSettings({ reviewsPerDay: n })} hint="When more than this is due (after a break), «Today» catches up: the oldest first, this many a day, no new items until the pile is down." />
          <NumberSetting label="Mixed verb cells after «Today»" testId="settings-mixed-cells" min={0} value={settings.mixedCells} onValue={(n) => setSettings({ mixedCells: n })} hint="Single forms from verbs you already know, mixed across binyanim and tenses. 0 turns them off." />
          <label className="flex flex-col gap-1">
            <span className="font-semibold">I study after…</span>
            <input
              data-testid="settings-anchor"
              type="text"
              maxLength={60}
              value={settings.anchor ?? ''}
              placeholder="morning coffee"
              onChange={(e) => setSettings({ anchor: e.target.value.trim() ? e.target.value : undefined })}
              className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base"
            />
            <span className="text-xs text-ink-muted">Tying practice to something you already do every day is what makes it stick. Home shows it above «Today».</span>
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
