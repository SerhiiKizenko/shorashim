// Plain-spelling (ktiv male) paradigms from a root, for the binyanim the workbook prints as tables: pi'el, hif'il,
// hitpa'el. Pattern as data, used by the importer to fill cells the pages do not print; every generated cell is
// flagged `generated` until the teacher confirms it. Only the plain form is generated (the answer checker ignores
// vowel points); `pointed` = `plain`. Roots this cannot do safely (weak roots, a ד/ט/ת first radical in hitpa'el)
// get nothing, so the verb simply stays partial.
import type { Binyan, RootGroup, Tense } from '../../src/content/schema'

const BASE: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }
const FINAL: Record<string, string> = { כ: 'ך', מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' }

/** «ד.ב.ר» → ['ד','ב','ר'] (marks and dots dropped, final letters as base letters). */
export function rootLetters(root: string): string[] {
  return [...root.normalize('NFC').replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '')].map((c) => BASE[c] ?? c)
}

/** A word ends in a final letter; inside the word every letter is a base letter. */
export const finalize = (w: string): string => {
  const chars = [...w].map((c) => BASE[c] ?? c)
  const last = chars.length - 1
  if (last >= 0 && FINAL[chars[last]!]) chars[last] = FINAL[chars[last]!]!
  return chars.join('')
}

/** stem + suffix with the assimilations Hebrew writes: a stem ending in ת before a ת-suffix (שֵׁרַתִּי → שירתי), a stem
 * ending in נ before ־נו (נִגַּנּוּ → ניגנו). */
function join(stem: string, suffix: string): string {
  const last = stem.at(-1)
  if (last === 'ת' && suffix.startsWith('ת')) return finalize(stem + suffix.slice(1))
  if (last === 'נ' && suffix === 'נו') return finalize(stem + suffix.slice(1))
  return finalize(stem + suffix)
}

type Cells = Record<string, string>
export interface PlainParadigm {
  infinitive: string
  forms: Partial<Record<Tense, Cells>>
  verbalNoun?: string
  /** other accepted spellings per `tense.cell` (and `verbalNoun`), e.g. the ktiv haser of a pi'el past */
  variants: Record<string, string[]>
  /** why the verbal noun is not the regular pattern, when an exception was used */
  verbalNounNote?: string
}

const PAST_SUFFIX: Record<string, string> = { ani: 'תי', ata: 'ת', at: 'ת', anachnu: 'נו', atem: 'תם', aten: 'תן' }
const FUTURE_PREFIX: Record<string, [string, string]> = { ani: ['א', ''], ata: ['ת', ''], at: ['ת', 'י'], hu: ['י', ''], hi: ['ת', ''], anachnu: ['נ', ''], atem: ['ת', 'ו'], hem: ['י', 'ו'] }
const PRESENT_SUFFIX: Record<string, string> = { ms: '', fs: 'ת', mp: 'ים', fp: 'ות' }

/** Verbal nouns that do not follow the binyan's pattern (general Hebrew usage; confirm with the teacher). Keyed by
 * binyan + plain root letters. */
const VERBAL_NOUN_EXCEPTIONS: Record<string, string> = {
  'piel:שלמ': 'תשלום',
  'piel:נגנ': 'נגינה',
  'piel:קבל': 'קבלה',
  'piel:בקש': 'בקשה',
  'piel:פטר': 'פיטורים',
  'hifil:משכ': 'המשך',
  'hifil:סבר': 'הסבר',
  'hitpael:שמש': 'שימוש',
}
/** Pi'el roots whose usual verbal noun is not a קיטול form at all: no noun is generated. */
const NO_VERBAL_NOUN = new Set(['piel:מהר'])

/** Which binyan × root group combinations this generator covers. */
export function canGenerate(binyan: Binyan, group: RootGroup, root: string): boolean {
  const r = rootLetters(root)
  if (r.length !== 3) return false
  if (binyan === 'piel') return group === 'shlemim' || group === 'gutturals' || (group === 'ayin-yod' && r[1] === 'י')
  if (binyan === 'hifil') return group === 'shlemim' || group === 'gutturals'
  if (binyan === 'hitpael') return (group === 'shlemim' || group === 'gutturals' || (group === 'ayin-yod' && r[1] === 'י')) && !['ד', 'ט', 'ת'].includes(r[0]!)
  return false
}

