import { Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { POS_LABELS, type VocabEntry } from '../../content/schema'
import { hebrewVoice, speakHebrew } from '../../content/audio'
import { checkAnswer, type CheckResult } from '../../engine/answer'
import type { Grade } from '../../engine/scheduler'
import { Badge, Button, Card, DraftNote, GradeBar, Pages } from '../components'
import { AnswerInput, HebrewText, Pointed } from '../hebrew'

export type VocabDirection = 'he-ru' | 'ru-he'

function Speak({ text }: { text: string }) {
  const [has] = useState(() => !!hebrewVoice())
  if (!has) return null
  return (
    <button type="button" aria-label="Pronounce" onClick={() => speakHebrew(text)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sage-strong active:opacity-70">
      <Volume2 size={20} />
    </button>
  )
}

function Details({ e }: { e: VocabEntry }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
      <Badge>{POS_LABELS[e.pos]}</Badge>
      {e.gender ? <Badge tone="mist">{e.gender === 'm' ? 'masc.' : 'fem.'}{e.plural === 'only' ? ' pl.' : ''}</Badge> : null}
      {e.government ? <span>+ <HebrewText size="sm">{e.government}</HebrewText></span> : null}
      <Pages pages={e.sources.map((s) => s.page)} />
    </div>
  )
}

export function VocabDrill({ entry, direction, onDone }: { entry: VocabEntry; direction: VocabDirection; onDone: (g: Grade) => void }) {
  const [revealed, setRevealed] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const answerForm = useMemo(() => ({ ...entry.lemma, variants: [...(entry.lemma.variants ?? []), ...(entry.present ? [entry.present.plain, entry.present.pointed] : [])] }), [entry])

  if (direction === 'he-ru')
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Details e={entry} />
        <Card className="flex items-center justify-between gap-3">
          <Speak text={entry.lemma.plain} />
          <HebrewText size="xl" className="font-bold" data-testid="study-prompt">{entry.he}</HebrewText>
        </Card>
        {revealed ? (
          <>
            <Card data-testid="study-answer">
              <p className="text-xl font-semibold">{entry.ru}</p>
              {entry.en ? <p className="text-sm text-ink-muted">{entry.en} <span className="text-xs">(added gloss, not from the book)</span></p> : null}
            </Card>
            <DraftNote status={entry.reviewStatus} flags={entry.flags} />
            <GradeBar onGrade={onDone} />
          </>
        ) : (
          <Button data-testid="study-reveal" onClick={() => setRevealed(true)}>Show meaning</Button>
        )}
      </div>
    )

  const state = result ? (result.ok ? 'ok' : 'wrong') : 'idle'
  return (
    <div className="flex flex-col gap-3 pt-2">
      <Details e={entry} />
      <Card>
        <p data-testid="study-prompt" className="text-xl font-semibold">{entry.ru}</p>
        <p className="mt-1 text-sm text-ink-muted">{entry.pos === 'verb' ? 'Type the infinitive (the present form is accepted too).' : 'Type the Hebrew.'}</p>
      </Card>
      <AnswerInput data-testid="answer-input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onSubmit={() => !result && setResult(checkAnswer(typed, answerForm))} state={state} readOnly={!!result} placeholder="עברית" />
      {result ? (
        <>
          <Card data-testid="study-answer" className={result.ok ? 'bg-ok/15' : 'bg-bad/10'}>
            <p className="text-sm font-semibold">{result.ok ? 'Correct' : result.reason === 'final-letter' ? 'Only a final letter is wrong (כ/ך מ/ם נ/ן פ/ף צ/ץ)' : result.reason === 'empty' ? 'Nothing typed' : 'Not quite'}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <Speak text={entry.lemma.plain} />
              <div className="flex flex-col items-end">
                <HebrewText size="xl" className="font-bold">{entry.he}</HebrewText>
                {entry.lemma.plain !== entry.lemma.pointed ? <HebrewText size="sm" className="text-ink-muted">({entry.lemma.plain})</HebrewText> : null}
              </div>
            </div>
          </Card>
          <DraftNote status={entry.reviewStatus} flags={entry.flags} />
          <GradeBar onGrade={onDone} allow={result.ok ? ['hard', 'good'] : result.reason === 'final-letter' ? ['again', 'hard'] : ['again']} />
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button data-testid="answer-check" onClick={() => setResult(checkAnswer(typed, answerForm))}>Check</Button>
          <Button data-testid="study-reveal" variant="secondary" onClick={() => setResult(checkAnswer('', answerForm))}>Show</Button>
        </div>
      )}
    </div>
  )
}

export { Pointed }
