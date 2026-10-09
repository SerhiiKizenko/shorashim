// The teacher's grid as a drill: the heading (infinitive, root) is given, the learner types every cell, one
// «Check» marks them all. Wrong cells show the printed form and are retried until right or given up. Rows are
// stacked (a phone cannot show eleven columns); the order is the teacher's.
import { useRef, useState, type ReactNode } from 'react'
import type { GridColumn, HebrewForm } from '../content/schema'
import { checkAnswer, type CheckResult } from '../engine/answer'
import { Button } from './components'
import { AnswerInput, HebrewText, Pointed } from './hebrew'

export interface GridOutcome {
  /** cells wrong on the first check (deduplicated) */
  firstTryWrong: string[]
  rounds: number
  gaveUp: boolean
}

export function ParadigmGrid({ heading, columns, cells, onCell, onFinished }: { heading: ReactNode; columns: GridColumn[]; cells: Record<string, HebrewForm>; onCell?: (cell: string, ok: boolean) => void; onFinished: (o: GridOutcome) => void }) {
  const [values, setValues] = useState<string[]>(() => columns.map(() => ''))
  const [results, setResults] = useState<(CheckResult | null)[]>(() => columns.map(() => null))
  const [round, setRound] = useState(0)
  const [firstTryWrong, setFirstTryWrong] = useState<string[]>([])
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const rows = columns.map((c, i) => ({ ...c, form: cells[c.cell], i })).filter((r): r is typeof r & { form: HebrewForm } => !!r.form)

  const allOk = rows.length > 0 && rows.every((r) => results[r.i]?.ok)
  const wrongCount = rows.filter((r) => results[r.i] && !results[r.i]!.ok).length

  function check() {
    const next = [...results]
    const wrongNow: string[] = []
    for (const r of rows) {
      if (results[r.i]?.ok) continue
      const res = checkAnswer(values[r.i] ?? '', r.form)
      next[r.i] = res
      if (round === 0) {
        onCell?.(r.cell, res.ok)
        if (!res.ok && !wrongNow.includes(r.cell)) wrongNow.push(r.cell)
      }
    }
    if (round === 0) setFirstTryWrong(wrongNow)
    setResults(next)
    setRound(round + 1)
    const firstWrong = rows.find((r) => next[r.i] && !next[r.i]!.ok)
    if (firstWrong) inputs.current[firstWrong.i]?.focus()
  }

  function setValue(i: number, v: string) {
    setValues((vs) => vs.map((x, k) => (k === i ? v : x)))
    if (results[i] && !results[i]!.ok) setResults((rs) => rs.map((x, k) => (k === i ? null : x)))
  }

  function submitRow(i: number) {
    const after = rows.find((r) => r.i > i && !results[r.i]?.ok)
    if (after) inputs.current[after.i]?.focus()
    else check()
  }

  return (
    <div className="flex flex-col gap-3">
      {heading}
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const res = results[r.i]
          const state = res ? (res.ok ? 'ok' : 'wrong') : 'idle'
          return (
            <div key={r.i} className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <label htmlFor={`cell-${r.i}`} className="w-24 shrink-0 text-right">
                  <HebrewText size="sm" className="font-semibold">{r.label}</HebrewText>
                </label>
                <AnswerInput
                  id={`cell-${r.i}`}
                  data-testid={`grid-cell-${r.i}`}
                  ref={(el) => {
                    inputs.current[r.i] = el
                  }}
                  value={values[r.i] ?? ''}
                  onChange={(e) => setValue(r.i, e.target.value)}
                  onSubmit={() => submitRow(r.i)}
                  state={state}
                  readOnly={!!res?.ok}
                  enterKeyHint={r === rows[rows.length - 1] ? 'done' : 'next'}
                />
              </div>
              {res && !res.ok ? (
                <p data-testid={`grid-feedback-${r.i}`} className="pl-[6.75rem] text-sm text-ink-muted">
                  {res.reason === 'final-letter' ? 'Only a final letter is wrong · ' : res.reason === 'empty' ? 'Empty · ' : ''}
                  <Pointed>{r.form.pointed}</Pointed> <HebrewText size="sm">({r.form.plain})</HebrewText>
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
      {allOk ? (
        <div className="flex flex-col gap-2">
          <p data-testid="grid-result" className="rounded-2xl bg-ok/20 px-4 py-2 text-sm font-semibold">
            {firstTryWrong.length === 0 ? 'All cells right.' : `All right now — ${firstTryWrong.length} ${firstTryWrong.length === 1 ? 'cell was' : 'cells were'} wrong at first.`}
          </p>
          <Button data-testid="grid-continue" onClick={() => onFinished({ firstTryWrong, rounds: round, gaveUp: false })}>Continue</Button>
        </div>
      ) : round === 0 ? (
        <Button data-testid="grid-check" onClick={check}>Check</Button>
      ) : (
        <div className="flex flex-col gap-2">
          <p data-testid="grid-result" className="rounded-2xl bg-bad/15 px-4 py-2 text-sm">
            {wrongCount} {wrongCount === 1 ? 'cell is' : 'cells are'} wrong — the printed form is shown under each. Fix them and check again.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button data-testid="grid-check" onClick={check}>Check again</Button>
            <Button data-testid="grid-finish" variant="secondary" onClick={() => onFinished({ firstTryWrong, rounds: round, gaveUp: true })}>Finish anyway</Button>
          </div>
        </div>
      )}
    </div>
  )
}
