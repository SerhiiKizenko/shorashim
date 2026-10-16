import { describe, expect, it } from 'vitest'
import { acceptedForms, alignHebrew, checkAgainstAnswers, checkAnswer, classifyError, editDistance, hasNiqqud, normalizeHebrew, stripFinals } from './answer'

const at = { pointed: 'תְּדַבְּרִי', plain: 'תדברי' } // את, future of לדבר (teacher's sheet / p.54 pattern)
const huPast = { pointed: 'דִּבֵּר', plain: 'דיבר' } // הוא, past

describe('normalizeHebrew', () => {
  it('strips vowel points, dagesh and shin/sin dots', () => {
    expect(normalizeHebrew('לְהַבְטִיחַ')).toBe('להבטיח')
    expect(normalizeHebrew('אֲדַבֵּר')).toBe('אדבר')
    expect(normalizeHebrew('שָׁלוֹם')).toBe('שלום')
  })
  it('treats marks in any order alike (a keyboard may emit shin-dot and kamatz in either order)', () => {
    const a = 'שָׁלוֹם' // shin dot, then kamatz
    const b = 'שָׁלוֹם' // kamatz, then shin dot
    expect(a).not.toBe(b)
    expect(normalizeHebrew(a)).toBe('שלום')
    expect(normalizeHebrew(b)).toBe(normalizeHebrew(a))
    expect(normalizeHebrew(a.normalize('NFD'))).toBe('שלום')
  })
  it('unfolds presentation forms (text pasted from a PDF)', () => {
    expect(normalizeHebrew('שׁלום')).toBe('שלום') // U+FB2A = shin with shin dot
    expect(normalizeHebrew('ﭏ')).toBe('אל') // alef-lamed ligature
  })
  it('keeps maqaf as a hyphen inside a phrase and trims it at the edges', () => {
    expect(normalizeHebrew('יוֹתֵר־מִכֹּל')).toBe('יותר-מכל')
    expect(normalizeHebrew('ל־')).toBe('ל')
    expect(normalizeHebrew('ל-')).toBe('ל')
  })
  it('collapses spaces and trims punctuation', () => {
    expect(normalizeHebrew('  תְּדַבְּרִי  . ')).toBe('תדברי')
    expect(normalizeHebrew('«מַבְטִיחַ»!')).toBe('מבטיח')
    expect(normalizeHebrew('יותר   מכל')).toBe('יותר מכל')
  })
  it('does not touch base letters, including final ones', () => {
    expect(normalizeHebrew('אֲנָשִׁים')).toBe('אנשים')
    expect(stripFinals('אנשים')).toBe('אנשימ')
  })
  it('hasNiqqud detects points but not plain text', () => {
    expect(hasNiqqud('תְּדַבְּרִי')).toBe(true)
    expect(hasNiqqud('תדברי')).toBe(false)
  })
})

describe('acceptedForms', () => {
  it('lists plain, stripped pointed and variants without duplicates', () => {
    expect(acceptedForms(huPast)).toEqual(['דיבר', 'דבר'])
    expect(acceptedForms(at)).toEqual(['תדברי'])
    expect(acceptedForms({ plain: 'טלפן', variants: ['טילפן', 'טלפן'] })).toEqual(['טלפן', 'טילפן'])
  })
})

