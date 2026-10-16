import { Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { POS_LABELS, type VocabEntry } from '../../content/schema'
import { hebrewVoice, speakHebrew } from '../../content/audio'
import { checkAnswer, normalizeHebrew, type CheckResult, type ErrorClass } from '../../engine/answer'
import { choiceOptions } from '../../engine/choice'
import type { Grade, VocabMode } from '../../engine/scheduler'
import { Badge, Button, Card, DraftNote, GradeBar, Sources } from '../components'
import { AnswerInput, HebrewText, MistakeNote, Pointed } from '../hebrew'

/** From this box on, the answer is shown in everyday spelling first; the vowel points are one tap away. */
export const PLAIN_FROM_BOX = 4

/** Speaks the pointed form: niqqud tells the voice which reading is meant (an unpointed word can be ambiguous). */
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
      <Sources sources={e.sources} />
    </div>
  )
}

/** Recognition: the Hebrew is shown, the learner picks its meaning out of four. */
function ChoiceCard({ entry, pool, onDone }: { entry: VocabEntry; pool: VocabEntry[]; onDone: (g: Grade) => void }) {
  const [options] = useState(() => choiceOptions(entry, pool, Math.random))
  const [picked, setPicked] = useState<string | null>(null)
  const right = picked === entry.ru
  return (
    <div className="flex flex-col gap-3 pt-2">
      <Details e={entry} />
      <Card className="flex items-center justify-between gap-3">
        <Speak text={entry.lemma.pointed} />
        <HebrewText size="xl" className="font-bold" data-testid="study-prompt">{entry.he}</HebrewText>
      </Card>
      <p className="px-1 text-sm text-ink-muted">What does it mean?</p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((o, i) => {
          const tone = !picked ? 'bg-surface-2' : o === entry.ru ? 'bg-ok/40' : o === picked ? 'bg-bad/40' : 'bg-surface-2 opacity-60'
          return (
            <button key={o} type="button" data-testid={`choice-option-${i}`} disabled={!!picked} onClick={() => setPicked(o)} className={`min-h-12 rounded-2xl px-4 py-2 text-left text-base font-semibold ${tone}`}>
              {o}
            </button>
          )
        })}
      </div>
      {picked ? (
        <>
          <Card data-testid="study-answer" className={right ? 'bg-ok/15' : 'bg-bad/10'}>
            <p className="text-sm font-semibold">{right ? 'Correct' : 'Not this one'}</p>
            <p className="text-xl font-semibold">{entry.ru}</p>
            {entry.en ? <p className="text-sm text-ink-muted">{entry.en} <span className="text-xs">(added gloss, not from the book)</span></p> : null}
          </Card>
          <DraftNote status={entry.reviewStatus} flags={entry.flags} />
          <GradeBar onGrade={onDone} allow={right ? ['hard', 'good'] : ['again']} />
        </>
      ) : null}
    </div>
  )
}

/** The hint ladder: each «Hint» gives a little more, and the last rung shows the answer. A word for the root (verbs)
 * or the first letter, then the first half of the word, then the whole form. */
function hint(level: number, plain: string, root: string | undefined): { label: string; he: string } | null {
  if (level === 0) return null
  if (level === 1) return root ? { label: 'root', he: root } : { label: 'starts with', he: `${plain.slice(0, 1)}…` }
  return { label: 'starts with', he: `${plain.slice(0, Math.max(2, Math.ceil(plain.length / 2)))}…` }
}
const LAST_HINT = 2

