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

const { useProgress, DEFAULT_SETTINGS, BackupSchema, makeBackup } = await import('./progress')
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
