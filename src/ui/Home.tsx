import { AlertTriangle, BookOpen, ChevronRight, Headphones, Settings as SettingsIcon, Sun, Table2 } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TENSE_LABELS } from '../content/schema'
import { answeredOn, studyDays } from '../engine/habit'
import { buildMixedCells, filterByFocus } from '../engine/items'
import { buildTodayQueue, countDue, dueForecast, isCatchUp, MASTERED_BOX, newAllowance, toDateString } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Card, Forecast, ProgressRing, Screen, WeekStrip } from './components'
import { TenseFocus } from './TenseFocus'

function ModeTile({ to, icon, title, hint, testId }: { to: string; icon: ReactNode; title: string; hint: string; testId?: string }) {
  return (
    <Link to={to} data-testid={testId} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-surface-2 px-2 py-3 text-center active:opacity-80">
      <span className="text-sage-strong">{icon}</span>
      <span className="whitespace-nowrap font-semibold">{title}</span>
      <span className="text-xs text-ink-muted">{hint}</span>
    </Link>
  )
}

export function Home() {
  const items = useContent((s) => s.items)
  const manifest = useContent((s) => s.manifest)
  const progress = useProgress((s) => s.progress)
  const settings = useProgress((s) => s.settings)
  const reviews = useProgress((s) => s.reviews)
  const cellStats = useProgress((s) => s.cellStats)
  const verbById = useContent((s) => s.verbById)
  const today = toDateString(new Date())

  const { due, fresh, seen, mastered, todayCount, total, catchUp, forecast, cells } = useMemo(() => {
    const focused = filterByFocus(items, settings.tenseFocus)
    const due = countDue(focused, progress, today)
    const catchUp = isCatchUp(due, settings.reviewsPerDay)
    const unseen = focused.filter((c) => !progress[c.id]).length
    const allowance = newAllowance(progress, today, settings.newPerDay)
    const fresh = catchUp ? 0 : Math.min(unseen, allowance)
    const seen = focused.length - unseen
    const mastered = focused.filter((c) => progress[c.id]?.box === MASTERED_BOX).length
    const todayCount = buildTodayQueue({ items: focused, progress, today, newLimit: allowance, reviewsPerDay: settings.reviewsPerDay }).length
    // the count is what matters here; the fixed random source only orders the cells
    const cells = catchUp ? 0 : buildMixedCells(focused, verbById, progress, cellStats, today, settings.mixedCells, () => 0.5).length
    return { due, fresh, seen, mastered, todayCount, total: focused.length, catchUp, forecast: dueForecast(focused, progress, today), cells }
  }, [items, progress, today, settings.newPerDay, settings.tenseFocus, settings.reviewsPerDay, settings.mixedCells, verbById, cellStats])
  const week = useMemo(() => studyDays(reviews, progress, today), [reviews, progress, today])
  const answered = answeredOn(reviews, today)
  const reviewLine = catchUp ? `${settings.reviewsPerDay} of ${due} due · new paused` : `${due} due · ${fresh} new`

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
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ProgressRing value={total ? seen / total : 0} label={`${seen}`} sub={`of ${total}`} />
            <div className="flex flex-1 flex-col gap-1">
              <div data-testid="home-status" className="text-lg font-bold">{seen === 0 ? 'Start with «Today»' : reviewLine}</div>
              <WeekStrip testId="home-week" days={week} />
              <div data-testid="home-answered" className="text-sm text-ink-muted">{answered} answered today · mastered {mastered}</div>
            </div>
          </div>
          {seen > 0 ? <Forecast testId="home-forecast" counts={forecast} /> : null}
          {catchUp ? <p data-testid="home-catch-up" className="rounded-2xl bg-warn/25 px-4 py-2 text-sm">Catch-up: more is due than a day's {settings.reviewsPerDay}. «Today» takes the oldest first and adds no new items until the pile is down.</p> : null}
        </Card>

        {settings.anchor ? (
          <p data-testid="home-anchor" className="-mb-2 px-1 text-sm font-semibold text-sage-strong">After {settings.anchor} → Today</p>
        ) : null}

        <Link to="/study/today" data-testid="home-today" className="block">
          <Card className="flex items-center gap-4 bg-sage-strong text-on-accent">
            <Sun size={28} />
            <div className="flex-1">
              <div className="text-lg font-bold">Today</div>
              <div className="text-sm opacity-90">
                {todayCount === 0 && cells === 0 ? 'All done for today' : [todayCount ? (catchUp ? `${todayCount} of ${due} to review` : `${due} to review · ${fresh} new`) : null, cells ? `${cells} cells` : null].filter(Boolean).join(' · ')}
              </div>
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
