// Practice modes outside the scheduler: «One form» (type single cells) and «Which form is this?» (multiple choice).
// They record per-cell results for Weak spots but never grade the grid item.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GRID_COLUMNS, TENSE_LABELS, type Tense, type Verb } from '../../content/schema'
import { checkAnswer, type CheckResult } from '../../engine/answer'
import { useProgress } from '../../store/progress'
import { Badge, Button, Card } from '../components'
import { AnswerInput, HebrewText, Pointed } from '../hebrew'

interface Q {
  verb: Verb
  tense: Tense
  cell: string
  label: string
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** One question per distinct cell of each verb × tense, shuffled, capped. */
function questions(verbs: Verb[], tenses: Tense[], cap: number, rand = Math.random): Q[] {
  const qs: Q[] = []
  for (const verb of verbs)
    for (const tense of tenses) {
      const cells = verb.forms[tense]
      if (!cells) continue
      const seen = new Set<string>()
      for (const col of GRID_COLUMNS[tense]) {
        if (!cells[col.cell] || seen.has(col.cell)) continue
        seen.add(col.cell)
        qs.push({ verb, tense, cell: col.cell, label: col.label })
      }
    }
  return shuffle(qs, rand).slice(0, cap)
}

function Summary({ right, total, onAgain }: { right: number; total: number; onAgain: () => void }) {
  return (
    <Card data-testid="practice-summary" className="flex flex-col items-center gap-3 text-center">
      <p className="text-2xl font-bold">{right} / {total}</p>
      <Button onClick={onAgain}>Again</Button>
      <Link to="/verbs"><Button variant="secondary">Back to verbs</Button></Link>
    </Card>
  )
}

export function FormsPractice({ verbs, tenses, today }: { verbs: Verb[]; tenses: Tense[]; today: string }) {
  const recordCell = useProgress((s) => s.recordCell)
  const [seed, setSeed] = useState(0)
  const qs = useMemo(() => questions(verbs, tenses, 10), [verbs, tenses, seed])
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [right, setRight] = useState(0)
  const q = qs[i]
  if (!qs.length) return <p className="py-8 text-center text-ink-muted">No forms for this selection.</p>
  if (!q) return <Summary right={right} total={qs.length} onAgain={() => { setSeed(seed + 1); setI(0); setRight(0); setTyped(''); setResult(null) }} />
  const form = q.verb.forms[q.tense]![q.cell]!
  function check(input: string) {
    const r = checkAnswer(input, form)
    setResult(r)
    recordCell(`${q!.verb.id}:${q!.tense}:${q!.cell}`, r.ok, today)
    if (r.ok) setRight(right + 1)
  }
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center gap-2">
        <Badge tone="mist">{TENSE_LABELS[q.tense].en}</Badge>
        <span className="text-xs text-ink-muted">{i + 1} / {qs.length}</span>
      </div>
      <Card className="flex items-center justify-between gap-3">
        <HebrewText size="lg" className="font-semibold">{q.label}</HebrewText>
        <div className="flex flex-col items-end">
          <span className="text-xs text-ink-muted">infinitive</span>
          <HebrewText size="lg" className="font-bold" data-testid="study-prompt">{q.verb.infinitive.pointed}</HebrewText>
        </div>
      </Card>
      <AnswerInput data-testid="answer-input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onSubmit={() => !result && check(typed)} state={result ? (result.ok ? 'ok' : 'wrong') : 'idle'} readOnly={!!result} placeholder="עברית" />
      {result ? (
        <>
          <Card data-testid="study-answer" className={result.ok ? 'bg-ok/15' : 'bg-bad/10'}>
            <p className="text-sm font-semibold">{result.ok ? 'Correct' : result.reason === 'final-letter' ? 'Only a final letter is wrong' : 'Not quite'}</p>
            <div className="flex flex-col items-end">
              <Pointed>{form.pointed}</Pointed>
              <HebrewText size="sm" className="text-ink-muted">({form.plain})</HebrewText>
            </div>
          </Card>
          <Button data-testid="practice-next" onClick={() => { setI(i + 1); setTyped(''); setResult(null) }}>{i + 1 < qs.length ? 'Next' : 'Finish'}</Button>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button data-testid="answer-check" onClick={() => check(typed)}>Check</Button>
          <Button variant="secondary" onClick={() => check('')}>Show</Button>
        </div>
      )}
    </div>
  )
}

export function WhichPractice({ verbs, tenses, today }: { verbs: Verb[]; tenses: Tense[]; today: string }) {
  const recordCell = useProgress((s) => s.recordCell)
  const [seed, setSeed] = useState(0)
  const qs = useMemo(() => questions(verbs, tenses, 10), [verbs, tenses, seed])
  const [i, setI] = useState(0)
  const [pick, setPick] = useState<{ tense: Tense; cell: string } | null>(null)
  const [right, setRight] = useState(0)
  const q = qs[i]
  if (!qs.length) return <p className="py-8 text-center text-ink-muted">No forms for this selection.</p>
  if (!q) return <Summary right={right} total={qs.length} onAgain={() => { setSeed(seed + 1); setI(0); setRight(0); setPick(null) }} />
  const form = q.verb.forms[q.tense]![q.cell]!
  const askTense = tenses.length > 1
  /** right when the chosen cell holds the same form (future אתה and היא share one) */
  const isRight = (t: Tense, cell: string) => t === q.tense && q.verb.forms[t]?.[cell]?.plain === form.plain
  function choose(t: Tense, cell: string) {
    const ok = isRight(t, cell)
    setPick({ tense: t, cell })
    recordCell(`${q!.verb.id}:${q!.tense}:${q!.cell}`, ok, today)
    if (ok) setRight(right + 1)
  }
  const options = (askTense ? tenses : [q.tense]).flatMap((t) => {
    const seen = new Set<string>()
    return GRID_COLUMNS[t].filter((c) => q.verb.forms[t]?.[c.cell] && !seen.has(c.cell) && seen.add(c.cell)).map((c) => ({ t, cell: c.cell, label: c.label }))
  })
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-muted">{i + 1} / {qs.length}</span>
      </div>
      <Card className="flex flex-col items-end gap-1">
        <span className="text-xs text-ink-muted">which form is this?</span>
        <HebrewText size="xl" className="font-bold" data-testid="study-prompt">{form.pointed}</HebrewText>
        <HebrewText size="sm" className="text-ink-muted">{q.verb.infinitive.pointed}</HebrewText>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const chosen = pick && pick.tense === o.t && pick.cell === o.cell
          const tone = !pick ? 'bg-surface-2' : isRight(o.t, o.cell) ? 'bg-ok/40' : chosen ? 'bg-bad/40' : 'bg-surface-2 opacity-60'
          return (
            <button key={`${o.t}:${o.cell}`} type="button" disabled={!!pick} onClick={() => choose(o.t, o.cell)} className={`flex min-h-12 flex-col items-center justify-center rounded-2xl px-2 py-1 ${tone}`}>
              <HebrewText size="sm" className="font-semibold">{o.label}</HebrewText>
              {askTense ? <span className="text-[11px] text-ink-muted">{TENSE_LABELS[o.t].en}</span> : null}
            </button>
          )
        })}
      </div>
      {pick ? <Button data-testid="practice-next" onClick={() => { setI(i + 1); setPick(null) }}>{i + 1 < qs.length ? 'Next' : 'Finish'}</Button> : null}
    </div>
  )
}
