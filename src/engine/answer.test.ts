import { describe, expect, it } from 'vitest'
import { acceptedForms, checkAgainstAnswers, checkAnswer, hasNiqqud, normalizeHebrew, stripFinals } from './answer'

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
