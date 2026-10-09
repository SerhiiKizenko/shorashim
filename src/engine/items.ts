// Turns the content bundle into schedule items and applies the tense focus. Progress is keyed by item id, and
// a verb's grid has one id per tense (`grid:<verbId>:<tense>`), so turning a tense off only hides its items —
// nothing is deleted — and turning it back on finds the same progress.
import { TENSES, type Bundle, type Tense } from '../content/schema'
import type { SchedItem } from './scheduler'

export const vocabItemId = (vocabId: string) => `vocab:${vocabId}`
export const gridItemId = (verbId: string, tense: Tense) => `grid:${verbId}:${tense}`
export const exerciseItemId = (exerciseId: string) => `ex:${exerciseId}`
export const prepItemId = (prepId: string) => `prep:${prepId}`

export type ParsedItemId = { kind: 'vocab'; ref: string } | { kind: 'grid'; ref: string; tense: Tense } | { kind: 'exercise'; ref: string } | { kind: 'prep'; ref: string }

export function parseItemId(id: string): ParsedItemId | null {
  const [kind, ...rest] = id.split(':')
  if (kind === 'vocab' && rest.length === 1) return { kind, ref: rest[0]! }
  if (kind === 'ex' && rest.length === 1) return { kind: 'exercise', ref: rest[0]! }
  if (kind === 'prep' && rest.length === 1) return { kind, ref: rest[0]! }
  if (kind === 'grid' && rest.length === 2 && (TENSES as readonly string[]).includes(rest[1]!)) return { kind, ref: rest[0]!, tense: rest[1] as Tense }
  return null
}

export function itemsFromBundle(b: Bundle): SchedItem[] {
  const out: SchedItem[] = []
  b.vocab.forEach((v, i) => out.push({ id: vocabItemId(v.id), kind: 'vocab', unit: v.unit, cluster: `u${v.unit}:${v.pos}`, order: i }))
  b.verbs.forEach((v, i) => {
    for (const tense of TENSES) {
      const cells = v.forms[tense]
      if (cells && Object.keys(cells).length) out.push({ id: gridItemId(v.id, tense), kind: 'grid', unit: v.unit, cluster: `${v.binyan}:${tense}`, order: i, tenses: [tense] })
    }
  })
  b.exercises.forEach((e, i) => {
    const tagged = e.items.filter((it) => it.tense)
    const tenses = tagged.length === e.items.length ? [...new Set(tagged.map((it) => it.tense!))] : undefined
    out.push({ id: exerciseItemId(e.id), kind: 'exercise', unit: e.unit, cluster: `u${e.unit}:ex`, order: i, ...(tenses ? { tenses } : {}) })
  })
  b.prepositions.forEach((p, i) => out.push({ id: prepItemId(p.id), kind: 'prep', unit: p.unit, cluster: 'prep', order: i }))
  return out
}

/** Keeps items with no tense (vocabulary, prepositions, untagged exercises) and items drilling at least one
 * tense in the focus. */
export function filterByFocus(items: SchedItem[], focus: Tense[]): SchedItem[] {
  return items.filter((it) => !it.tenses || it.tenses.some((t) => focus.includes(t)))
}

/** Tenses that have any content in the bundle, with counts — the picker shows only these. */
export function tenseCounts(items: SchedItem[]): Partial<Record<Tense, number>> {
  const out: Partial<Record<Tense, number>> = {}
  for (const it of items) for (const t of it.tenses ?? []) out[t] = (out[t] ?? 0) + 1
  return out
}
