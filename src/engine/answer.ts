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

// ---------------------------------------------------------------- what kind of mistake
/** The kinds of mistake a typed Hebrew answer can show, from the most superficial to «a different word». */
export const ERROR_CLASSES = ['final-letter', 'vowel-letter', 'letter', 'prefix', 'ending', 'other'] as const
export type ErrorClass = (typeof ERROR_CLASSES)[number]
/** `slip` = a spelling slip on a word you know; the others are a wrong form or a wrong word. */
export const ERROR_LABELS: Record<ErrorClass, { label: string; hint: string; slip: boolean }> = {
  'final-letter': { label: 'Final letter', hint: 'only a final form is wrong: כ/ך מ/ם נ/ן פ/ף צ/ץ', slip: true },
  'vowel-letter': { label: 'Vowel letter', hint: 'a ו or י added or missing (the everyday spelling)', slip: true },
  letter: { label: 'One letter', hint: 'one letter swapped, often a sound-alike: כ/ק ת/ט ס/ש א/ע ח/כ ב/ו', slip: true },
  prefix: { label: 'Beginning', hint: 'the first letters: the person prefix א ת י נ, the ל of the infinitive, ה, ו, ב…', slip: false },
  ending: { label: 'Ending', hint: 'the last letters: the person or number ending (־י, ־ו, ־ה, ־ים, ־ות…)', slip: false },
  other: { label: 'Other', hint: 'a different form or word', slip: false },
}

const VOWEL_LETTERS = /^[וי]$/

/** Length of the common start and the common end of two strings; the end never overlaps the start. */
function commonEdges(a: string[], b: string[]): { pre: number; suf: number } {
  let pre = 0
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++
  let suf = 0
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++
  return { pre, suf }
}

/** Classifies a wrong answer against one accepted form; both already normalised (see normalizeHebrew). */
export function classifyError(typed: string, expected: string): ErrorClass {
  if (stripFinals(typed) === stripFinals(expected)) return 'final-letter'
  const t = stripFinals(typed)
  const e = stripFinals(expected)
  // Only an inserted or missing ו/י is a spelling slip; ו swapped for י (תדברו for תדברי) is a different ending.
  const edits = alignHebrew(t, e).filter((o) => o.kind !== 'same')
  if (edits.every((o) => (o.kind === 'missing' || o.kind === 'extra') && VOWEL_LETTERS.test(o.ch))) return 'vowel-letter'
  const a = [...t]
  const b = [...e]
  const { pre, suf } = commonEdges(a, b)
  // the stretch that differs, in each string
  const typedDiff = a.length - pre - suf
  const expectedDiff = b.length - pre - suf
  const small = Math.max(typedDiff, expectedDiff) <= 2
  if (small && pre === 0 && suf >= 2) return 'prefix'
  if (small && suf === 0 && pre >= 2) return 'ending'
  if (typedDiff === 1 && expectedDiff === 1) return 'letter'
  return 'other'
}

/** Levenshtein distance over code points: the fewest insertions, deletions and substitutions from a to b. */
export function editDistance(a: string, b: string): number {
  const x = [...a]
  const y = [...b]
  return alignTable(x, y)[x.length]![y.length]!
}

function alignTable(a: string[], b: string[]): number[][] {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d
}

/** One step of the alignment, read along the expected form: a letter both share, a letter typed in its place, a
 * letter of the answer that is missing, or a typed letter the answer does not have. */
export type DiffOp = { kind: 'same'; ch: string } | { kind: 'sub'; ch: string; typed: string } | { kind: 'missing'; ch: string } | { kind: 'extra'; ch: string }

/** Aligns the typed answer with the expected one (both normalised) for the feedback line. */
export function alignHebrew(typed: string, expected: string): DiffOp[] {
  const a = [...typed]
  const b = [...expected]
  const d = alignTable(a, b)
  const ops: DiffOp[] = []
  let i = a.length
  let j = b.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i]![j] === d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      ops.push(a[i - 1] === b[j - 1] ? { kind: 'same', ch: b[j - 1]! } : { kind: 'sub', ch: b[j - 1]!, typed: a[i - 1]! })
      i--
      j--
    } else if (j > 0 && d[i]![j] === d[i]![j - 1]! + 1) {
      ops.push({ kind: 'missing', ch: b[j - 1]! })
      j--
    } else {
      ops.push({ kind: 'extra', ch: a[i - 1]! })
      i--
    }
  }
  return ops.reverse()
}

// ---------------------------------------------------------------- checking
export type CheckReason = 'empty' | 'final-letter' | 'wrong'
export interface CheckResult {
  ok: boolean
  reason?: CheckReason
  /** the normalised input */
  typed: string
  /** the canonical answer to show: the plain spelling */
  expected: string
  accepted: string[]
  /** a wrong, non-empty answer: the accepted form it is closest to, and what kind of mistake it is */
  closest?: string
  errorClass?: ErrorClass
}

export function checkAnswer(input: string, form: AnswerForm): CheckResult {
  const typed = normalizeHebrew(input)
  const accepted = acceptedForms(form)
  const expected = normalizeHebrew(form.plain)
  if (!typed) return { ok: false, reason: 'empty', typed, expected, accepted }
  if (accepted.includes(typed)) return { ok: true, typed, expected, accepted }
  // Diagnose against the accepted spelling the learner was nearest to: a final-letter match wins, else the one at
  // the smallest edit distance (תדברו is nearer to תדברי than to any other accepted form).
  const closest = accepted.find((a) => stripFinals(a) === stripFinals(typed)) ?? accepted.reduce((best, a) => (editDistance(typed, a) < editDistance(typed, best) ? a : best), accepted[0] ?? expected)
  const errorClass = classifyError(typed, closest)
  return { ok: false, reason: errorClass === 'final-letter' ? 'final-letter' : 'wrong', typed, expected, accepted, closest, errorClass }
}

/** Convenience for answer-key strings (exercises): any of `answers` counts. */
export function checkAgainstAnswers(input: string, answers: string[]): CheckResult {
  const [first = '', ...rest] = answers
  return checkAnswer(input, { plain: first, variants: rest })
}
