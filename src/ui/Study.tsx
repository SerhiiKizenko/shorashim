import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Block } from '../content/schema'
import {
  buildExtraNewQueue,
  buildFinalReviewQueue,
  buildTicket,
  buildTodayQueue,
  buildTopicQueue,
  buildWeakQueue,
  currentCard,
  daysBetween,
  gradeInSession,
  isFinished,
  remaining,
  startSession,
  toDateString,
  type Grade,
  type SchedCard,
} from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { BlockBadge, Button, Card, Screen } from './components'
import { Markdown } from './Markdown'

const MODE_TITLES: Record<string, string> = { today: 'Сегодня', topic: 'Блок / тема', ticket: 'Билет', weak: 'Слабые места', final: 'Повтор перед экзаменом' }

export function Study() {
  const { mode = 'today' } = useParams()
  const [params] = useSearchParams()
  const cards = useContent((s) => s.cards)
  const byId = useContent((s) => s.byId)
  const grade = useProgress((s) => s.grade)
  const today = toDateString(new Date())

  const [session, setSession] = useState(() => {
    const { progress, settings } = useProgress.getState()
    const sched: SchedCard[] = cards.map((c) => ({ id: c.id, block: c.block, cluster: c.cluster, examNumber: c.examNumber }))
    const daysToExam = settings.examDate ? daysBetween(today, settings.examDate) : 14
    const block = params.get('block') ? (Number(params.get('block')) as Block) : null
    const cluster = params.get('cluster')
    let queue: string[]
    switch (mode) {
      case 'topic':
        queue = buildTopicQueue(sched, progress, today, (c) => (block === null || c.block === block) && (cluster === null || c.cluster === cluster))
        break
      case 'ticket':
        queue = buildTicket(sched, Math.random)
        break
      case 'weak':
        queue = buildWeakQueue(sched, progress)
        break
      case 'final':
        queue = buildFinalReviewQueue(sched, progress)
        break
      default:
        queue = buildTodayQueue({ cards: sched, progress, today, daysToExam, newLimit: settings.newPerDay ?? undefined })
    }
    return startSession(queue)
  })
  const [revealed, setRevealed] = useState(false)

  const id = currentCard(session)
  const card = id ? byId[id] : undefined
  const title = useMemo(() => MODE_TITLES[mode] ?? 'Карточки', [mode])
  const unseenCount = useMemo(() => {
    const { progress } = useProgress.getState()
    return cards.filter((c) => progress[c.id] === undefined).length
  }, [cards, session])

  function moreNew() {
    const { progress } = useProgress.getState()
    const sched: SchedCard[] = cards.map((c) => ({ id: c.id, block: c.block, cluster: c.cluster, examNumber: c.examNumber }))
    setSession(startSession(buildExtraNewQueue(sched, progress, 10)))
    setRevealed(false)
    window.scrollTo({ top: 0 })
  }
  const moreNewButton =
    mode === 'today' && unseenCount > 0 ? (
      <Button data-testid="study-more-new" variant="secondary" onClick={moreNew}>
        Ещё {Math.min(10, unseenCount)} новых
      </Button>
    ) : null

  function onGrade(g: Grade) {
    if (!id) return
    grade(id, g, today)
    setSession((s) => gradeInSession(s, g, Math.random))
    setRevealed(false)
    window.scrollTo({ top: 0 })
  }

  if (session.queue.length === 0)
    return (
      <Screen title={title} back="/">
        <Card className="mt-4 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold">Карточек нет</p>
          <p className="text-ink-muted">{mode === 'today' ? 'На сегодня всё сделано. Можно взять ещё новых, повторить тему или собрать билет.' : 'В этом режиме пока нечего показывать.'}</p>
          {moreNewButton}
          <Link to="/"><Button variant="secondary">На главную</Button></Link>
        </Card>
      </Screen>
    )

  if (isFinished(session) || !card)
    return (
      <Screen title={title} back="/">
        <Card data-testid="study-finished" className="mt-4 flex flex-col items-center gap-4 text-center">
          <p className="text-2xl font-bold">Готово</p>
          <p className="text-ink-muted">Пройдено карточек: {session.done}</p>
          {moreNewButton}
          <Link to="/"><Button>На главную</Button></Link>
        </Card>
      </Screen>
    )

  return (
    <Screen
      title={title}
      back="/"
      right={<span data-testid="study-remaining" className="text-sm text-ink-muted">осталось {remaining(session)}</span>}
      footer={
        revealed ? (
          <div className="grid grid-cols-3 gap-2">
            <Button data-testid="grade-again" variant="bad" onClick={() => onGrade('again')}>Не знаю</Button>
            <Button data-testid="grade-hard" variant="warn" onClick={() => onGrade('hard')}>С трудом</Button>
            <Button data-testid="grade-good" variant="ok" onClick={() => onGrade('good')}>Знаю</Button>
          </div>
        ) : (
          <Button data-testid="study-reveal" className="w-full" onClick={() => setRevealed(true)}>Показать ответ</Button>
        )
      }
    >
      <div className="flex flex-col gap-3 pt-2">
        <BlockBadge block={card.block} label={card.clusterTitle} />
        <Card>
          <p data-testid="study-prompt" className="text-xl font-semibold leading-snug">{card.prompt}</p>
          {mode === 'ticket' ? <p className="mt-2 text-sm text-ink-muted">Ответьте вслух, как на экзамене.</p> : null}
        </Card>
        {revealed ? (
          <>
            {card.reviewStatus === 'draft' ? (
              <p className="rounded-2xl bg-warn/25 px-4 py-2 text-sm">Черновик — ответ ещё не сверен с материалами.</p>
            ) : null}
            <Card data-testid="study-answer">
              <Markdown text={card.answer} />
            </Card>
            {card.examLine ? (
              <Card className="border-l-4 border-sage-strong bg-sage/20">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Как сказать на экзамене</p>
                <p className="font-medium">{card.examLine}</p>
              </Card>
            ) : null}
            {card.sources.length ? (
              <p className="px-1 text-xs text-ink-muted">
                Источники: {card.sources.map((s) => `${s.file.replace(/\.pdf$/i, '')}${s.page ? `, с. ${s.page}` : ''}`).join('; ')}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </Screen>
  )
}
