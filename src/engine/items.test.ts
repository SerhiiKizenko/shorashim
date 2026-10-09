import { describe, expect, it } from 'vitest'
import { BundleSchema, EMPTY_BUNDLE, type Bundle } from '../content/schema'
import { filterByFocus, gridItemId, itemsFromBundle, parseItemId, tenseCounts } from './items'
import { addDays, applyGrade, buildTodayQueue, type ProgressMap } from './scheduler'

const T = '2026-10-09'
const f = (pointed: string, plain: string) => ({ pointed, plain })
const bundle: Bundle = BundleSchema.parse({
  ...EMPTY_BUNDLE,
  vocab: [
    { id: 'u01-v001', unit: 1, pos: 'verb', he: 'מַבְטִיחַ — לְהַבְטִיחַ ל-', lemma: f('לְהַבְטִיחַ', 'להבטיח'), present: f('מַבְטִיחַ', 'מבטיח'), government: 'ל-', ru: 'обещать', sources: [{ page: 8 }], reviewStatus: 'draft' },
    { id: 'u01-v002', unit: 1, pos: 'noun', he: 'סֶרֶט ז', lemma: f('סֶרֶט', 'סרט'), gender: 'm', ru: 'фильм', sources: [{ page: 8 }], reviewStatus: 'draft' },
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
  ],
  prepositions: [{ id: 'prep-im', unit: 1, preposition: f('עִם', 'עם'), ru: 'с', cells: { ani: f('אִתִּי', 'איתי') }, sources: [{ page: 16 }], reviewStatus: 'draft' }],
})

describe('itemsFromBundle', () => {
  it('makes one item per vocab entry, per verb × tense with forms, per exercise, per preposition paradigm', () => {
    expect(itemsFromBundle(bundle).map((i) => i.id)).toEqual(['vocab:u01-v001', 'vocab:u01-v002', 'grid:v-dbr-piel:future', 'grid:v-dbr-piel:past', 'ex:u04-ex2.1', 'ex:u04-ex2.2', 'ex:u04-ex2.3', 'prep:prep-im'])
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
    expect(tenseCounts(itemsFromBundle(bundle))).toEqual({ future: 3, past: 2 })
  })
})

describe('tense focus', () => {
  const items = itemsFromBundle(bundle)
  it('keeps vocabulary and untagged items, filters grids and tagged exercises by tense', () => {
    expect(filterByFocus(items, ['future']).map((i) => i.id)).toEqual(['vocab:u01-v001', 'vocab:u01-v002', 'grid:v-dbr-piel:future', 'ex:u04-ex2.1', 'ex:u04-ex2.2', 'ex:u04-ex2.3', 'prep:prep-im'])
    expect(filterByFocus(items, ['past']).map((i) => i.id)).toEqual(['vocab:u01-v001', 'vocab:u01-v002', 'grid:v-dbr-piel:past', 'ex:u04-ex2.2', 'ex:u04-ex2.3', 'prep:prep-im'])
    expect(filterByFocus(items, []).map((i) => i.id)).toEqual(['vocab:u01-v001', 'vocab:u01-v002', 'ex:u04-ex2.3', 'prep:prep-im'])
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
