// Typed-answer checking for Hebrew. Pure functions, no I/O. Niqqud is never required: the learner's input and
// every accepted form go through the same normalisation, then compare as strings. A slip that only confuses a
// final letter (כ/ך, מ/ם, נ/ן, פ/ף, צ/ץ) is still wrong, but reported separately so the feedback can say why.
import type { HebrewForm } from '../content/schema'

/** Cantillation marks, vowel points, dagesh and the shin/sin dots (U+0591–U+05C7). Maqaf (U+05BE) is inside
 * this range, so it is turned into a hyphen first. */
const MARKS = /[֑-ׇ]/g
const FINAL_TO_BASE: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }

/** NFKC (composes, and also unfolds the FB1D–FB4F presentation forms that pasted PDF text carries) → maqaf
 * and dash variants → "-" → geresh/gershayim and curly quotes → ASCII → strip marks → one space → trim
 * punctuation at both ends (so «ל-» and «ל» match). */
export function normalizeHebrew(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/־/g, '-')
    .replace(/[‐-―−]/g, '-')
    .replace(/[׳‘’`´]/g, "'")
    .replace(/[״“”]/g, '"')
    .replace(MARKS, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '')
}

/** Final letters mapped to their base form, for the final-letter diagnosis only. */
export const stripFinals = (s: string): string => s.replace(/[ךםןףץ]/g, (c) => FINAL_TO_BASE[c] ?? c)

export const hasNiqqud = (s: string): boolean => /[ְ-ׇ]/.test(s)

export type AnswerForm = Pick<HebrewForm, 'plain' | 'variants'> & { pointed?: string }

/** Everything that counts as correct: the plain spelling, the pointed form with its marks stripped, and the
 * listed variants — all normalised, de-duplicated, in that order. */
export function acceptedForms(form: AnswerForm): string[] {
  const out: string[] = []
  for (const f of [form.plain, form.pointed ?? '', ...(form.variants ?? [])]) {
    const n = normalizeHebrew(f)
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

export type CheckReason = 'empty' | 'final-letter' | 'wrong'
export interface CheckResult {
  ok: boolean
  reason?: CheckReason
  /** the normalised input */
  typed: string
  /** the canonical answer to show: the plain spelling */
  expected: string
  accepted: string[]
}

export function checkAnswer(input: string, form: AnswerForm): CheckResult {
  const typed = normalizeHebrew(input)
  const accepted = acceptedForms(form)
  const expected = normalizeHebrew(form.plain)
  if (!typed) return { ok: false, reason: 'empty', typed, expected, accepted }
  if (accepted.includes(typed)) return { ok: true, typed, expected, accepted }
  if (accepted.some((a) => stripFinals(a) === stripFinals(typed))) return { ok: false, reason: 'final-letter', typed, expected, accepted }
  return { ok: false, reason: 'wrong', typed, expected, accepted }
}

/** Convenience for answer-key strings (exercises): any of `answers` counts. */
export function checkAgainstAnswers(input: string, answers: string[]): CheckResult {
  const [first = '', ...rest] = answers
  return checkAnswer(input, { plain: first, variants: rest })
}
