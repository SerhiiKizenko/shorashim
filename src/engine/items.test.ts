import { describe, expect, it } from 'vitest'
import { BundleSchema, EMPTY_BUNDLE, type Bundle } from '../content/schema'
import { buildMixedCells, filterByFocus, gridItemId, itemsFromBundle, modelGridQueue, modelVerbs, parseItemId, tenseCounts } from './items'
import { addDays, applyGrade, buildTodayQueue, type ProgressMap } from './scheduler'

const T = '2026-10-09'
const f = (pointed: string, plain: string) => ({ pointed, plain })
const bundle: Bundle = BundleSchema.parse({
  ...EMPTY_BUNDLE,
  vocab: [
    { id: 'u01-v001', unit: 1, pos: 'verb', he: 'מַבְטִיחַ — לְהַבְטִיחַ ל-', lemma: f('לְהַבְטִיחַ', 'להבטיח'), present: f('מַבְטִיחַ', 'מבטיח'), government: 'ל-', ru: 'обещать', sources: [{ page: 8 }], reviewStatus: 'draft' },
    { id: 'u01-v002', unit: 1, pos: 'noun', he: 'סֶרֶט ז', lemma: f('סֶרֶט', 'סרט'), gender: 'm', ru: 'фильм', sources: [{ page: 8 }], reviewStatus: 'draft' },
    // a workbook verb's entry: no unit, the book named, the id derived from the verb id
    { id: 'wb-v-dbr-piel', book: 'workbook', unit: null, pos: 'verb', he: 'לדבר', lemma: f('לְדַבֵּר', 'לדבר'), ru: 'говорить', verbId: 'v-dbr-piel', sources: [{ book: 'workbook', page: 40 }], reviewStatus: 'draft', flags: ['unsupported'] },
  ],
  verbs: [
    {
      id: 'v-dbr-piel', unit: 4, infinitive: f('לְדַבֵּר', 'לדבר'), root: 'ד.ב.ר', binyan: 'piel', group: 'shlemim', ru: 'говорить', sources: [{ page: 54 }], reviewStatus: 'draft',
      forms: { future: { ani: f('אֲדַבֵּר', 'אדבר'), ata: f('תְּדַבֵּר', 'תדבר') }, past: { hu: f('דִּבֵּר', 'דיבר') } },
    },
  ],
  exercises: [
    { id: 'u04-ex2.1', unit: 4, page: 55, number: '2.1', instructionHe: 'כתוב בעתיד', instructionEn: 'Rewrite in the future', kind: 'transform', gradable: true, sources: [{ page: 55 }], reviewStatus: 'draft', items: [{ label: 'א', prompt: 'x', tense: 'future', answers: ['y'] }] },
    { id: 'u04-ex2.2', unit: 4, page: 55, number: '2.2', instructionHe: 'כתוב', instructionEn: 'Fill', kind: 'fill', gradable: true, sources: [{ page: 55 }], reviewStatus: 'draft', items: [{ label: 'א', prompt: 'x', tense: 'past', answers: ['y'] }, { label: 'ב', prompt: 'x', tense: 'future', answers: ['y'] }] },
    { id: 'u04-ex2.3', unit: 4, page: 55, number: '2.3', instructionHe: 'ענה', instructionEn: 'Answer', kind: 'questions', gradable: false, sources: [{ page: 55 }], reviewStatus: 'draft', items: [{ label: 'א', prompt: 'x', answers: ['y'] }] },
    // a workbook «sort into the table» exercise: the item shows a form and names what it is
    { id: 'wb-ex40.3', book: 'workbook', unit: null, page: 41, number: '40.3', instructionHe: 'שבצו את הפעלים האלה בטבלה', instructionEn: 'Place these verbs in the table', kind: 'identify', gradable: true, sources: [{ book: 'workbook', page: 41 }], reviewStatus: 'draft', items: [{ label: '1', prompt: 'דיבר', tense: 'past', answers: ['דיבר'], target: { verbId: 'v-dbr-piel', tense: 'past', cells: ['hu'] } }] },
  ],
  prepositions: [{ id: 'prep-im', unit: 1, preposition: f('עִם', 'עם'), ru: 'с', cells: { ani: f('אִתִּי', 'איתי') }, sources: [{ page: 16 }], reviewStatus: 'draft' }],
})

