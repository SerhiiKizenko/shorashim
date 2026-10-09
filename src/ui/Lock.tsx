import { Lock as LockIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useContent } from '../store/content'
import { Button } from './components'

export function Lock() {
  const { status, error, unlock } = useContent()
  const [passphrase, setPassphrase] = useState('')
  const [remember, setRemember] = useState(true)
  const busy = status === 'unlocking' || status === 'checking'

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!passphrase.trim() || busy) return
    const ok = await unlock(passphrase, remember)
    if (ok) setPassphrase('')
  }

  return (
    <main className="safe-top safe-bottom safe-x mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sage text-on-accent">
          <LockIcon size={28} />
        </div>
        <h1 className="text-3xl font-bold">Мышечная память</h1>
        <p className="text-ink-muted">Тренажёр к экзамену. Введите пароль, чтобы открыть материалы.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          data-testid="lock-passphrase"
          type="password"
          autoComplete="current-password"
          placeholder="Пароль"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="min-h-12 rounded-2xl border border-surface-2 bg-surface px-4 text-base outline-none focus:border-sage-strong"
        />
        <label className="flex min-h-11 items-center gap-3 text-ink-muted">
          <input data-testid="lock-remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 accent-[var(--c-sage-strong)]" />
          Запомнить на этом устройстве
        </label>
        {error ? (
          <p data-testid="lock-error" className="rounded-2xl bg-bad/20 px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}
        <Button data-testid="lock-submit" type="submit" disabled={busy || !passphrase.trim()}>
          {busy ? 'Расшифровываю…' : 'Открыть'}
        </Button>
      </form>
    </main>
  )
}
