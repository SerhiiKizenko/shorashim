import { useState } from 'react'
import { TENSE_LABELS, type Exercise, type ExerciseItem, type Tense } from '../../content/schema'
import { checkAgainstAnswers, type CheckResult } from '../../engine/answer'
import type { Grade } from '../../engine/scheduler'
import { useProgress } from '../../store/progress'
import { Badge, Button, Card, DraftNote, GradeBar, Pages } from '../components'
import { AnswerInput, HebrewText, Pointed } from '../hebrew'

/** Book exercise, item by item. Items tagged with a tense outside the focus are skipped (unless that leaves nothing). */
export function ExerciseDrill({ exercise, focus, today, onDone }: { exercise: Exercise; focus: Tense[]; today: string; onDone: (g: Grade) => void }) {
  const recordCell = useProgress((s) => s.recordCell)
  const [items] = useState<ExerciseItem[]>(() => {
    const inFocus = exercise.items.filter((it) => !it.tense || focus.includes(it.tense))
    return inFocus.length ? inFocus : exercise.items
  })
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [wrong, setWrong] = useState<string[]>([])
  const item = items[index]
  const finished = index >= items.length

  function check(input: string) {
    if (!item) return
    const r = checkAgainstAnswers(input, item.answers)
    setResult(r)
    recordCell(`${exercise.id}:${item.label}`, r.ok, today)
    if (!r.ok) setWrong((w) => [...w, item.label])
  }
  function next() {
    setIndex(index + 1)
    setTyped('')
    setResult(null)
    setRevealed(false)
  }

  const head = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="rose">Exercise {exercise.number}</Badge>
        <Pages pages={[exercise.page]} />
        <span className="text-xs text-ink-muted">{Math.min(index + 1, items.length)} / {items.length}</span>
      </div>
      <Card className="flex flex-col gap-1 py-4">
        <HebrewText size="md" className="font-semibold" block>{exercise.instructionHe}</HebrewText>
        <p className="text-sm text-ink-muted">{exercise.instructionEn}</p>
      </Card>
    </>
  )

  if (finished) {
    const g: Grade = wrong.length === 0 ? 'good' : wrong.length <= 2 ? 'hard' : 'again'
    return (
      <div className="flex flex-col gap-3 pt-2">
        {head}
        <Card data-testid="exercise-summary" className="flex flex-col gap-2">
          <p className="text-lg font-bold">{wrong.length === 0 ? 'All right' : `${items.length - wrong.length} of ${items.length} right`}</p>
          {wrong.length ? <p className="text-sm text-ink-muted">Wrong: {wrong.join(', ')}</p> : null}
        </Card>
        <DraftNote status={exercise.reviewStatus} flags={exercise.flags} />
        {exercise.gradable ? <Button data-testid="exercise-continue" onClick={() => onDone(g)}>Continue</Button> : <GradeBar onGrade={onDone} />}
      </div>
    )
  }
  if (!item) return null
  const state = result ? (result.ok ? 'ok' : 'wrong') : 'idle'
  const answer = item.answers[0] ?? ''
  const unanswered = answer === '?'
  return (
    <div className="flex flex-col gap-3 pt-2">
      {head}
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink-muted">{item.label}</span>
          {item.tense ? <Badge tone="mist">{TENSE_LABELS[item.tense].en}</Badge> : null}
        </div>
        <HebrewText size="lg" block data-testid="study-prompt">{item.prompt}</HebrewText>
        {item.hint ? (
          <p className="text-right text-sm text-ink-muted">
            <HebrewText size="sm">({item.hint})</HebrewText>
          </p>
        ) : null}
      </Card>
      {exercise.gradable && !unanswered ? (
        <>
          <AnswerInput data-testid="answer-input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onSubmit={() => !result && check(typed)} state={state} readOnly={!!result} placeholder="עברית" />
          {result ? (
            <>
              <Card data-testid="study-answer" className={result.ok ? 'bg-ok/15' : 'bg-bad/10'}>
                <p className="text-sm font-semibold">{result.ok ? 'Correct' : result.reason === 'final-letter' ? 'Only a final letter is wrong' : result.reason === 'empty' ? 'Nothing typed' : 'Not quite'}</p>
                <div className="mt-1 flex flex-col items-end">
                  <Pointed>{item.answerPointed ?? answer}</Pointed>
                  {item.answers.length > 1 ? <HebrewText size="sm" className="text-ink-muted">also: {item.answers.slice(1).join(' / ')}</HebrewText> : null}
                  {item.keyPage ? <span className="text-xs text-ink-muted">answer key p. {item.keyPage}</span> : null}
                </div>
              </Card>
              <Button data-testid="exercise-next" onClick={next}>{index + 1 < items.length ? 'Next' : 'Finish'}</Button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button data-testid="answer-check" onClick={() => check(typed)}>Check</Button>
              <Button data-testid="study-reveal" variant="secondary" onClick={() => check('')}>Show</Button>
            </div>
          )}
        </>
      ) : (
        <>
          {revealed ? (
            <Card data-testid="study-answer">
              {unanswered ? <p className="text-sm text-ink-muted">No answer in the key for this item yet.</p> : <Pointed>{item.answerPointed ?? answer}</Pointed>}
            </Card>
          ) : (
            <Button data-testid="study-reveal" variant="secondary" onClick={() => setRevealed(true)}>Show answer</Button>
          )}
          <Button data-testid="exercise-next" onClick={next}>{index + 1 < items.length ? 'Next' : 'Finish'}</Button>
        </>
      )}
    </div>
  )
}
