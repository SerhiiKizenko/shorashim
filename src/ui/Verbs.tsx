import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BINYAN_LABELS, BINYANIM, TENSE_LABELS, type Binyan, type Tense, type Verb } from '../content/schema'
import { gridItemId } from '../engine/items'
import { MASTERED_BOX } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Badge, Button, Card, Screen } from './components'
import { HebrewText } from './hebrew'
import { TenseFocus } from './TenseFocus'

function Status({ verb, tense }: { verb: Verb; tense: Tense }) {
  const p = useProgress((s) => s.progress[gridItemId(verb.id, tense)])
  const cls = !p ? 'bg-surface-2' : p.box <= 2 ? 'bg-bad' : p.box < MASTERED_BOX ? 'bg-sage' : 'bg-ok'
  const title = !p ? 'not started' : p.box <= 2 ? 'weak' : p.box < MASTERED_BOX ? `box ${p.box}` : 'mastered'
  return <span title={title} className={`inline-block h-3 w-3 rounded-full ${cls}`} />
}

export function Verbs() {
  const verbs = useContent((s) => s.bundle.verbs)
  const focus = useProgress((s) => s.settings.tenseFocus)
  const groups = useMemo(() => {
    const out = new Map<Binyan, Verb[]>()
    for (const v of verbs) if (focus.some((t) => v.forms[t])) out.set(v.binyan, [...(out.get(v.binyan) ?? []), v])
    return BINYANIM.filter((b) => out.has(b)).map((b) => ({ binyan: b, verbs: out.get(b)! }))
  }, [verbs, focus])
  const count = groups.reduce((n, g) => n + g.verbs.length, 0)

  return (
    <Screen title="Verbs" back="/" footer={count ? <Link to="/study/topic?kind=grid" className="block"><Button data-testid="verbs-drill-all" className="w-full">Drill all grids ({count})</Button></Link> : undefined}>
      <div className="flex flex-col gap-4 pt-2">
        <Card><TenseFocus compact /></Card>
        {count ? (
          <div className="grid grid-cols-2 gap-2">
            <Link to="/study/forms" className="block"><Button variant="secondary" className="w-full">One form</Button></Link>
            <Link to="/study/which" className="block"><Button variant="secondary" className="w-full">Which form?</Button></Link>
          </div>
        ) : (
          <p className="py-6 text-center text-ink-muted">{focus.length ? 'No verbs for the selected tenses yet.' : 'Select a tense above.'}</p>
        )}
        {groups.map((g) => (
          <section key={g.binyan} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 px-1 font-bold">
              {BINYAN_LABELS[g.binyan].en} <HebrewText size="sm">{BINYAN_LABELS[g.binyan].he}</HebrewText> <span className="text-sm font-normal text-ink-muted">· {g.verbs.length}</span>
            </h2>
            {g.verbs.map((v) => (
              <Card key={v.id} data-testid={`verb-${v.id}`} className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-ink-muted">{v.ru ?? ''}</span>
                    <span className="text-xs text-ink-muted">{v.flags.includes('generated') ? 'pattern cells' : ''}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <HebrewText size="lg" className="font-bold">{v.infinitive.pointed}</HebrewText>
                    <HebrewText size="sm" className="text-ink-muted">{v.root}</HebrewText>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {focus.filter((t) => v.forms[t]).map((t) => (
                    <Link key={t} to={`/study/grid?verb=${v.id}&tense=${t}`} data-testid={`verb-grid-${v.id}-${t}`} className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-2 text-sm font-semibold active:opacity-80">
                      <Status verb={v} tense={t} /> {TENSE_LABELS[t].en} grid
                    </Link>
                  ))}
                  <Link to={`/study/forms?verb=${v.id}`} className="rounded-full bg-surface-2 px-3 py-2 text-sm text-ink-muted active:opacity-80">forms</Link>
                  <Link to={`/study/which?verb=${v.id}`} className="rounded-full bg-surface-2 px-3 py-2 text-sm text-ink-muted active:opacity-80">which?</Link>
                </div>
                {v.reviewStatus === 'draft' ? <Badge tone="sand">draft</Badge> : null}
              </Card>
            ))}
          </section>
        ))}
      </div>
    </Screen>
  )
}
