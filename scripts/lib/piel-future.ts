// The book's own pattern (p.54, אֲסַפֵּר … יְסַפְּרוּ) applied to a regular pi'el infinitive, as data for the
// paradigm records. The app never conjugates; this runs in the pipeline, and every cell it produces stays
// `draft` with the verb flagged `generated` until it is checked against a printed form (G3).
//   prefix: אֲ (אני) · תְּ (אתה, את, אתם, היא) · יְ (הוא, הם) · נְ (אנחנו) — the teacher's rule: shva everywhere
//   except אני; suffix ־ִי (את) and ־וּ (אתם-אתן, הם-הן) turn the stem's tsere into a shva (תְּדַבְּרִי).
import type { HebrewForm } from '../../src/content/schema'

const SHVA = 'ְ'
const HATAF_PATAH = 'ֲ'
const HIRIQ = 'ִ'
const TSERE = 'ֵ'
const DAGESH = 'ּ'
const FINAL_TO_BASE: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }
const MARKS = '[֑-ׇ]*'
const HAS_POINTS = /[ְ-ׇ]/

export type PielFutureCells = Record<'ani' | 'ata' | 'at' | 'anachnu' | 'atem' | 'hu' | 'hi' | 'hem', HebrewForm>

/** The infinitive without its ל (and the ל's own shva): לְדַבֵּר → דַבֵּר, לדבר → דבר. */
function stemOf(inf: HebrewForm): { pointed: string; plain: string } {
  const pointed = inf.pointed.normalize('NFC').replace(new RegExp(`^ל${MARKS}`), '')
  const plain = inf.plain.replace(/^ל/, '')
  if (!pointed || !plain) throw new Error(`not an infinitive: ${inf.plain}`)
  return { pointed, plain }
}

const defin = (s: string): string => s.replace(new RegExp(`[ךםןףץ](?=${MARKS}$)`), (c) => FINAL_TO_BASE[c] ?? c)

/** Before a suffix the last tsere opens into a shva and a final letter becomes medial. */
function openStem(stem: { pointed: string; plain: string }): { pointed: string; plain: string } {
  const i = stem.pointed.lastIndexOf(TSERE)
  const pointed = i >= 0 ? stem.pointed.slice(0, i) + SHVA + stem.pointed.slice(i + 1) : stem.pointed
  return { pointed: defin(pointed), plain: defin(stem.plain) }
}

function pointedPielFuture(infinitive: HebrewForm): PielFutureCells {
  const stem = stemOf(infinitive)
  const open = openStem(stem)
  const form = (prefix: string, prefixPlain: string, s = stem, suffix = '', suffixPlain = ''): HebrewForm => ({
    pointed: (prefix + s.pointed + suffix).normalize('NFC'),
    plain: prefixPlain + s.plain + suffixPlain,
  })
  const tav = 'ת' + DAGESH + SHVA
  return {
    ani: form('א' + HATAF_PATAH, 'א'),
    ata: form(tav, 'ת'),
    at: form(tav, 'ת', open, HIRIQ + 'י', 'י'),
    anachnu: form('נ' + SHVA, 'נ'),
    atem: form(tav, 'ת', open, 'ו' + DAGESH, 'ו'),
    hu: form('י' + SHVA, 'י'),
    hi: form(tav, 'ת'),
    hem: form('י' + SHVA, 'י', open, 'ו' + DAGESH, 'ו'),
  }
}

export function pielFuture(infinitive: HebrewForm): PielFutureCells {
  const cells = pointedPielFuture(infinitive)
  if (HAS_POINTS.test(infinitive.pointed)) return cells
  // an unpointed infinitive (p.54 lists the verbs without points) yields unpointed cells; the points come later
  return Object.fromEntries(Object.entries(cells).map(([k, f]) => [k, { pointed: f.plain, plain: f.plain }])) as PielFutureCells
}