/** Production: the meaning is shown, the learner types the Hebrew. */
function TypedCard({ entry, box, root, onDone }: { entry: VocabEntry; box: number; root?: string; onDone: (g: Grade, error?: ErrorClass) => void }) {
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [vowels, setVowels] = useState(box < PLAIN_FROM_BOX)
  const answerForm = useMemo(() => ({ ...entry.lemma, variants: [...(entry.lemma.variants ?? []), ...(entry.present ? [entry.present.plain, entry.present.pointed] : [])] }), [entry])
  const plain = normalizeHebrew(entry.lemma.plain)
  const check = (input: string) => !result && setResult(checkAnswer(input, answerForm))
  const state = result ? (result.ok ? 'ok' : 'wrong') : 'idle'
  // A hinted answer is not a free recall: right after a hint, only «Hard».
  const allow: Grade[] = !result ? [] : result.ok ? (hintLevel ? ['hard'] : ['hard', 'good']) : result.reason === 'final-letter' ? ['again', 'hard'] : ['again']
  const shown = hint(hintLevel, plain, root)

  return (
    <div className="flex flex-col gap-3 pt-2">
      <Details e={entry} />
      <Card>
        <p data-testid="study-prompt" className="text-xl font-semibold">{entry.ru}</p>
        <p className="mt-1 text-sm text-ink-muted">{entry.pos === 'verb' ? 'Type the infinitive (the present form is accepted too).' : 'Type the Hebrew.'}</p>
        {shown ? (
          <p data-testid="study-hint-text" className="mt-2 flex items-baseline justify-end gap-2 text-sm text-ink-muted">
            {shown.label} <HebrewText size="md" className="font-semibold text-ink">{shown.he}</HebrewText>
          </p>
        ) : null}
      </Card>
      <AnswerInput data-testid="answer-input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onSubmit={() => check(typed)} state={state} readOnly={!!result} placeholder="עברית" />
      {result ? (
        <>
          <Card data-testid="study-answer" className={`flex flex-col gap-2 ${result.ok ? 'bg-ok/15' : 'bg-bad/10'}`}>
            <p className="text-sm font-semibold">{result.ok ? (hintLevel ? 'Correct, with a hint' : 'Correct') : result.reason === 'empty' ? 'The answer' : 'Not quite'}</p>
            <div className="flex items-center justify-between gap-3">
              <Speak text={entry.lemma.pointed} />
              <div className="flex flex-col items-end">
                {vowels ? (
                  <>
                    <HebrewText size="xl" className="font-bold">{entry.he}</HebrewText>
                    {entry.lemma.plain !== entry.lemma.pointed ? <HebrewText size="sm" className="text-ink-muted">({entry.lemma.plain})</HebrewText> : null}
                  </>
                ) : (
                  <>
                    <HebrewText size="xl" className="font-bold">{entry.lemma.plain}</HebrewText>
                    <button type="button" data-testid="study-vowels" onClick={() => setVowels(true)} className="min-h-10 text-sm font-semibold text-sage-strong">
                      Show the vowel points
                    </button>
                  </>
                )}
              </div>
            </div>
            <MistakeNote result={result} diff />
          </Card>
          <DraftNote status={entry.reviewStatus} flags={entry.flags} />
          <GradeBar onGrade={(g) => onDone(g, result.errorClass)} allow={allow} />
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button data-testid="answer-check" onClick={() => check(typed)}>Check</Button>
          {hintLevel < LAST_HINT ? (
            <Button data-testid="study-hint" variant="secondary" onClick={() => setHintLevel(hintLevel + 1)}>Hint {hintLevel + 1}/{LAST_HINT + 1}</Button>
          ) : (
            <Button data-testid="study-reveal" variant="secondary" onClick={() => check('')}>Show</Button>
          )}
        </div>
      )}
    </div>
  )
}

/** One vocabulary card. `mode` and `box` come from the progress as it was when the session began, so a re-pass after
 * «Again» asks the same way as the first showing (see vocabMode). */
export function VocabDrill({ entry, mode, box, pool, root, onDone }: { entry: VocabEntry; mode: VocabMode; box: number; pool: VocabEntry[]; root?: string; onDone: (g: Grade, error?: ErrorClass) => void }) {
  // A 4-choice needs other words to choose from; with fewer than two options, type instead.
  if (mode === 'choice' && pool.some((v) => v.id !== entry.id && v.ru !== entry.ru)) return <ChoiceCard entry={entry} pool={pool} onDone={(g) => onDone(g)} />
  return <TypedCard entry={entry} box={box} root={root} onDone={onDone} />
}

export { Pointed }
