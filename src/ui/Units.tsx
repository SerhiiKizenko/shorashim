import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { UNIT_LETTERS } from '../content/schema'
import { MASTERED_BOX } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Card, Screen } from './components'
import { HebrewText } from './hebrew'

export function StatBar({ s }: { s: { total: number; unseen: number; weak: number; learning: number; mastered: number } }) {
  const w = (n: number) => `${(100 * n) / Math.max(1, s.total)}%`
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="bg-ok" style={{ width: w(s.mastered) }} />
      <div className="bg-sage" style={{ width: w(s.learning) }} />
      <div className="bg-bad" style={{ width: w(s.weak) }} />
    </div>
  )
}

export function Units() {
  const bundle = useContent((s) => s.bundle)
  const items = useContent((s) => s.items)
  const progress = useProgress((s) => s.progress)
  const rows = useMemo(
    () =>
      bundle.units.map((u) => {
        const mine = items.filter((i) => i.unit === u.unit)
        const stat = { total: mine.length, unseen: 0, weak: 0, learning: 0, mastered: 0 }
        for (const i of mine) {
          const p = progress[i.id]
          if (!p) stat.unseen++
          else if (p.box <= 2) stat.weak++
          else if (p.box < MASTERED_BOX) stat.learning++
          else stat.mastered++
        }
        return {
          ...u,
          stat,
          vocab: bundle.vocab.filter((v) => v.unit === u.unit).length,
          verbs: bundle.verbs.filter((v) => v.unit === u.unit).length,
          grammar: bundle.grammar.filter((g) => g.unit === u.unit).length,
          exercises: bundle.exercises.filter((e) => e.unit === u.unit).length,
          texts: bundle.texts.filter((t) => t.unit === u.unit).length,
        }
      }),
    [bundle, items, progress],
  )
  return (
    <Screen title="Units" back="/">
      <div className="flex flex-col gap-2 pt-2">
        {rows.map((r) => {
          const empty = r.vocab + r.verbs + r.grammar + r.exercises + r.texts === 0
          return (
            <Link key={r.unit} to={empty ? '#' : `/units/${r.unit}`} data-testid={`unit-${r.unit}`} className={empty ? 'pointer-events-none opacity-50' : ''}>
              <Card className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Unit {r.unit} <HebrewText size="sm">יחידה {UNIT_LETTERS[r.unit] ?? r.letter}</HebrewText></span>
                  <span className="shrink-0 text-xs text-ink-muted">pp. {r.pages[0]}–{r.pages[1]}</span>
                </div>
                <p className="text-sm text-ink-muted">{empty ? 'not transcribed yet' : [r.vocab && `${r.vocab} words`, r.verbs && `${r.verbs} verbs`, r.grammar && `${r.grammar} grammar`, r.exercises && `${r.exercises} exercises`, r.texts && `${r.texts} texts`].filter(Boolean).join(' · ')}</p>
                {!empty ? <StatBar s={r.stat} /> : null}
              </Card>
            </Link>
          )
        })}
        <p className="text-center text-xs text-ink-muted">Bar: mastered · in progress · weak. Units unlock in book order in «Today»; browse any of them here.</p>
      </div>
    </Screen>
  )
}