describe('checkAnswer', () => {
  it('accepts the plain spelling and the pointed form (kickoff example: את + future)', () => {
    expect(checkAnswer('תדברי', at).ok).toBe(true)
    expect(checkAnswer('תְּדַבְּרִי', at).ok).toBe(true)
  })
  it('accepts ktiv male and the stripped pointed form (kickoff example: הוא + past)', () => {
    expect(checkAnswer('דיבר', huPast).ok).toBe(true)
    expect(checkAnswer('דבר', huPast).ok).toBe(true)
  })
  it('rejects another person’s form (תדברו for את) as wrong, showing the expected plain form', () => {
    const r = checkAnswer('תדברו', at)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('wrong')
    expect(r.expected).toBe('תדברי')
  })
  it('a mistake only in a final letter is wrong, but reported as final-letter', () => {
    expect(checkAnswer('אנשימ', { plain: 'אנשים' })).toMatchObject({ ok: false, reason: 'final-letter' })
    expect(checkAnswer('שלומ', { plain: 'שלום', pointed: 'שָׁלוֹם' })).toMatchObject({ ok: false, reason: 'final-letter' })
    expect(checkAnswer('לכעוס עלך', { plain: 'לכעוס על' })).toMatchObject({ ok: false, reason: 'wrong' })
  })
  it('an empty or marks-only input is reported as empty', () => {
    expect(checkAnswer('', at).reason).toBe('empty')
    expect(checkAnswer('  ְ ', at).reason).toBe('empty')
  })
  it('accepts a listed variant', () => {
    expect(checkAnswer('טילפן', { plain: 'טלפן', variants: ['טילפן'] }).ok).toBe(true)
  })
  it('checks against an answer-key list', () => {
    expect(checkAgainstAnswers('אספר', ['אספר', 'אני אספר']).ok).toBe(true)
    expect(checkAgainstAnswers('אני אספר', ['אספר', 'אני אספר']).ok).toBe(true)
    expect(checkAgainstAnswers('תספר', ['אספר']).reason).toBe('wrong')
  })
})

describe('classifyError (what kind of mistake)', () => {
  it('tells spelling slips apart', () => {
    expect(classifyError('ספרימ', 'ספרים')).toBe('final-letter')
    expect(classifyError('לכתב', 'לכתוב')).toBe('vowel-letter') // ktiv male: the holam vav is missing
    expect(classifyError('דבר', 'דיבר')).toBe('vowel-letter')
    expect(classifyError('לחתוב', 'לכתוב')).toBe('letter') // one letter swapped in the middle
  })
  it('names a wrong person prefix or ending — the verb-form mistakes', () => {
    expect(classifyError('תדבר', 'ידבר')).toBe('prefix') // אתה for הוא
    expect(classifyError('כתוב', 'לכתוב')).toBe('prefix') // the ל of the infinitive
    expect(classifyError('תדברו', 'תדברי')).toBe('ending') // אתם for את
    expect(classifyError('כתבתי', 'כתבנו')).toBe('ending')
  })
  it('falls back to other for a different word', () => {
    expect(classifyError('שולחן', 'כיסא')).toBe('other')
    expect(classifyError('אכתוב', 'יכתבו')).toBe('other') // both ends differ
  })
})

describe('checkAnswer diagnosis', () => {
  it('reports the closest accepted form and the class', () => {
    const r = checkAnswer('תדברו', at)
    expect(r).toMatchObject({ ok: false, reason: 'wrong', closest: 'תדברי', errorClass: 'ending' })
    expect(checkAnswer('דיברר', huPast)).toMatchObject({ closest: 'דיבר', errorClass: 'ending' })
    expect(checkAnswer('תדברי', at).errorClass).toBeUndefined()
    expect(checkAnswer('', at).errorClass).toBeUndefined()
  })
})

describe('alignHebrew / editDistance', () => {
  it('counts the fewest edits', () => {
    expect(editDistance('לכתב', 'לכתוב')).toBe(1)
    expect(editDistance('', 'אב')).toBe(2)
    expect(editDistance('אב', 'אב')).toBe(0)
  })
  it('reads along the expected form: same, missing, swapped, extra', () => {
    expect(alignHebrew('לכתב', 'לכתוב')).toEqual([
      { kind: 'same', ch: 'ל' },
      { kind: 'same', ch: 'כ' },
      { kind: 'same', ch: 'ת' },
      { kind: 'missing', ch: 'ו' },
      { kind: 'same', ch: 'ב' },
    ])
    expect(alignHebrew('תדברו', 'תדברי').at(-1)).toEqual({ kind: 'sub', ch: 'י', typed: 'ו' })
    expect(alignHebrew('ספרר', 'ספר').filter((o) => o.kind === 'extra')).toEqual([{ kind: 'extra', ch: 'ר' }])
  })
})