export function generatePlain(binyan: Binyan, group: RootGroup, root: string): PlainParadigm | null {
  if (!canGenerate(binyan, group, root)) return null
  const [r1, r2, r3] = rootLetters(root) as [string, string, string]
  const key = `${binyan}:${r1}${r2}${r3}`
  const variants: Record<string, string[]> = {}
  const forms: Partial<Record<Tense, Cells>> = {}
  let verbalNoun: string | undefined
  let infinitive: string

  if (binyan === 'piel') {
    // a consonantal י as 2nd radical is written twice and takes no hirik-yod: טייל, מטייל, טיול
    const yod = r2 === 'י'
    const mid = yod ? 'יי' : r2
    const pastStem = yod ? `${r1}יי${r3}` : `${r1}י${r2}${r3}`
    const stem = `${r1}${mid}${r3}`
    forms.past = { hu: finalize(pastStem), hi: join(pastStem, 'ה'), hem: join(pastStem, 'ו') }
    for (const [c, s] of Object.entries(PAST_SUFFIX)) forms.past[c] = join(pastStem, s)
    if (!yod) for (const [c, f] of Object.entries(forms.past)) variants[`past.${c}`] = [f.replace(`${r1}י`, r1)] // ktiv haser: דברתי
    forms.present = Object.fromEntries(Object.entries(PRESENT_SUFFIX).map(([c, s]) => [c, join(`מ${stem}`, s)]))
    forms.future = Object.fromEntries(Object.entries(FUTURE_PREFIX).map(([c, [p, s]]) => [c, join(`${p}${stem}`, s)]))
    forms.imperative = { ata: finalize(stem), at: join(stem, 'י'), atem: join(stem, 'ו') }
    infinitive = finalize(`ל${stem}`)
    if (!NO_VERBAL_NOUN.has(key)) {
      verbalNoun = VERBAL_NOUN_EXCEPTIONS[key] ?? finalize(yod ? `${r1}יו${r3}` : `${r1}י${r2}ו${r3}`)
      if (!VERBAL_NOUN_EXCEPTIONS[key] && !yod) variants.verbalNoun = [finalize(`${r1}${r2}ו${r3}`)]
    }
  } else if (binyan === 'hifil') {
    const closed = `${r1}${r2}${r3}` // הפסקתי
    const open = `${r1}${r2}י${r3}` // הפסיק
    forms.past = { hu: finalize(`ה${open}`), hi: join(`ה${open}`, 'ה'), hem: join(`ה${open}`, 'ו') }
    for (const [c, s] of Object.entries(PAST_SUFFIX)) forms.past[c] = join(`ה${closed}`, s)
    forms.present = { ms: finalize(`מ${open}`), fs: join(`מ${open}`, 'ה'), mp: join(`מ${open}`, 'ים'), fp: join(`מ${open}`, 'ות') }
    forms.future = Object.fromEntries(Object.entries(FUTURE_PREFIX).map(([c, [p, s]]) => [c, join(`${p}${open}`, s)]))
    forms.imperative = { ata: finalize(`ה${closed}`), at: join(`ה${open}`, 'י'), atem: join(`ה${open}`, 'ו') }
    infinitive = finalize(`לה${open}`)
    verbalNoun = VERBAL_NOUN_EXCEPTIONS[key] ?? join(`ה${closed}`, 'ה')
  } else {
    // hitpa'el: the ת of the prefix swaps with a sibilant first radical (ס/ש → סת/שת, צ → צט, ז → זד)
    const pre = r1 === 'ס' || r1 === 'ש' ? `${r1}ת` : r1 === 'צ' ? 'צט' : r1 === 'ז' ? 'זד' : `ת${r1}`
    const stem = `${pre}${r2 === 'י' ? 'יי' : r2}${r3}`
    forms.past = { hu: finalize(`ה${stem}`), hi: join(`ה${stem}`, 'ה'), hem: join(`ה${stem}`, 'ו') }
    for (const [c, s] of Object.entries(PAST_SUFFIX)) forms.past[c] = join(`ה${stem}`, s)
    forms.present = Object.fromEntries(Object.entries(PRESENT_SUFFIX).map(([c, s]) => [c, join(`מ${stem}`, s)]))
    forms.future = Object.fromEntries(Object.entries(FUTURE_PREFIX).map(([c, [p, s]]) => [c, join(`${p}${stem}`, s)]))
    forms.imperative = { ata: finalize(`ה${stem}`), at: join(`ה${stem}`, 'י'), atem: join(`ה${stem}`, 'ו') }
    infinitive = finalize(`לה${stem}`)
    verbalNoun = VERBAL_NOUN_EXCEPTIONS[key] ?? join(`ה${stem}`, 'ות')
  }
  return {
    infinitive,
    forms,
    variants,
    ...(verbalNoun ? { verbalNoun } : {}),
    ...(VERBAL_NOUN_EXCEPTIONS[key] ? { verbalNounNote: `verbal noun ${VERBAL_NOUN_EXCEPTIONS[key]} is the usual noun, not the binyan's pattern (general usage)` } : {}),
  }
}