describe('itemsFromBundle', () => {
  it('makes one item per vocab entry, per verb × tense with forms, per exercise, per preposition paradigm', () => {
    expect(itemsFromBundle(bundle).map((i) => i.id)).toEqual(['vocab:u01-v001', 'vocab:u01-v002', 'vocab:wb-v-dbr-piel', 'grid:v-dbr-piel:future', 'grid:v-dbr-piel:past', 'ex:u04-ex2.1', 'ex:u04-ex2.2', 'ex:u04-ex2.3', 'ex:wb-ex40.3', 'prep:prep-im'])
  })
  it('records without a book default to the main book; workbook items carry their book and group by it', () => {
    expect(bundle.vocab[0]!.book).toBe('sheat-bet')
    expect(bundle.vocab[0]!.sources[0]!.book).toBe('sheat-bet')
    const by = Object.fromEntries(itemsFromBundle(bundle).map((i) => [i.id, i]))
    expect(by['vocab:u01-v001']).toMatchObject({ book: 'sheat-bet', unit: 1, cluster: 'u1:verb' })
    expect(by['vocab:wb-v-dbr-piel']).toMatchObject({ book: 'workbook', unit: null, cluster: 'workbook:verb' })
    expect(by['ex:wb-ex40.3']).toMatchObject({ book: 'workbook', unit: null, cluster: 'workbook:ex', tenses: ['past'] })
  })
  it('tags grids with their tense and exercises with the tenses of their items', () => {
    const by = Object.fromEntries(itemsFromBundle(bundle).map((i) => [i.id, i]))
    expect(by['grid:v-dbr-piel:future']!.tenses).toEqual(['future'])
    expect(by['ex:u04-ex2.2']!.tenses).toEqual(['past', 'future'])
    expect(by['ex:u04-ex2.3']!.tenses).toBeUndefined()
    expect(by['vocab:u01-v001']!.tenses).toBeUndefined()
  })
  it('parses item ids back', () => {
    expect(parseItemId('grid:v-dbr-piel:future')).toEqual({ kind: 'grid', ref: 'v-dbr-piel', tense: 'future' })
    expect(parseItemId('ex:u04-ex2.1')).toEqual({ kind: 'exercise', ref: 'u04-ex2.1' })
    expect(parseItemId('grid:v-dbr-piel:nope')).toBeNull()
  })
  it('counts content per tense for the picker', () => {
    expect(tenseCounts(itemsFromBundle(bundle))).toEqual({ future: 3, past: 3 })
  })
})

describe('tense focus', () => {
  const items = itemsFromBundle(bundle)
  it('keeps vocabulary and untagged items, filters grids and tagged exercises by tense', () => {
    expect(filterByFocus(items, ['future']).map((i) => i.id)).toEqual(['vocab:u01-v001', 'vocab:u01-v002', 'vocab:wb-v-dbr-piel', 'grid:v-dbr-piel:future', 'ex:u04-ex2.1', 'ex:u04-ex2.2', 'ex:u04-ex2.3', 'prep:prep-im'])
    expect(filterByFocus(items, ['past']).map((i) => i.id)).toEqual(['vocab:u01-v001', 'vocab:u01-v002', 'vocab:wb-v-dbr-piel', 'grid:v-dbr-piel:past', 'ex:u04-ex2.2', 'ex:u04-ex2.3', 'ex:wb-ex40.3', 'prep:prep-im'])
    expect(filterByFocus(items, []).map((i) => i.id)).toEqual(['vocab:u01-v001', 'vocab:u01-v002', 'vocab:wb-v-dbr-piel', 'ex:u04-ex2.3', 'prep:prep-im'])
  })
  it('turning a tense off and on again keeps that tense’s progress', () => {
    const id = gridItemId('v-dbr-piel', 'future')
    const progress: ProgressMap = { [id]: applyGrade(undefined, 'good', T) }
    const before = structuredClone(progress[id])
    // focus off: the grid is not in any queue, and the progress map is untouched
    const pastOnly = buildTodayQueue({ items: filterByFocus(items, ['past']), progress, today: addDays(T, 1), newLimit: 10 })
    expect(pastOnly).not.toContain(id)
    expect(progress[id]).toEqual(before)
    // focus on: the same item is due tomorrow with the same progress entry
    const futureAgain = buildTodayQueue({ items: filterByFocus(items, ['future']), progress, today: addDays(T, 1), newLimit: 10 })
    expect(futureAgain[0]).toBe(id)
    expect(progress[id]).toEqual(before)
    expect(progress[id]!.box).toBe(2)
  })
})

