import { CalendarDays, Share, Save } from 'lucide-react'
import { useState } from 'react'
import { addDays, toDateString } from '../engine/scheduler'
import { useProgress } from '../store/progress'
import { Button, Card } from './components'

export function Onboarding() {
  const setSettings = useProgress((s) => s.setSettings)
  const existing = useProgress((s) => s.settings.examDate)
  const [date, setDate] = useState(existing ?? addDays(toDateString(new Date()), 14))

  return (
    <main className="safe-top safe-bottom safe-x mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5">
      <h1 className="text-2xl font-bold">Перед началом</h1>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <CalendarDays size={20} className="text-sage-strong" /> Дата экзамена
        </div>
        <p className="text-sm text-ink-muted">От неё считается, сколько новых карточек показывать в день.</p>
        <input data-testid="onboarding-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-12 rounded-2xl border border-surface-2 bg-bg px-4 text-base" />
      </Card>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Share size={20} className="text-sage-strong" /> Добавьте на экран «Домой»
        </div>
        <p className="text-sm text-ink-muted">В Safari: кнопка «Поделиться» → «На экран „Домой“». Тогда приложение работает без сети, а iOS не удалит прогресс через неделю.</p>
      </Card>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Save size={20} className="text-sage-strong" /> Резервная копия раз в неделю
        </div>
        <p className="text-sm text-ink-muted">В настройках — «Резервная копия». Файл можно сохранить в «Файлы» или отправить себе.</p>
      </Card>
      <Button data-testid="onboarding-start" disabled={!date} onClick={() => setSettings({ examDate: date, onboarded: true })}>
        Начать
      </Button>
    </main>
  )
}
