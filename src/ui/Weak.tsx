import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GRID_COLUMNS, TENSE_LABELS, type Tense } from '../content/schema'
import { filterByFocus } from '../engine/items'
import { clusterStats } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Button, Card, Screen } from './components'
import { HebrewText } from './hebrew'
import { StatBar } from './Units'

export function Weak() {
  const items = useContent((s) => s.items)
  const verbById = useContent((s) => s.verbById)
  const progress = useProgress((s) => s.progress)
  const cellStats = useProgress((s) => s.cellStats)
  const focus = useProgress((s) => s.settings.tenseFocus)
  const rows = useMemo(
    () =>
      clusterStats(filterByFocus(items, focus), progress)
        .map((s) => ({ ...s, share: s.weak / Math.max(1, s.total - s.unseen) }))
        .filter((s) => s.unseen < s.total)
        .sort((a, b) => b.share - a.share || b.weak - a.weak),
    [items, progress, focus],
  )
  const cells = useMemo(
    () =>
      Object.entries(cellStats)
        .map(([key, s]) => {
          const [verbId, tense, cell] = key.split(':')
          const verb = verbId ? verbById[verbId] : undefined
          const label = verb && tense && cell ? GRID_COLUMNS[tense as Tense]?.find((c) => c.cell === cell)?.label : undefined
          return verb && tense && label ? { key, verb, tense: tense as Tense, label, ...s } : null
        })
        .filter((x): x is NonNullable<typeof x> => !!x && x.wrong > 0)
        .sort((a, b) => b.wrong - a.wrong || a.right - b.right)
        .slice(0, 12),
    [cellStats, verbById],
  )
  const weakTotal = rows.reduce((n, r) => n + r.weak, 0)

  return (
    <Screen title="Weak spots" back="/" footer={weakTotal ? <Link to="/study/weak" className="block"><Button className="w-full">Review weak items ({weakTotal})</Button></Link> : undefined}>
      <div className="flex flex-col gap-4 pt-2">
        {rows.length === 0 && cells.length === 0 ? <p className="py-8 text-center text-ink-muted">Nothing studied yet.</p> : null}
        {rows.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">By topic</h2>
            {rows.map((r) => (
              <Link key={r.cluster} to={`/study/topic?cluster=${encodeURIComponent(r.cluster)}`}>
                <Card className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">Unit {r.unit} · {r.cluster.replace(/^u\d+:/, '')}</span>
                    <span className="shrink-0 text-sm text-bad">{r.weak} weak</span>
                  </div>
                  <StatBar s={r} />
                </Card>
              </Link>
            ))}
          </section>
        ) : null}
        {cells.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Grid cells that keep failing</h2>
            <Card className="flex flex-col divide-y divide-surface-2 py-2">
              {cells.map((c) => (
                <Link key={c.key} to={`/study/grid?verb=${c.verb.id}&tense=${c.tense}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-ink-muted">{TENSE_LABELS[c.tense].en} · {c.wrong}× wrong, {c.right}× right</span>
                  <span className="flex items-center gap-2">
                    <HebrewText size="sm">{c.label}</HebrewText>
                    <HebrewText size="md" className="font-semibold">{c.verb.infinitive.pointed}</HebrewText>
                  </span>
                </Link>
              ))}
            </Card>
          </section>
        ) : null}
      </div>
    </Screen>
  )
}
