import { describe, expect, it } from 'vitest'
import { BundleSchema, EMPTY_BUNDLE, type VocabEntry } from '../content/schema'
import { choiceOptions, shuffle } from './choice'

const f = (pointed: string, plain: string) => ({ pointed, plain })
const v = (id: string, unit: number, pos: VocabEntry['pos'], ru: string) => ({ id, unit, pos, he: id, lemma: f('א', 'א'), ru, sources: [{ page: 8 }], reviewStatus: 'draft' as const })
const vocab = BundleSchema.parse({
  ...EMPTY_BUNDLE,
  vocab: [v('u01-v001', 1, 'noun', 'книга'), v('u01-v002', 1, 'noun', 'дом'), v('u01-v003', 1, 'noun', 'стол'), v('u01-v004', 1, 'verb', 'писать'), v('u02-v001', 2, 'noun', 'город'), v('u02-v002', 2, 'noun', 'книга'), v('u02-v003', 2, 'adverb', 'всегда')],
}).vocab
const fixed = () => 0.5

describe('choiceOptions', () => {
  it('holds the right gloss and three wrong ones, never a duplicate of the right one', () => {
    const opts = choiceOptions(vocab[0]!, vocab, fixed)
    expect(opts).toHaveLength(4)
    expect(opts).toContain('книга')
    expect(new Set(opts).size).toBe(4)
  })
  it('takes neighbours first: the same unit and part of speech, then the same part of speech', () => {
    const opts = choiceOptions(vocab[0]!, vocab, fixed)
    expect(opts).toEqual(expect.arrayContaining(['дом', 'стол', 'город']))
    expect(opts).not.toContain('писать')
  })
  it('returns fewer options when the pool is small', () => {
    expect(choiceOptions(vocab[0]!, vocab.slice(0, 2), fixed).sort()).toEqual(['дом', 'книга'])
  })
  it('shuffle keeps every element', () => {
    expect(shuffle([1, 2, 3, 4], Math.random).sort()).toEqual([1, 2, 3, 4])
  })
})
