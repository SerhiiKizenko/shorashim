import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { TENSE_LABELS, TENSES, type Bundle, type Tense } from '../content/schema'
import type { ErrorClass } from '../engine/answer'
import { answeredOn } from '../engine/habit'
import { buildMixedCells, exerciseItemId, filterByFocus, gridItemId, isTopicItem, modelGridQueue, parseItemId, topicItemIds } from '../engine/items'
import { buildExtraNewQueue, buildTodayQueue, buildTopicQueue, buildWeakQueue, countDue, currentCard, dueForecast, gradeInSession, isCatchUp, isFinished, newAllowance, remaining, shouldPersistGrade, startSession, toDateString, vocabMode, type Grade, type ProgressMap, type SchedItem } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress, type Settings } from '../store/progress'
import { Button, Card, Forecast, Screen, SessionBar } from './components'
import { ExerciseDrill } from './drills/ExerciseDrill'
import { GridDrill } from './drills/GridDrill'
import { CellCard, FormsPractice, WhichPractice } from './drills/Practice'
import { VocabDrill } from './drills/VocabDrill'

const MODE_TITLES: Record<string, string> = { today: 'Today', topic: 'Unit / topic', weak: 'Weak spots', grid: 'Paradigm grid', exercise: 'Exercise', extra: 'More new', forms: 'One form', build: 'Build from root', which: 'Which form?', model: 'Model verbs' }

