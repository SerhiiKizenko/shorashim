import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BINYAN_LABELS, TENSE_LABELS } from '../content/schema'
import { useContent } from '../store/content'
import { Badge, Button, Card, DraftNote, Pages, Screen } from './components'
import { HebrewText } from './hebrew'
import { Markdown } from './Markdown'

export function GrammarTopicScreen() {
  const { id = '' } = useParams()
  const topic = useContent((s) => s.grammarById[id])
  const verbById = useContent((s) => s.verbById)
  const exerciseById = useContent((s) => s.exerciseById)
  const [showRu, setShowRu] = useState(false)
  if (!topic) return <Screen title="Grammar" back="/units"><p className="py-8 text-center text-ink-muted">No such topic.</p></Screen>
  const verbs = topic.verbIds.map((v) => verbById[v]).filter((v): v is NonNullable<typeof v> => !!v)
  const exercises = topic.exerciseIds.map((e) => exerciseById[e]).filter((e): e is NonNullable<typeof e> => !!e)

  return (
    <Screen title={topic.titleEn} back={`/units/${topic.unit}`}>
      <div className="flex flex-col gap-4 pt-2 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <HebrewText size="lg" className="font-bold" block>{topic.titleHe}</HebrewText>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {topic.binyan ? <Badge tone="lavender">{BINYAN_LABELS[topic.binyan].en}</Badge> : null}
          {topic.tense ? <Badge tone="mist">{TENSE_LABELS[topic.tense].en}</Badge> : null}
          <Pages pages={topic.pages} />
        </div>
        <DraftNote status={topic.reviewStatus} flags={topic.flags} />

        <Card data-testid="grammar-explanation">
          <Markdown text={topic.explanationEn} />
        </Card>
        {topic.explanationRu ? (
          <Card className="flex flex-col gap-2 bg-surface-2">
            <button type="button" className="text-left text-sm font-semibold" onClick={() => setShowRu(!showRu)}>
              {showRu ? '▾' : '▸'} The book's own words (Russian, p. {topic.pages[0]})
            </button>
            {showRu ? <p className="whitespace-pre-line text-sm">{topic.explanationRu}</p> : null}
          </Card>
        ) : null}

        {topic.tables.map((t, i) => (
          <Card key={i} className="overflow-x-auto">
            {t.title ? <p className="mb-2 text-sm font-semibold">{t.title}</p> : null}
            <table dir="rtl" lang="he" className="w-full text-right">
              <thead>
                <tr>{t.columns.map((c, j) => <th key={j} className="pb-1 pr-2 text-xs font-semibold text-ink-muted"><HebrewText size="sm">{c}</HebrewText></th>)}</tr>
              </thead>
              <tbody>
                {t.rows.map((r, j) => (
                  <tr key={j} className="border-t border-surface-2">{r.map((c, k) => <td key={k} className="py-1 pr-2"><HebrewText size="md">{c}</HebrewText></td>)}</tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}

        {topic.examples.length ? (
          <Card className="flex flex-col gap-2">
            {topic.examples.map((e, i) => (
              <div key={i} className="flex flex-col items-end">
                <HebrewText size="md">{e.he}</HebrewText>
                {e.en || e.ru ? <span className="text-sm text-ink-muted">{e.en ?? e.ru}</span> : null}
              </div>
            ))}
          </Card>
        ) : null}

        {topic.teacherNote ? (
          <Card className="border-l-4 border-sage-strong bg-sage/20">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Teacher's method</p>
            <Markdown text={topic.teacherNote} />
          </Card>
        ) : null}

        {verbs.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Verbs · {verbs.length}</h2>
            <div className="grid grid-cols-2 gap-2">
              {verbs.map((v) => (
                <Link key={v.id} to={topic.tense ? `/study/grid?verb=${v.id}&tense=${topic.tense}` : '/verbs'} data-testid={`topic-verb-${v.id}`}>
                  <Card className="flex items-center justify-between gap-2 py-3">
                    <span className="text-xs text-ink-muted">{v.ru ?? ''}</span>
                    <HebrewText size="md" className="font-semibold">{v.infinitive.pointed}</HebrewText>
                  </Card>
                </Link>
              ))}
            </div>
            {topic.tense ? <Link to={`/study/topic?kind=grid&cluster=${topic.binyan ?? ''}:${topic.tense}`} className="block"><Button variant="secondary" className="w-full">Drill these grids</Button></Link> : null}
          </section>
        ) : null}

        {exercises.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Exercises</h2>
            {exercises.map((e) => (
              <Link key={e.id} to={`/study/exercise?id=${e.id}`}>
                <Card className="flex items-center justify-between gap-3 py-3">
                  <span className="font-semibold">{e.number} · {e.instructionEn}</span>
                  <span className="text-xs text-ink-muted">p. {e.page}</span>
                </Card>
              </Link>
            ))}
          </section>
        ) : null}
      </div>
    </Screen>
  )
}
