import { BOOKS } from '../content/schema'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BINYAN_LABELS, GRID_COLUMNS, POS_LABELS, TENSE_LABELS, type Binyan, type Pos, type Tense } from '../content/schema'
import { ERROR_CLASSES, ERROR_LABELS, type ErrorClass } from '../engine/answer'
import { filterByFocus, parseItemId } from '../engine/items'
import { addDays, clusterStats, isLeech, LEECH_LAPSES, toDateString, type ClusterStat } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Button, Card, Screen } from './components'
import { HebrewText, MixedText } from './hebrew'
import { StatBar } from './Units'

/** A readable name for a cluster id: `u1:noun` → Nouns, `piel:future` → Pi'el · Future grids, `u4:ex` → exercises. */
function clusterLabel(s: ClusterStat): string {
  if (s.kind === 'grid') {
    const [binyan, tense] = s.cluster.split(':')
    return `${BINYAN_LABELS[binyan as Binyan]?.en ?? binyan} · ${TENSE_LABELS[tense as Tense]?.en ?? tense} grids`
  }
  if (s.kind === 'exercise') return 'exercises'
  if (s.kind === 'prep') return 'prepositions'
  const pos = s.cluster.replace(/^[^:]+:/, '')
  return POS_LABELS[pos as Pos] ?? pos
}

/** Window for the «kinds of mistake» counts: recent enough to describe how you type now. */
const MISTAKE_DAYS = 30

export function Weak() {
  const items = useContent((s) => s.items)
  const verbById = useContent((s) => s.verbById)
  const vocabById = useContent((s) => s.vocabById)
  const exerciseById = useContent((s) => s.exerciseById)
  const progress = useProgress((s) => s.progress)
  const cellStats = useProgress((s) => s.cellStats)
  const reviews = useProgress((s) => s.reviews)
  const focus = useProgress((s) => s.settings.tenseFocus)
  /** items that keep failing (Anki's leech threshold): listed for the teacher, never suspended */
  const leeches = useMemo(
    () =>
      Object.entries(progress)
        .filter(([, p]) => isLeech(p))
        .sort(([, a], [, b]) => b.lapses - a.lapses)
        .map(([id, p]) => {
          const r = parseItemId(id)
          const he = r?.kind === 'vocab' ? vocabById[r.ref]?.he : r?.kind === 'grid' ? verbById[r.ref]?.infinitive.pointed : undefined
          const what = r?.kind === 'vocab' ? vocabById[r.ref]?.ru : r?.kind === 'grid' ? `${TENSE_LABELS[r.tense].en} grid` : r?.kind === 'exercise' ? `Exercise ${exerciseById[r.ref]?.number ?? r.ref}` : id
          return { id, lapses: p.lapses, he, what }
        }),
    [progress, vocabById, verbById, exerciseById],
  )
  const mistakes = useMemo(() => {
    const since = addDays(toDateString(new Date()), -MISTAKE_DAYS)
    const counts: Partial<Record<ErrorClass, number>> = {}
    for (const r of reviews) if (r[3] && r[1] >= since) counts[r[3]] = (counts[r[3]] ?? 0) + 1
    return ERROR_CLASSES.filter((c) => counts[c]).map((c) => ({ c, n: counts[c]!, ...ERROR_LABELS[c] }))
  }, [reviews])
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
        {rows.length === 0 && cells.length === 0 && leeches.length === 0 ? <p className="py-8 text-center text-ink-muted">Nothing studied yet.</p> : null}
        {leeches.length ? (
          <section data-testid="weak-leeches" className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Ask the teacher</h2>
            <p className="px-1 text-sm text-ink-muted">These failed {LEECH_LAPSES} times or more. Usually it is two similar words or forms getting mixed up — worth a minute in class.</p>
            <Card className="flex flex-col divide-y divide-surface-2 py-2">
              {leeches.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-ink-muted">{l.what} · {l.lapses}× failed</span>
                  {l.he ? <HebrewText size="md" className="font-semibold">{l.he}</HebrewText> : null}
                </div>
              ))}
            </Card>
          </section>
        ) : null}
        {mistakes.length ? (
          <section data-testid="weak-mistakes" className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Kinds of mistake · last {MISTAKE_DAYS} days</h2>
            <Card className="flex flex-col divide-y divide-surface-2 py-2">
              {mistakes.map((m) => (
                <div key={m.c} data-testid={`weak-mistake-${m.c}`} className="flex items-start justify-between gap-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{m.label} <span className="font-normal text-ink-muted">· {m.slip ? 'spelling slip' : 'form'}</span></span>
                    <span className="text-xs text-ink-muted"><MixedText text={m.hint} /></span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{m.n}</span>
                </div>
              ))}
            </Card>
          </section>
        ) : null}
        {rows.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">By topic</h2>
            {rows.map((r) => (
              <Link key={r.cluster} to={`/study/topic?cluster=${encodeURIComponent(r.cluster)}`}>
                <Card className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{r.unit ? `Unit ${r.unit}` : BOOKS[r.book].short} · {clusterLabel(r)}</span>
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