function buildQueue(mode: string, params: URLSearchParams, items: SchedItem[], progress: ProgressMap, settings: Settings, today: string, bundle: Bundle): string[] {
  const focused = filterByFocus(items, settings.tenseFocus)
  switch (mode) {
    case 'today':
      return buildTodayQueue({ items: focused, progress, today, newLimit: newAllowance(progress, today, settings.newPerDay), reviewsPerDay: settings.reviewsPerDay })
    case 'extra':
      return buildExtraNewQueue(focused, progress, 10)
    case 'weak':
      return buildWeakQueue(focused, progress)
    case 'topic': {
      const unit = params.get('unit')
      const cluster = params.get('cluster')
      const kind = params.get('kind')
      // topic=<grammar id>: the topic's words, grids and exercises (a workbook topic is homework: one unit of study)
      const topic = params.get('topic') ? bundle.grammar.find((g) => g.id === params.get('topic')) : undefined
      const ids = topic ? topicItemIds(topic, bundle.vocab) : null
      const verbIds = new Set(topic?.verbIds ?? [])
      return buildTopicQueue(focused, progress, today, (c) => (!ids || isTopicItem(c, ids, verbIds)) && (!unit || c.unit === Number(unit)) && (!cluster || c.cluster === cluster) && (!kind || c.kind === kind))
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
    case 'model': {
      // one tense across the model verbs, every tense allowed (the focus does not apply here)
      const tense = params.get('tense') as Tense | null
      return tense && (TENSES as readonly string[]).includes(tense) ? modelGridQueue(bundle.verbs, tense) : []
    }
    default:
      return []
  }
}

export function Study() {
  const { mode = 'today' } = useParams()
  const [params] = useSearchParams()
  const items = useContent((s) => s.items)
  const bundle = useContent((s) => s.bundle)
  const vocab = bundle.vocab
  const vocabById = useContent((s) => s.vocabById)
  const verbById = useContent((s) => s.verbById)
  const exerciseById = useContent((s) => s.exerciseById)
  const grade = useProgress((s) => s.grade)
  const focus = useProgress((s) => s.settings.tenseFocus)
  const today = toDateString(new Date())
  const modelTense = mode === 'model' ? (params.get('tense') as Tense | null) : null
  const title = modelTense && TENSE_LABELS[modelTense] ? `Model verbs · ${TENSE_LABELS[modelTense].en}` : (MODE_TITLES[mode] ?? 'Study')
  // a model-verbs session returns to its section
  const home = mode === 'model' ? { to: '/model', label: 'Model verbs' } : { to: '/', label: 'Home' }

  // Everything decided when the session begins: the queue, the mixed cells that follow «Today», how many answers
  // today already holds, and a snapshot of the progress — a card asks the way the item stood at the start, so a
  // re-pass after «Again» keeps the direction of its first showing.
  const [start] = useState(() => {
    const { progress, settings, cellStats, reviews } = useProgress.getState()
    const focused = filterByFocus(items, settings.tenseFocus)
    const catchUp = isCatchUp(countDue(focused, progress, today), settings.reviewsPerDay)
    return {
      progress,
      queue: buildQueue(mode, params, items, progress, settings, today, bundle),
      mixed: mode === 'today' && !catchUp ? buildMixedCells(focused, verbById, progress, cellStats, today, settings.mixedCells, Math.random) : [],
      answeredBefore: answeredOn(reviews, today),
    }
  })
  const [session, setSession] = useState(() => startSession(start.queue))
  const [mixedIndex, setMixedIndex] = useState(0)
  const [mixedRight, setMixedRight] = useState(0)
  const mixed = start.mixed
  const unseenCount = useMemo(() => {
    const { progress } = useProgress.getState()
    return filterByFocus(items, focus).filter((c) => progress[c.id] === undefined).length
  }, [items, focus, session])

  if (mode === 'forms' || mode === 'which' || mode === 'build') {
    const verbParam = params.get('verb')
    const tenseParam = params.get('tense') as Tense | null
    const tenses = tenseParam ? [tenseParam] : focus
    const verbs = verbParam ? [verbById[verbParam]].filter((v): v is NonNullable<typeof v> => !!v) : Object.values(verbById).filter((v) => tenses.some((t) => v.forms[t]))
    return (
      <Screen title={title} back="/verbs">
        {mode === 'which' ? <WhichPractice verbs={verbs} tenses={tenses} today={today} /> : <FormsPractice verbs={verbs} tenses={tenses} today={today} prompt={mode === 'build' ? 'root' : 'infinitive'} />}
      </Screen>
    )
  }

  const id = currentCard(session)
  const parsed = id ? parseItemId(id) : null
  const mainDone = isFinished(session) || !id || !parsed
  const inMixed = mainDone && mixedIndex < mixed.length
  const bar = <SessionBar done={start.answeredBefore + session.index + mixedIndex} total={start.answeredBefore + session.queue.length + mixed.length} />

  function onDone(g: Grade, error?: ErrorClass) {
    if (!id) return
    // The schedule learns from the first answer only; a re-pass after «Again» is rehearsal (see shouldPersistGrade).
    if (shouldPersistGrade(session, g)) grade(id, g, today, error)
    setSession((s) => gradeInSession(s, g, Math.random))
    window.scrollTo({ top: 0 })
  }
  const showForecast = mode === 'today' || mode === 'extra'
  const forecast = showForecast ? <Forecast testId="study-forecast" counts={dueForecast(filterByFocus(items, focus), useProgress.getState().progress, today)} /> : null
  const moreNewButton =
    showForecast && unseenCount > 0 ? (
      <Link to={`/study/extra?n=${session.queue.length}`} data-testid="study-more-new" className="block">
        <Button variant="secondary" className="w-full">{Math.min(10, unseenCount)} more new</Button>
      </Link>
    ) : null

  if (session.queue.length === 0 && mixed.length === 0)
    return (
      <Screen title={title} back={home.to}>
        <Card className="mt-4 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold">Nothing here</p>
          <p className="text-ink-muted">{mode === 'today' ? 'All done for today. Take more new items, open a unit, or drill the verbs.' : 'Nothing to show in this mode yet.'}</p>
          {forecast ? <div className="w-full text-left">{forecast}</div> : null}
          {moreNewButton}
          <Link to={home.to}><Button variant="secondary">{home.label}</Button></Link>
        </Card>
      </Screen>
    )

  if (inMixed) {
    const q = mixed[mixedIndex]!
    return (
      <Screen title="Mixed cells" back="/" right={<span data-testid="study-remaining" className="text-sm text-ink-muted">{mixed.length - mixedIndex} cells left</span>}>
        {bar}
        <p className="text-sm text-ink-muted">Single forms from verbs you know, out of their tables. They train recall; they do not move a grid's schedule.</p>
        <CellCard
          key={mixedIndex}
          q={q}
          prompt="infinitive"
          today={today}
          last={mixedIndex + 1 >= mixed.length}
          onNext={(ok) => {
            if (ok) setMixedRight((n) => n + 1)
            setMixedIndex((n) => n + 1)
            window.scrollTo({ top: 0 })
          }}
        />
      </Screen>
    )
  }

  if (mainDone)
    return (
      <Screen title={title} back={home.to}>
        <Card data-testid="study-finished" className="mt-4 flex flex-col items-center gap-4 text-center">
          <p className="text-2xl font-bold">Done</p>
          <p className="text-ink-muted">Items completed: {session.done}</p>
          {mixed.length ? <p className="text-ink-muted">Mixed cells: {mixedRight} of {mixed.length} right</p> : null}
          {forecast ? <div className="w-full text-left">{forecast}</div> : null}
          {moreNewButton}
          <Link to={home.to}><Button>{home.label}</Button></Link>
        </Card>
      </Screen>
    )

  const key = `${id}:${session.index}`
  let body: React.ReactNode = null
  if (parsed.kind === 'vocab') {
    const entry = vocabById[parsed.ref]
    const before = start.progress[id]
    body = entry ? <VocabDrill key={key} entry={entry} mode={vocabMode(before)} box={before?.box ?? 1} pool={vocab} root={entry.verbId ? verbById[entry.verbId]?.root : undefined} onDone={onDone} /> : null
  } else if (parsed.kind === 'grid') {
    const verb = verbById[parsed.ref]
    body = verb ? <GridDrill key={key} verb={verb} tense={parsed.tense} today={today} onDone={onDone} /> : null
  } else if (parsed.kind === 'exercise') {
    const ex = exerciseById[parsed.ref]
    // opened on its own, an exercise shows every item as printed; in a session it keeps to the tense focus
    body = ex ? <ExerciseDrill key={key} exercise={ex} focus={mode === 'exercise' ? [...TENSES] : focus} today={today} onDone={onDone} /> : null
  } else {
    body = <Card className="mt-4 text-center text-ink-muted">Preposition paradigms arrive with the next content update.</Card>
  }
  if (!body) body = <Card className="mt-4 text-center text-ink-muted">This item is missing from the materials — skipping.</Card>

  return (
    <Screen title={title} back={home.to} right={<span data-testid="study-remaining" className="text-sm text-ink-muted">{remaining(session)} left</span>}>
      {bar}
      {body}
      {!body || (parsed.kind === 'prep') ? <Button className="mt-3 w-full" onClick={() => onDone('good')}>Skip</Button> : null}
    </Screen>
  )
}
