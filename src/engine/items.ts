// Turns the content bundle into schedule items and applies the tense focus. Progress is keyed by item id, and
// a verb's grid has one id per tense (`grid:<verbId>:<tense>`), so turning a tense off only hides its items —
// nothing is deleted — and turning it back on finds the same progress.
import { GRID_COLUMNS, TENSES, type BookId, type Bundle, type Tense, type Verb } from '../content/schema'
import { interleaveByCluster, isDue, type ProgressMap, type SchedItem } from './scheduler'

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

/** The first half of an interleaving key: a main-book unit (`u4`) or another book (`workbook`). */
const groupKey = (r: { book: BookId; unit: number | null }): string => (r.unit ? `u${r.unit}` : r.book)

export function itemsFromBundle(b: Bundle): SchedItem[] {
  const out: SchedItem[] = []
  b.vocab.forEach((v, i) => out.push({ id: vocabItemId(v.id), kind: 'vocab', book: v.book, unit: v.unit, cluster: `${groupKey(v)}:${v.pos}`, order: i }))
  b.verbs.forEach((v, i) => {
    for (const tense of TENSES) {
      const cells = v.forms[tense]
      if (cells && Object.keys(cells).length) out.push({ id: gridItemId(v.id, tense), kind: 'grid', book: v.book, unit: v.unit, cluster: `${v.binyan}:${tense}`, order: i, tenses: [tense] })
    }
  })
  b.exercises.forEach((e, i) => {
    const tagged = e.items.filter((it) => it.tense)
    const tenses = tagged.length === e.items.length ? [...new Set(tagged.map((it) => it.tense!))] : undefined
    out.push({ id: exerciseItemId(e.id), kind: 'exercise', book: e.book, unit: e.unit, cluster: `${groupKey(e)}:ex`, order: i, ...(tenses ? { tenses } : {}) })
  })
  b.prepositions.forEach((p, i) => out.push({ id: prepItemId(p.id), kind: 'prep', book: p.book, unit: p.unit, cluster: 'prep', order: i }))
  return out
}

/** The schedule items of a grammar topic: its exercises, the grids of its verbs, and the word cards of its verbs
 * (a workbook topic is studied as one unit: words, tables, exercises). */
export function topicItemIds(topic: { verbIds: string[]; exerciseIds: string[] }, vocab: { id: string; verbId?: string }[]): Set<string> {
  const verbs = new Set(topic.verbIds)
  const ids = new Set<string>(topic.exerciseIds.map(exerciseItemId))
  for (const v of vocab) if (v.verbId && verbs.has(v.verbId)) ids.add(vocabItemId(v.id))
  return ids
}
export const isTopicItem = (item: SchedItem, ids: Set<string>, verbIds: Set<string>): boolean => ids.has(item.id) || (item.kind === 'grid' && verbIds.has(item.id.split(':')[1] ?? ''))

/** Keeps items with no tense (vocabulary, prepositions, untagged exercises) and items drilling at least one
 * tense in the focus. */
export function filterByFocus(items: SchedItem[], focus: Tense[]): SchedItem[] {
  return items.filter((it) => !it.tenses || it.tenses.some((t) => focus.includes(t)))
}

/** One single-cell question: a verb, a tense, the cell and the pronoun shown for it. */
export interface CellQuestion {
  verb: Verb
  tense: Tense
  cell: string
  label: string
}

/** The distinct cells of one verb × tense, in the teacher's column order (future אתם and אתן share a cell). */
export function cellQuestions(verb: Verb, tense: Tense): CellQuestion[] {
  const cells = verb.forms[tense]
  if (!cells) return []
  const seen = new Set<string>()
  const out: CellQuestion[] = []
  for (const col of GRID_COLUMNS[tense]) {
    if (!cells[col.cell] || seen.has(col.cell)) continue
    seen.add(col.cell)
    out.push({ verb, tense, cell: col.cell, label: col.label })
  }
  return out
}

/** Per-cell right/wrong counts, keyed `verbId:tense:cell` (see the progress store). */
export type CellStatsMap = Record<string, { right: number; wrong: number }>

/** The «mixed cells» phase of Today: single cells drawn across the verbs, binyanim and tenses already in rotation, so
 * forms are retrieved out of their table (interleaving). Only grids in box ≥ 2 that are not due and were not
 * reviewed today qualify — a grid drilled a minute ago would be massed practice. Each round takes at most one cell
 * per verb; inside a verb the cells that failed before come first. The answers go to the cell stats only and never
 * grade the grid. */
export function buildMixedCells(items: SchedItem[], verbById: Record<string, Verb>, progress: ProgressMap, cellStats: CellStatsMap, today: string, n: number, rand: () => number): CellQuestion[] {
  if (n <= 0) return []
  const perVerb = new Map<string, { q: CellQuestion; score: number }[]>()
  for (const it of items) {
    const p = progress[it.id]
    const parsed = parseItemId(it.id)
    if (it.kind !== 'grid' || !p || p.box < 2 || isDue(p, today) || p.lastReviewed === today || parsed?.kind !== 'grid') continue
    const verb = verbById[parsed.ref]
    if (!verb) continue
    const list = perVerb.get(verb.id) ?? []
    for (const q of cellQuestions(verb, parsed.tense)) {
      const s = cellStats[`${verb.id}:${q.tense}:${q.cell}`]
      const failed = s && s.wrong > 0 ? 1 + s.wrong / (s.wrong + s.right) : 0
      list.push({ q, score: failed + rand() * 0.5 })
    }
    perVerb.set(verb.id, list)
  }
  for (const list of perVerb.values()) list.sort((a, b) => b.score - a.score)
  const out: CellQuestion[] = []
  for (let round = 0; out.length < n; round++) {
    const picks = [...perVerb.values()].map((l) => l[round]).filter((x): x is NonNullable<typeof x> => !!x)
    if (!picks.length) break
    picks.sort((a, b) => b.score - a.score)
    const mixed = interleaveByCluster(picks.map((x) => ({ ...x, cluster: `${x.q.verb.binyan}:${x.q.tense}` })))
    out.push(...mixed.map((x) => x.q))
  }
  return out.slice(0, n)
}

/** Tenses that have any content in the bundle, with counts — the picker shows only these. */
export function tenseCounts(items: SchedItem[]): Partial<Record<Tense, number>> {
  const out: Partial<Record<Tense, number>> = {}
  for (const it of items) for (const t of it.tenses ?? []) out[t] = (out[t] ?? 0) + 1
  return out
}
