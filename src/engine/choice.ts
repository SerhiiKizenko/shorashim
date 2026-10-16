// Options for a 4-choice vocabulary card (recognition: Hebrew → pick the meaning). Pure; the caller passes the
// random source, so tests can fix it.
import type { VocabEntry } from '../content/schema'

/** Fisher–Yates: every order equally likely. */
export function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** The right gloss and up to `n` wrong ones, shuffled. Wrong glosses are drawn from the closest neighbours first —
 * same unit and part of speech (a noun among nouns of the same page is the hard, useful choice), then the same part
 * of speech, then the same unit, then anything — and never repeat the right gloss. */
export function choiceOptions(entry: VocabEntry, pool: VocabEntry[], rand: () => number, n = 3): string[] {
  const tiers: ((v: VocabEntry) => boolean)[] = [(v) => v.unit === entry.unit && v.pos === entry.pos, (v) => v.pos === entry.pos, (v) => v.unit === entry.unit, () => true]
  const taken = new Set([entry.ru])
  const wrong: string[] = []
  for (const tier of tiers) {
    for (const v of shuffle(pool.filter((v) => v.id !== entry.id && tier(v)), rand)) {
      if (wrong.length >= n) break
      if (taken.has(v.ru)) continue
      taken.add(v.ru)
      wrong.push(v.ru)
    }
    if (wrong.length >= n) break
  }
  return shuffle([entry.ru, ...wrong], rand)
}
