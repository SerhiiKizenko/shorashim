import { AlertTriangle, BookOpen, ChevronRight, Flame, Headphones, Settings as SettingsIcon, Sun, Table2 } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TENSE_LABELS } from '../content/schema'
import { filterByFocus } from '../engine/items'
import { buildTodayQueue, isDue, MASTERED_BOX, toDateString } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Card, plural, ProgressRing, Screen } from './components'
import { TenseFocus } from './TenseFocus'

function ModeTile({ to, icon, title, hint, testId }: { to: string; icon: ReactNode; title: string; hint: string; testId?: string }) {
  return (
    <Link to={to} data-testid={testId} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-surface-2 px-3 py-3 text-center active:opacity-80">
      <span className="text-sage-strong">{icon}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-ink-muted">{hint}</span>
    </Link>
  )
}

export function Home() {
  const items = useContent((s) => s.items)
  const manifest = useContent((s) => s.manifest)
  const progress = useProgress((s) => s.progress)
  const settings = useProgress((s) => s.settings)
  const stats = useProgress((s) => s.stats)
  const today = toDateString(new Date())

  const { due, fresh, seen, mastered, todayCount, total } = useMemo(() => {
    const focused = filterByFocus(items, settings.tenseFocus)
    const due = focused.filter((c) => progress[c.id] && isDue(progress[c.id]!, today)).length
    const unseen = focused.filter((c) => !progress[c.id]).length
    const fresh = Math.min(unseen, settings.newPerDay)
    const seen = focused.length - unseen
    const mastered = focused.filter((c) => progress[c.id]?.box === MASTERED_BOX).length
    const todayCount = buildTodayQueue({ items: focused, progress, today, newLimit: settings.newPerDay }).length
    return { due, fresh, seen, mastered, todayCount, total: focused.length }
  }, [items, progress, today, settings.newPerDay, settings.tenseFocus])

  const focusLabel = settings.tenseFocus.length ? settings.tenseFocus.map((t) => TENSE_LABELS[t].en).join(' + ') : 'no tense'
  const checked = manifest ? Object.values(manifest.counts).reduce((n, c) => n + c.checked, 0) : 0
  const totalRecords = manifest ? Object.values(manifest.counts).reduce((n, c) => n + c.total, 0) : 0

  return (
    <Screen
      title="Shorashim"
      right={
        <Link to="/settings" aria-label="Settings" data-testid="home-settings" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted active:bg-surface-2">
          <SettingsIcon />
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <Card className="flex items-center gap-4">
          <ProgressRing value={total ? seen / total : 0} label={`${seen}`} sub={`of ${total}`} />
          <div className="flex flex-1 flex-col gap-1">
            <div data-testid="home-status" className="text-lg font-bold">{seen === 0 ? 'Start with «Today»' : `${due} due · ${fresh} new`}</div>
            <div className="flex items-center gap-1 text-sm text-ink-muted">
              <Flame size={16} className={stats.streak ? 'text-warn' : ''} /> {stats.streak} {plural(stats.streak, 'day', 'days')} in a row
            </div>
            <div className="text-sm text-ink-muted">Mastered: {mastered}</div>
          </div>
        </Card>

        <Link to="/study/today" data-testid="home-today" className="block">
          <Card className="flex items-center gap-4 bg-sage-strong text-on-accent">
            <Sun size={28} />
            <div className="flex-1">
              <div className="text-lg font-bold">Today</div>
              <div className="text-sm opacity-90">{todayCount === 0 ? 'All done for today' : `${due} to review · ${fresh} new`}</div>
            </div>
            <span className="flex items-center gap-1 text-base font-semibold">
              Start <ChevronRight size={20} />
            </span>
          </Card>
        </Link>

        <Card className="flex flex-col gap-3">
          <TenseFocus />
        </Card>

        <Link to="/verbs" data-testid="home-verbs" className="block">
          <Card className="flex items-center gap-4 bg-lavender">
            <Table2 size={28} />
            <div className="flex-1">
              <div className="text-lg font-bold">Verbs</div>
              <div className="text-sm opacity-80">Grids, single forms, «which form?» — {focusLabel}</div>
            </div>
            <ChevronRight size={20} />
          </Card>
        </Link>

        <div className="grid grid-cols-3 gap-3">
          <ModeTile to="/units" icon={<BookOpen />} title="Units" hint="vocabulary, grammar, exercises" testId="home-units" />
          <ModeTile to="/weak" icon={<AlertTriangle />} title="Weak spots" hint="what keeps failing" testId="home-weak" />
          <ModeTile to="/listen" icon={<Headphones />} title="Listen" hint="the book's recordings" testId="home-listen" />
        </div>

        <p className="px-1 text-sm text-ink-muted">
          {seen === 0 ? 'Read → type the Hebrew (no vowel points) → check → grade yourself. ' : ''}
          <Link to="/help" data-testid="home-help" className="font-semibold text-sage-strong">
            How to study →
          </Link>
        </p>
        <p className="text-center text-xs text-ink-muted">
          Records: {totalRecords}, checked against the book: {checked}. The rest are drafts.
        </p>
      </div>
    </Screen>
  )
}
