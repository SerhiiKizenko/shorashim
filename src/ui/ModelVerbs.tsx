// «Model verbs»: one verb per binyan, learnt in every tense (the teacher's method — know these by heart and a new verb
// of the same binyan follows). A tense button runs that tense's grid for each model verb in binyan order; a verb card
// opens its full table. The grids are the ordinary scheduled items, so «Today» sees the same progress.
import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BINYAN_LABELS, TENSE_LABELS, TENSES } from '../content/schema'
import { modelGridQueue, modelVerbs } from '../engine/items'
import { isDue, toDateString } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Card, Screen } from './components'
import { HebrewText } from './hebrew'
import { Status } from './Verbs'

export function ModelVerbs() {
  const verbs = useContent((s) => s.bundle.verbs)
  const progress = useProgress((s) => s.progress)
  const models = useMemo(() => modelVerbs(verbs), [verbs])
  const today = toDateString(new Date())
  const tenses = useMemo(
    () =>
      TENSES.map((tense) => {
        const ids = modelGridQueue(verbs, tense)
        const due = ids.filter((id) => progress[id] && isDue(progress[id]!, today)).length
        const fresh = ids.filter((id) => !progress[id]).length
        return { tense, count: ids.length, due, fresh }
      }).filter((t) => t.count),
    [verbs, progress, today],
  )

  return (
    <Screen title="Model verbs" back="/">
      <div className="flex flex-col gap-4 pt-2">
        <p className="px-1 text-sm text-ink-muted">One verb per binyan, in every tense. Know these by heart, and a new verb of the same binyan follows the same pattern.</p>
        {models.length ? (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="px-1 font-bold">One tense across the {models.length}</h2>
              <div className="grid grid-cols-2 gap-2">
                {tenses.map((t) => (
                  <Link key={t.tense} to={`/study/model?tense=${t.tense}`} data-testid={`model-tense-${t.tense}`} className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl bg-surface px-4 py-3 shadow-sm active:opacity-80">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{TENSE_LABELS[t.tense].en}</span>
                      <HebrewText size="sm" className="text-ink-muted">{TENSE_LABELS[t.tense].he}</HebrewText>
                    </span>
                    <span className="flex gap-1">
                      {models.filter((v) => v.forms[t.tense]).map((v) => (
                        <Status key={v.id} verb={v} tense={t.tense} />
                      ))}
                    </span>
                    <span className="text-xs text-ink-muted">{t.due} due · {t.fresh} new</span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-2">
              <h2 className="px-1 font-bold">The verbs</h2>
              {models.map((v) => (
                <Link key={v.id} to={`/model/${v.id}`} data-testid={`model-verb-${v.id}`}>
                  <Card className="flex items-center justify-between gap-3 py-4">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold">{BINYAN_LABELS[v.binyan].en} <HebrewText size="sm" className="font-normal text-ink-muted">{BINYAN_LABELS[v.binyan].he}</HebrewText></span>
                      <span className="text-sm text-ink-muted">{v.en ?? v.ru ?? ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <HebrewText size="lg" className="font-bold">{v.infinitive.pointed}</HebrewText>
                        <HebrewText size="sm" className="text-ink-muted">{v.root}</HebrewText>
                      </div>
                      <ChevronRight size={18} className="text-ink-muted" />
                    </div>
                  </Card>
                </Link>
              ))}
            </section>
          </>
        ) : (
          <p className="py-6 text-center text-ink-muted">No model verbs in the materials yet.</p>
        )}
      </div>
    </Screen>
  )
}
