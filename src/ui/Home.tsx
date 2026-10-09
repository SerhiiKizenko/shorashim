import { AlertTriangle, ChevronRight, Flame, Layers, RotateCcw, Settings as SettingsIcon, Shuffle, Sun } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buildTodayQueue, daysBetween, isDue, newCardQuota, toDateString } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Card, plural, ProgressRing, Screen } from './components'

function ModeTile({ to, icon, title, hint }: { to: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <Link to={to} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-surface-2 px-3 py-3 text-center active:opacity-80">
      <span className="text-sage-strong">{icon}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-ink-muted">{hint}</span>
    </Link>
  )
}

export function Home() {
  const cards = useContent((s) => s.cards)
  const manifest = useContent((s) => s.manifest)
  const progress = useProgress((s) => s.progress)
  const settings = useProgress((s) => s.settings)
  const stats = useProgress((s) => s.stats)
  const today = toDateString(new Date())
  const daysToExam = settings.examDate ? daysBetween(today, settings.examDate) : null

  const { due, fresh, seen, learned, todayCount } = useMemo(() => {
    const sched = cards.map((c) => ({ id: c.id, block: c.block, cluster: c.cluster, examNumber: c.examNumber }))
    const due = sched.filter((c) => progress[c.id] && isDue(progress[c.id]!, today)).length
    const unseen = sched.filter((c) => !progress[c.id]).length
    const fresh = Math.min(unseen, settings.newPerDay ?? newCardQuota(unseen, daysToExam ?? 14))
    const seen = sched.length - unseen
    const learned = sched.filter((c) => progress[c.id]?.box === 5).length
    const todayCount = buildTodayQueue({ cards: sched, progress, today, daysToExam: daysToExam ?? 14, newLimit: settings.newPerDay ?? undefined }).length
    return { due, fresh, seen, learned, todayCount }
  }, [cards, progress, today, daysToExam, settings.newPerDay])

  const checked = manifest ? Object.values(manifest.counts).reduce((n, c) => n + c.checked, 0) : 0

  return (
    <Screen
      title="Мышечная память"
      right={
        <Link to="/settings" aria-label="Настройки" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted active:bg-surface-2">
          <SettingsIcon />
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <Card className="flex items-center gap-4">
          <ProgressRing value={cards.length ? seen / cards.length : 0} label={`${seen}`} sub={`из ${cards.length}`} />
          <div className="flex flex-1 flex-col gap-1">
            <div data-testid="home-days" className="text-lg font-bold">
              {daysToExam === null ? 'Дата экзамена не задана' : daysToExam > 0 ? `Экзамен через ${daysToExam} ${plural(daysToExam, 'день', 'дня', 'дней')}` : daysToExam === 0 ? 'Экзамен сегодня' : 'Экзамен прошёл'}
            </div>
            <div className="flex items-center gap-1 text-sm text-ink-muted">
              <Flame size={16} className={stats.streak ? 'text-warn' : ''} /> {stats.streak} {plural(stats.streak, 'день', 'дня', 'дней')} подряд
            </div>
            <div className="text-sm text-ink-muted">Усвоено: {learned}</div>
          </div>
        </Card>

        <Link to="/study/today" data-testid="home-today" className="block">
          <Card className="flex items-center gap-4 bg-sage-strong text-on-accent">
            <Sun size={28} />
            <div className="flex-1">
              <div className="text-lg font-bold">Сегодня — план на день</div>
              <div className="text-sm opacity-90">
                {todayCount === 0 ? 'На сегодня всё сделано' : `${due} на повтор · ${fresh} ${plural(fresh, 'новая', 'новые', 'новых')}`}
              </div>
            </div>
            <span className="flex items-center gap-1 text-base font-semibold">Начать <ChevronRight size={20} /></span>
          </Card>
        </Link>
        <p className="px-1 text-sm text-ink-muted">
          {seen === 0 ? 'Читаете вопрос → отвечаете вслух → «Показать ответ» → оцениваете себя. ' : ''}
          <Link to="/help" data-testid="home-help" className="font-semibold text-sage-strong">
            Как заниматься →
          </Link>
        </p>

        <p className="px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Дополнительно</p>
        <div className="grid grid-cols-2 gap-3">
          <ModeTile to="/topics" icon={<Layers />} title="Блок / тема" hint="выбрать тему и пройти её целиком" />
          <ModeTile to="/study/ticket" icon={<Shuffle />} title="Билет" hint="6 вопросов, как на экзамене" />
          <ModeTile to="/weak" icon={<AlertTriangle />} title="Слабые места" hint="что чаще всего не знаю" />
          <ModeTile to="/study/final" icon={<RotateCcw />} title="Повтор перед экзаменом" hint="всё, что ещё не усвоено" />
        </div>

        <p className="text-center text-xs text-ink-muted">
          Карточек: {cards.length}, сверено с материалами: {checked}. Остальные — черновик.
        </p>
      </div>
    </Screen>
  )
}
