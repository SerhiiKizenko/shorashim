import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toDateString } from '../engine/scheduler'
import { useContent } from '../store/content'
import { BackupSchema, makeBackup, useProgress } from '../store/progress'
import { Button, Card, Screen } from './components'

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
    const name = `muscle-memory-backup-${toDateString(new Date())}.json`
    const file = new File([json], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Резервная копия' })
        setMsg('Резервная копия отправлена.')
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
    setMsg('Файл резервной копии сохранён.')
  }

  async function restore(f: File | undefined) {
    if (!f) return
    try {
      const parsed = BackupSchema.safeParse(JSON.parse(await f.text()))
      if (!parsed.success) {
        setMsg('Это не файл резервной копии «Мышечной памяти».')
        return
      }
      importBackup(parsed.data)
      setMsg(`Восстановлено: ${Object.keys(parsed.data.progress).length} карточек, копия от ${parsed.data.exportedAt.slice(0, 10)}.`)
    } catch {
      setMsg('Не удалось прочитать файл.')
    }
  }

  return (
    <Screen title="Настройки" back="/">
      <div className="flex flex-col gap-4 pt-2">
        <Card className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Дата экзамена</span>
            <input type="date" value={settings.examDate ?? ''} onChange={(e) => setSettings({ examDate: e.target.value || null })} className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Новых карточек в день</span>
            <input type="number" inputMode="numeric" min={1} placeholder="авто" value={settings.newPerDay ?? ''} onChange={(e) => setSettings({ newPerDay: e.target.value ? Math.max(1, Number(e.target.value)) : null })} className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base" />
            <span className="text-xs text-ink-muted">Пусто — считается автоматически от даты экзамена.</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Тема</span>
            <select value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value as typeof settings.theme })} className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base">
              <option value="auto">Как в системе</option>
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
            </select>
          </label>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Прогресс</h2>
          <p className="text-sm text-ink-muted">Прогресс хранится только на этом устройстве. Делайте копию раз в неделю.</p>
          <Button variant="secondary" onClick={backup}>Резервная копия</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Восстановить из файла</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
          {confirmReset ? (
            <div className="flex gap-2">
              <Button variant="bad" className="flex-1" onClick={() => { resetProgress(); setConfirmReset(false); setMsg('Прогресс сброшен.') }}>Да, сбросить</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>Отмена</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>Сбросить прогресс…</Button>
          )}
          {msg ? <p className="rounded-2xl bg-surface-2 px-4 py-2 text-sm">{msg}</p> : null}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Материалы</h2>
          <p className="text-sm text-ink-muted">Сборка от {manifest ? manifest.builtAt.slice(0, 10) : '—'}.</p>
          <Button variant="ghost" onClick={lock}>Забыть пароль на этом устройстве</Button>
        </Card>

        <Link to="/help" className="block"><Button variant="secondary" className="w-full">Как заниматься</Button></Link>
      </div>
    </Screen>
  )
}
