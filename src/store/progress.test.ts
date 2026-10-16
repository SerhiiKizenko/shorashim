import { beforeEach, describe, expect, it } from 'vitest'

// zustand/persist wants a localStorage; a tiny in-memory one is enough for the store logic.
const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size
  },
} as Storage

const { useProgress, DEFAULT_SETTINGS, BackupSchema, makeBackup, mergePersisted } = await import('./progress')
const T = '2026-10-09'

describe('progress store', () => {
  beforeEach(() => {
    useProgress.getState().resetProgress()
    useProgress.getState().setSettings(DEFAULT_SETTINGS)
  })

  it('defaults to Future only and 10 new items a day', () => {
    expect(DEFAULT_SETTINGS.tenseFocus).toEqual(['future'])
    expect(DEFAULT_SETTINGS.newPerDay).toBe(10)
  })

  it('changing the tense focus never touches progress (off, then on again)', () => {
    const id = 'grid:v-dbr-piel:future'
    useProgress.getState().grade(id, 'good', T)
    const before = structuredClone(useProgress.getState().progress[id])
    useProgress.getState().setTenseFocus(['past'])
    expect(useProgress.getState().settings.tenseFocus).toEqual(['past'])
    expect(useProgress.getState().progress[id]).toEqual(before)
    useProgress.getState().setTenseFocus(['future', 'past'])
    expect(useProgress.getState().progress[id]).toEqual(before)
    useProgress.getState().setSettings({ tenseFocus: [] })
    expect(useProgress.getState().progress[id]).toEqual(before)
  })

  it('records per-cell results and keeps the streak', () => {
    useProgress.getState().recordCell('v-dbr-piel:future:at', false, T)
    useProgress.getState().recordCell('v-dbr-piel:future:at', true, T)
    expect(useProgress.getState().cellStats['v-dbr-piel:future:at']).toEqual({ right: 1, wrong: 1, last: T })
    useProgress.getState().grade('vocab:u01-v001', 'good', T)
    useProgress.getState().grade('vocab:u01-v002', 'good', '2026-10-10')
    expect(useProgress.getState().stats.streak).toBe(2)
  })

  it('backup round-trips through the schema', () => {
    useProgress.getState().grade('vocab:u01-v001', 'hard', T)
    const b = BackupSchema.parse(JSON.parse(JSON.stringify(makeBackup(useProgress.getState()))))
    expect(b.app).toBe('shorashim')
    expect(b.progress['vocab:u01-v001']!.box).toBe(1)
    expect(b.settings.tenseFocus).toEqual(['future'])
  })
})

describe('review log and backward compatibility', () => {
  beforeEach(() => {
    useProgress.getState().resetProgress()
    useProgress.getState().setSettings(DEFAULT_SETTINGS)
  })

  it('logs every persisted grade, with the mistake class when there is one', () => {
    useProgress.getState().grade('vocab:u01-v001', 'good', T)
    useProgress.getState().grade('vocab:u01-v002', 'again', T, 'vowel-letter')
    expect(useProgress.getState().reviews).toEqual([
      ['vocab:u01-v001', T, 'good'],
      ['vocab:u01-v002', T, 'again', 'vowel-letter'],
    ])
    useProgress.getState().resetProgress()
    expect(useProgress.getState().reviews).toEqual([])
  })

  it('a backup written before the log and the new settings existed still restores, with defaults', () => {
    const old = {
      app: 'shorashim',
      version: 1,
      exportedAt: '2026-10-10T08:00:00.000Z',
      progress: { 'vocab:u01-v001': { box: 2, due: '2026-10-11', introduced: '2026-10-10', lastReviewed: '2026-10-10', lastGrade: 'good', reps: 1, lapses: 0 } },
      settings: { tenseFocus: ['future'], newPerDay: 10, theme: 'auto', onboarded: true },
      stats: { streak: 1, lastStudyDate: '2026-10-10', totalReviews: 1 },
    }
    const b = BackupSchema.parse(old)
    expect(b.reviews).toEqual([])
    expect(b.cellStats).toEqual({})
    expect(b.settings).toMatchObject({ reviewsPerDay: 100, mixedCells: 10 })
    expect(b.settings.anchor).toBeUndefined()
    useProgress.getState().importBackup(b)
    expect(useProgress.getState().settings.reviewsPerDay).toBe(100)
    expect(BackupSchema.parse(JSON.parse(JSON.stringify(makeBackup(useProgress.getState())))).reviews).toEqual([])
  })

  it('a stored state from before the new settings gets them filled in on load (persist merge)', () => {
    const stored = { settings: { tenseFocus: ['past'], newPerDay: 3, theme: 'dark', onboarded: true } }
    const merged = mergePersisted(stored, useProgress.getState())
    expect(merged.settings).toMatchObject({ tenseFocus: ['past'], newPerDay: 3, theme: 'dark', reviewsPerDay: 100, mixedCells: 10 })
    expect(merged.reviews).toEqual([])
    expect(typeof merged.grade).toBe('function')
  })
})
