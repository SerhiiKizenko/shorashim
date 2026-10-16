// Practice modes outside the scheduler: «One form» and «Build from root» (type single cells) and «Which form is
// this?» (multiple choice). They record per-cell results for Weak spots but never grade the grid item. The single-
// cell card is also the «mixed cells» phase of Today.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BINYAN_LABELS, GRID_COLUMNS, TENSE_LABELS, type Tense, type Verb } from '../../content/schema'
import { checkAnswer, type CheckResult } from '../../engine/answer'
import { shuffle } from '../../engine/choice'
import { cellQuestions, type CellQuestion } from '../../engine/items'
import { useProgress } from '../../store/progress'
import { Badge, Button, Card } from '../components'
import { AnswerInput, HebrewText, MistakeNote, Pointed } from '../hebrew'

/** One question per distinct cell of each verb × tense, shuffled, capped. */
function questions(verbs: Verb[], tenses: Tense[], cap: number, rand = Math.random): CellQuestion[] {
  return shuffle(
    verbs.flatMap((verb) => tenses.flatMap((tense) => cellQuestions(verb, tense))),
    rand,
  ).slice(0, cap)
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

/** What the single-cell card shows as its cue: the infinitive (one form), or only root + binyan + tense, so the form
 * has to be built from the pattern (build from root). */
export type CellPrompt = 'infinitive' | 'root'

/** One cell: the pronoun and the cue are shown, the learner types the form. Records the cell's result. */
export function CellCard({ q, prompt, today, onNext, last }: { q: CellQuestion; prompt: CellPrompt; today: string; onNext: (ok: boolean) => void; last: boolean }) {
  const recordCell = useProgress((s) => s.recordCell)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const form = q.verb.forms[q.tense]![q.cell]!
  function check(input: string) {
    if (result) return
    const r = checkAnswer(input, form)
    setResult(r)
    recordCell(`${q.verb.id}:${q.tense}:${q.cell}`, r.ok, today)
  }
  return (
    <div data-testid="cell-card" data-tense={q.tense} data-label={q.label} className="flex flex-col gap-3 pt-2">
      <div className="flex items-center gap-2">
        <Badge tone="lavender">{BINYAN_LABELS[q.verb.binyan].en}</Badge>
        <Badge tone="mist">{TENSE_LABELS[q.tense].en}</Badge>
      </div>
      <Card className="flex items-center justify-between gap-3">
        <HebrewText size="lg" className="font-semibold">{q.label}</HebrewText>
        {prompt === 'infinitive' ? (
          <div className="flex flex-col items-end">
            <span className="text-xs text-ink-muted">infinitive</span>
            <HebrewText size="lg" className="font-bold" data-testid="study-prompt">{q.verb.infinitive.pointed}</HebrewText>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-xs text-ink-muted">root · binyan · tense</span>
            <HebrewText size="lg" className="font-bold" data-testid="study-prompt">{q.verb.root}</HebrewText>
            <HebrewText size="sm" className="text-ink-muted">{BINYAN_LABELS[q.verb.binyan].he} · {TENSE_LABELS[q.tense].he}</HebrewText>
          </div>
        )}
      </Card>
      <AnswerInput data-testid="answer-input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onSubmit={() => check(typed)} state={result ? (result.ok ? 'ok' : 'wrong') : 'idle'} readOnly={!!result} placeholder="עברית" />
      {result ? (
        <>
          <Card data-testid="study-answer" className={`flex flex-col gap-2 ${result.ok ? 'bg-ok/15' : 'bg-bad/10'}`}>
            <p className="text-sm font-semibold">{result.ok ? 'Correct' : result.reason === 'empty' ? 'The form' : 'Not quite'}</p>
            <div className="flex flex-col items-end">
              <Pointed>{form.pointed}</Pointed>
              <HebrewText size="sm" className="text-ink-muted">({form.plain})</HebrewText>
              {prompt === 'root' ? <HebrewText size="sm" className="text-ink-muted">{q.verb.infinitive.pointed}</HebrewText> : null}
            </div>
            <MistakeNote result={result} diff />
          </Card>
          <Button data-testid="practice-next" onClick={() => onNext(result.ok)}>{last ? 'Finish' : 'Next'}</Button>
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

export function FormsPractice({ verbs, tenses, today, prompt = 'infinitive' }: { verbs: Verb[]; tenses: Tense[]; today: string; prompt?: CellPrompt }) {
  const [seed, setSeed] = useState(0)
  const qs = useMemo(() => questions(verbs, tenses, 10), [verbs, tenses, seed])
  const [i, setI] = useState(0)
  const [right, setRight] = useState(0)
  const q = qs[i]
  if (!qs.length) return <p className="py-8 text-center text-ink-muted">No forms for this selection.</p>
  if (!q) return <Summary right={right} total={qs.length} onAgain={() => { setSeed(seed + 1); setI(0); setRight(0) }} />
  return (
    <>
      <p className="pt-2 text-xs text-ink-muted">{i + 1} / {qs.length}</p>
      <CellCard
        key={`${seed}:${i}`}
        q={q}
        prompt={prompt}
        today={today}
        last={i + 1 >= qs.length}
        onNext={(ok) => {
          if (ok) setRight(right + 1)
          setI(i + 1)
        }}
      />
    </>
  )
}

export function WhichPractice({ verbs, tenses, today }: { verbs: Verb[]; tenses: Tense[]; today: string }) {
  const recordCell = useProgress((s) => s.recordCell)
  const [seed, setSeed] = useState(0)
  const qs = useMemo(() => questions(verbs, tenses, 10), [verbs, tenses, seed])
  const [i, setI] = useState(0)
  const [pick, setPick] = useState<{ tense: Tense; cell: string } | null>(null)
  const [right, setRight] = useState(0)
  /** read the form with or without vowel points: unpointed is how Hebrew is printed outside textbooks */
  const [pointed, setPointed] = useState(true)
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
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-muted">{i + 1} / {qs.length}</span>
        <button type="button" data-testid="which-vowels" aria-pressed={pointed} onClick={() => setPointed(!pointed)} className="min-h-10 rounded-full bg-surface-2 px-3 text-sm font-semibold">
          Vowel points: {pointed ? 'on' : 'off'}
        </button>
      </div>
      <Card className="flex flex-col items-end gap-1">
        <span className="text-xs text-ink-muted">which form is this?</span>
        <HebrewText size="xl" className="font-bold" data-testid="study-prompt">{pointed ? form.pointed : form.plain}</HebrewText>
        <HebrewText size="sm" className="text-ink-muted">{pointed ? q.verb.infinitive.pointed : q.verb.infinitive.plain}</HebrewText>
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
      {pick ? (
        <>
          {!pointed ? <p className="text-right"><Pointed>{form.pointed}</Pointed></p> : null}
          <Button data-testid="practice-next" onClick={() => { setI(i + 1); setPick(null) }}>{i + 1 < qs.length ? 'Next' : 'Finish'}</Button>
        </>
      ) : null}
    </div>
  )
}
