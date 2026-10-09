import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Tense } from '../content/schema'
import { exerciseItemId, filterByFocus, gridItemId, parseItemId } from '../engine/items'
import { buildExtraNewQueue, buildTodayQueue, buildTopicQueue, buildWeakQueue, currentCard, gradeInSession, isFinished, remaining, startSession, toDateString, type Grade, type ProgressMap, type SchedItem } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress, type Settings } from '../store/progress'
import { Button, Card, Screen } from './components'
import { ExerciseDrill } from './drills/ExerciseDrill'
import { GridDrill } from './drills/GridDrill'
import { FormsPractice, WhichPractice } from './drills/Practice'
import { VocabDrill } from './drills/VocabDrill'

const MODE_TITLES: Record<string, string> = { today: 'Today', topic: 'Unit / topic', weak: 'Weak spots', grid: 'Paradigm grid', exercise: 'Exercise', extra: 'More new', forms: 'One form', which: 'Which form?' }

function buildQueue(mode: string, params: URLSearchParams, items: SchedItem[], progress: ProgressMap, settings: Settings, today: string): string[] {
  const focused = filterByFocus(items, settings.tenseFocus)
  switch (mode) {
    case 'today':
      return buildTodayQueue({ items: focused, progress, today, newLimit: settings.newPerDay })
    case 'extra':
      return buildExtraNewQueue(focused, progress, 10)
    case 'weak':
      return buildWeakQueue(focused, progress)
    case 'topic': {
      const unit = params.get('unit')
      const cluster = params.get('cluster')
      const kind = params.get('kind')
      return buildTopicQueue(focused, progress, today, (c) => (!unit || c.unit === Number(unit)) && (!cluster || c.cluster === cluster) && (!kind || c.kind === kind))
    }
    case 'grid': {
      const verb = params.get('verb')
      const tense = params.get('tense') as Tense | null
      return verb && tense ? [gridItemId(verb, tense)] : []
    }
    case 'exercise': {
      const id = params.get('id')
      return id ? [exerciseItemId(id)] : []
    }
    default:
      return []
  }
}

export function Study() {
  const { mode = 'today' } = useParams()
  const [params] = useSearchParams()
  const items = useContent((s) => s.items)
  const vocabById = useContent((s) => s.vocabById)
  const verbById = useContent((s) => s.verbById)
  const exerciseById = useContent((s) => s.exerciseById)
  const grade = useProgress((s) => s.grade)
  const focus = useProgress((s) => s.settings.tenseFocus)
  const today = toDateString(new Date())
  const title = MODE_TITLES[mode] ?? 'Study'

  const [session, setSession] = useState(() => {
    const { progress, settings } = useProgress.getState()
    return startSession(buildQueue(mode, params, items, progress, settings, today))
  })
  const unseenCount = useMemo(() => {
    const { progress } = useProgress.getState()
    return filterByFocus(items, focus).filter((c) => progress[c.id] === undefined).length
  }, [items, focus, session])

  if (mode === 'forms' || mode === 'which') {
    const verbParam = params.get('verb')
    const tenseParam = params.get('tense') as Tense | null
    const tenses = tenseParam ? [tenseParam] : focus
    const verbs = verbParam ? [verbById[verbParam]].filter((v): v is NonNullable<typeof v> => !!v) : Object.values(verbById).filter((v) => tenses.some((t) => v.forms[t]))
    return (
      <Screen title={title} back="/verbs">
        {mode === 'forms' ? <FormsPractice verbs={verbs} tenses={tenses} today={today} /> : <WhichPractice verbs={verbs} tenses={tenses} today={today} />}
      </Screen>
    )
  }

  const id = currentCard(session)
  const parsed = id ? parseItemId(id) : null

  function onDone(g: Grade) {
    if (!id) return
    grade(id, g, today)
    setSession((s) => gradeInSession(s, g, Math.random))
    window.scrollTo({ top: 0 })
  }
  const moreNewButton =
    (mode === 'today' || mode === 'extra') && unseenCount > 0 ? (
      <Link to={`/study/extra?n=${session.queue.length}`} data-testid="study-more-new" className="block">
        <Button variant="secondary" className="w-full">{Math.min(10, unseenCount)} more new</Button>
      </Link>
    ) : null

  if (session.queue.length === 0)
    return (
      <Screen title={title} back="/">
        <Card className="mt-4 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold">Nothing here</p>
          <p className="text-ink-muted">{mode === 'today' ? 'All done for today. Take more new items, open a unit, or drill the verbs.' : 'Nothing to show in this mode yet.'}</p>
          {moreNewButton}
          <Link to="/"><Button variant="secondary">Home</Button></Link>
        </Card>
      </Screen>
    )

  if (isFinished(session) || !id || !parsed)
    return (
      <Screen title={title} back="/">
        <Card data-testid="study-finished" className="mt-4 flex flex-col items-center gap-4 text-center">
          <p className="text-2xl font-bold">Done</p>
          <p className="text-ink-muted">Items completed: {session.done}</p>
          {moreNewButton}
          <Link to="/"><Button>Home</Button></Link>
        </Card>
      </Screen>
    )

  const key = `${id}:${session.index}`
  let body: React.ReactNode = null
  if (parsed.kind === 'vocab') {
    const entry = vocabById[parsed.ref]
    const reps = useProgress.getState().progress[id]?.reps ?? 0
    body = entry ? <VocabDrill key={key} entry={entry} direction={reps % 2 === 0 ? 'he-ru' : 'ru-he'} onDone={onDone} /> : null
  } else if (parsed.kind === 'grid') {
    const verb = verbById[parsed.ref]
    body = verb ? <GridDrill key={key} verb={verb} tense={parsed.tense} today={today} onDone={onDone} /> : null
  } else if (parsed.kind === 'exercise') {
    const ex = exerciseById[parsed.ref]
    body = ex ? <ExerciseDrill key={key} exercise={ex} focus={focus} today={today} onDone={onDone} /> : null
  } else {
    body = <Card className="mt-4 text-center text-ink-muted">Preposition paradigms arrive with the next content update.</Card>
  }
  if (!body) body = <Card className="mt-4 text-center text-ink-muted">This item is missing from the materials — skipping.</Card>

  return (
    <Screen title={title} back="/" right={<span data-testid="study-remaining" className="text-sm text-ink-muted">{remaining(session)} left</span>}>
      {body}
      {!body || (parsed.kind === 'prep') ? <Button className="mt-3 w-full" onClick={() => onDone('good')}>Skip</Button> : null}
    </Screen>
  )
}