describe('buildMixedCells (interleaved single cells for Today)', () => {
  const T2 = '2026-10-16'
  const verbs = BundleSchema.parse({
    ...EMPTY_BUNDLE,
    verbs: [
      { id: 'v-dbr-piel', unit: 4, infinitive: f('לְדַבֵּר', 'לדבר'), root: 'ד.ב.ר', binyan: 'piel', group: 'shlemim', sources: [{ page: 54 }], reviewStatus: 'draft', forms: { future: { ani: f('אֲדַבֵּר', 'אדבר'), ata: f('תְּדַבֵּר', 'תדבר'), at: f('תְּדַבְּרִי', 'תדברי'), atem: f('תְּדַבְּרוּ', 'תדברו') } } },
      { id: 'v-ktb-paal', unit: 1, infinitive: f('לִכְתּוֹב', 'לכתוב'), root: 'כ.ת.ב', binyan: 'paal', group: 'shlemim', sources: [{ page: 8 }], reviewStatus: 'draft', forms: { future: { ani: f('אֶכְתּוֹב', 'אכתוב'), hu: f('יִכְתּוֹב', 'יכתוב') }, past: { hu: f('כָּתַב', 'כתב') } } },
    ],
  })
  const b = { ...verbs }
  const items = itemsFromBundle(b)
  const verbById = Object.fromEntries(b.verbs.map((v) => [v.id, v]))
  const rested = (box: 1 | 2 | 3, lastReviewed = '2026-10-12') => ({ box, due: addDays(T2, 3), introduced: '2026-10-01', lastReviewed, lastGrade: 'good' as const, reps: 2, lapses: 0 })

  it('takes grids in box ≥ 2 that are neither due nor reviewed today; one cell per verb per round', () => {
    const progress: ProgressMap = { 'grid:v-dbr-piel:future': rested(3), 'grid:v-ktb-paal:future': rested(2), 'grid:v-ktb-paal:past': rested(2) }
    const qs = buildMixedCells(items, verbById, progress, {}, T2, 2, () => 0.5)
    expect(qs.map((q) => q.verb.id).sort()).toEqual(['v-dbr-piel', 'v-ktb-paal'])
    expect(buildMixedCells(items, verbById, progress, {}, T2, 99, () => 0.5)).toHaveLength(4 + 2 + 1)
  })
  it('skips box 1, due grids and grids reviewed today', () => {
    const progress: ProgressMap = {
      'grid:v-dbr-piel:future': rested(1),
      'grid:v-ktb-paal:future': { ...rested(3), due: T2 },
      'grid:v-ktb-paal:past': rested(3, T2),
    }
    expect(buildMixedCells(items, verbById, progress, {}, T2, 10, () => 0.5)).toEqual([])
  })
  it('puts cells that failed before first, and n = 0 turns the phase off', () => {
    const progress: ProgressMap = { 'grid:v-dbr-piel:future': rested(3) }
    const stats = { 'v-dbr-piel:future:atem': { right: 1, wrong: 3 } }
    expect(buildMixedCells(items, verbById, progress, stats, T2, 1, () => 0.9)[0]).toMatchObject({ cell: 'atem', label: 'אתם' })
    expect(buildMixedCells(items, verbById, progress, stats, T2, 0, () => 0.9)).toEqual([])
  })
})

describe('model verbs', () => {
  // three model verbs listed out of binyan order, one ordinary verb; general Hebrew forms, one cell each is enough
  const verb = (id: string, binyan: string, model: boolean, forms: Record<string, Record<string, ReturnType<typeof f>>>) => ({ id, unit: null, book: 'pealim', infinitive: f('x', 'x'), root: 'א.ב.ג', binyan, group: 'shlemim', sources: [{ book: 'pealim', page: 1 }], reviewStatus: 'draft', forms, ...(model ? { model: true } : {}) })
  const b: Bundle = BundleSchema.parse({
    ...EMPTY_BUNDLE,
    verbs: [
      verb('v-kns-nifal', 'nifal', true, { past: { ani: f('נִכְנַסְתִּי', 'נכנסתי') }, future: { ani: f('אֶכָּנֵס', 'אכנס') } }),
      verb('v-dbr-piel', 'piel', true, { past: { ani: f('דִּבַּרְתִּי', 'דיברתי') } }),
      verb('v-ktb-paal', 'paal', false, { past: { ani: f('כָּתַבְתִּי', 'כתבתי') } }),
      verb('v-lbsh-hitpael', 'hitpael', true, { past: { ani: f('הִתְלַבַּשְׁתִּי', 'התלבשתי') }, future: { ani: f('אֶתְלַבֵּשׁ', 'אתלבש') } }),
    ],
  })

  it('lists only the model verbs, in binyan order', () => {
    expect(modelVerbs(b.verbs).map((v) => v.id)).toEqual(['v-dbr-piel', 'v-lbsh-hitpael', 'v-kns-nifal'])
  })

  it('a session is one tense across the model verbs; a verb without that tense is left out', () => {
    expect(modelGridQueue(b.verbs, 'past')).toEqual(['grid:v-dbr-piel:past', 'grid:v-lbsh-hitpael:past', 'grid:v-kns-nifal:past'])
    expect(modelGridQueue(b.verbs, 'future')).toEqual(['grid:v-lbsh-hitpael:future', 'grid:v-kns-nifal:future'])
    expect(modelGridQueue(b.verbs, 'imperative')).toEqual([])
  })

  it('uses the ordinary grid items, whatever the tense focus — so the progress is the one «Today» keeps', () => {
    const ids = new Set(itemsFromBundle(b).map((i) => i.id))
    for (const id of modelGridQueue(b.verbs, 'past')) expect(ids.has(id)).toBe(true)
    expect(filterByFocus(itemsFromBundle(b), ['future']).some((i) => i.id === 'grid:v-dbr-piel:past')).toBe(false)
  })
})
