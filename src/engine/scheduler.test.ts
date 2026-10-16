import { describe, expect, it } from 'vitest'
import {
  addDays,
  applyGrade,
  BOX_INTERVAL_DAYS,
  buildExtraNewQueue,
  buildTodayQueue,
  buildTopicQueue,
  buildWeakQueue,
  clusterStats,
  countDue,
  currentCard,
  daysBetween,
  dueForecast,
  dueHistogram,
  fuzzWindow,
  gradeInSession,
  interleaveByCluster,
  isCatchUp,
  isDue,
  isFinished,
  isLeech,
  isWeak,
  MASTERED_BOX,
  newAllowance,
  shouldPersistGrade,
  spreadDue,
  startSession,
  vocabMode,
  type Box,
  type ItemProgress,
  type ProgressMap,
  type SchedItem,
} from './scheduler'

const T = '2026-10-09'
const item = (id: string, unit: number | null, cluster: string, order: number, kind: SchedItem['kind'] = 'vocab', book: SchedItem['book'] = 'sheat-bet'): SchedItem => ({ id, kind, book, unit, cluster, order })
const prog = (box: Box, due: string, extra: Partial<ItemProgress> = {}): ItemProgress => ({ box, due, introduced: T, lastReviewed: T, lastGrade: 'good', reps: 1, lapses: 0, ...extra })

describe('dates', () => {
  it('adds days and measures distance', () => {
    expect(addDays(T, 1)).toBe('2026-10-10')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(daysBetween(T, '2026-10-23')).toBe(14)
  })
})

describe('applyGrade (open-ended Leitner)', () => {
  it('a new item graded good goes to box 2, due tomorrow', () => {
    const p = applyGrade(undefined, 'good', T)
    expect(p.box).toBe(2)
    expect(p.due).toBe('2026-10-10')
    expect(p.introduced).toBe(T)
    expect(p.reps).toBe(1)
  })
  it('again drops to box 1, due today, counts a lapse', () => {
    const p = applyGrade(prog(4, T), 'again', T)
    expect(p.box).toBe(1)
    expect(p.due).toBe(T)
    expect(p.lapses).toBe(1)
  })
  it('hard keeps the box and reschedules by its interval, but never the same day', () => {
    const p = applyGrade(prog(3, T), 'hard', T)
    expect(p.box).toBe(3)
    expect(p.due).toBe(addDays(T, 3))
    const fresh = applyGrade(undefined, 'hard', T)
    expect(fresh.box).toBe(1)
    expect(fresh.due).toBe('2026-10-10')
    expect(applyGrade(prog(1, T, { lapses: 1 }), 'hard', T).due).toBe('2026-10-10')
  })
  it('climbs 1 → 7 with the intervals 1 / 3 / 7 / 14 / 30 / 60 days', () => {
    let p = applyGrade(undefined, 'good', T)
    let day = T
    const seen: number[] = [daysBetween(day, p.due)]
    while (p.box < MASTERED_BOX) {
      day = p.due
      p = applyGrade(p, 'good', day)
      seen.push(daysBetween(day, p.due))
    }
    expect(seen).toEqual([1, 3, 7, 14, 30, 60])
    expect(BOX_INTERVAL_DAYS[1]).toBe(0)
  })
  it('box 7 is mastered but still comes back after 60 days', () => {
    const p = applyGrade(prog(6, T), 'good', T)
    expect(p.box).toBe(7)
    expect(p.due).toBe(addDays(T, 60))
    expect(isDue(p, addDays(T, 59))).toBe(false)
    expect(isDue(p, addDays(T, 60))).toBe(true)
    const again = applyGrade(p, 'good', addDays(T, 60))
    expect(again.box).toBe(7)
    expect(again.due).toBe(addDays(T, 120))
  })
  it('isDue respects the date', () => {
    const p = applyGrade(undefined, 'good', T)
    expect(isDue(p, T)).toBe(false)
    expect(isDue(p, '2026-10-10')).toBe(true)
  })
})

describe('buildTodayQueue', () => {
  const items = [item('a1', 1, 'u1:verb', 1), item('a2', 1, 'u1:verb', 2), item('b1', 1, 'u1:noun', 14), item('m1', 4, 'piel:future', 1, 'grid'), item('m2', 4, 'piel:future', 2, 'grid')]
  it('puts due reviews first (lowest box first), then new items up to the limit', () => {
    const progress: ProgressMap = {
      a1: prog(2, T),
      b1: prog(1, T, { lastGrade: 'again', lapses: 1 }),
      m1: prog(3, '2026-10-12'),
    }
    expect(buildTodayQueue({ items, progress, today: T, newLimit: 1 })).toEqual(['b1', 'a1', 'a2'])
  })
  it('interleaves new items across clusters and honours the limit', () => {
    expect(buildTodayQueue({ items, progress: {}, today: T, newLimit: 4 })).toEqual(['a1', 'b1', 'm1', 'a2'])
    expect(buildTodayQueue({ items, progress: {}, today: T, newLimit: 0 })).toEqual([])
  })
  it('interleaveByCluster round-robins', () => {
    expect(interleaveByCluster(items).map((c) => c.id)).toEqual(['a1', 'b1', 'm1', 'a2', 'm2'])
  })
})

describe('topic / weak / extra queues', () => {
  const items = [item('a1', 1, 'u1:verb', 1), item('a2', 1, 'u1:verb', 2), item('b1', 1, 'u1:noun', 14), item('g1', 4, 'piel:future', 1, 'grid'), item('m1', 2, 'u2:verb', 1), item('t1', 3, 'u3:noun', 1), item('s1', 4, 'u4:ex', 1, 'exercise')]
  const progress: ProgressMap = {
    a2: prog(1, T, { lastGrade: 'again', lapses: 1 }),
    a1: prog(4, '2026-10-16', { reps: 3 }),
  }
  it('topic queue: due/box-1 first, then unseen, then the rest', () => {
    expect(buildTopicQueue(items, progress, T, (c) => c.cluster === 'u1:verb')).toEqual(['a2', 'a1'])
    expect(buildTopicQueue(items, progress, T, (c) => c.unit === 1)).toEqual(['a2', 'b1', 'a1'])
  })
  it('weak queue holds failed items not yet recovered: box 1, or box 2 after a lapse', () => {
    const weakProgress: ProgressMap = { ...progress, t1: prog(2, T), m1: prog(2, T, { lapses: 1 }) }
    expect(buildWeakQueue(items, weakProgress)).toEqual(['a2', 'm1'])
    expect(isWeak(prog(2, T))).toBe(false)
    expect(isWeak(prog(3, T, { lapses: 2 }))).toBe(false)
  })
  it('extra-new queue takes the next unseen items across clusters', () => {
    expect(buildExtraNewQueue(items, progress, 3)).toEqual(['b1', 'm1', 't1'])
    expect(buildExtraNewQueue(items, progress, 10)).toHaveLength(5)
  })
  it('new items follow book order: main-book units first, then the workbook (unit null)', () => {
    const items = [item('wb', null, 'x', 0, 'exercise', 'workbook'), item('u4', 4, 'x', 0), item('u1', 1, 'x', 5)]
    expect(buildTodayQueue({ items, progress: {}, today: T, newLimit: 10 })).toEqual(['u1', 'u4', 'wb'])
  })
  it('clusterStats sorts main-book units before the workbook and keeps the book on each row', () => {
    const items = [item('wb', null, 'workbook:ex', 0, 'exercise', 'workbook'), item('u4', 4, 'u4:ex', 0, 'exercise'), item('u1', 1, 'u1:verb', 0)]
    const s = clusterStats(items, {})
    expect(s.map((c) => c.cluster)).toEqual(['u1:verb', 'u4:ex', 'workbook:ex'])
    expect(s[2]).toMatchObject({ book: 'workbook', unit: null, unseen: 1 })
  })
  it('clusterStats counts unseen / weak / learning / mastered', () => {
    const s = clusterStats(items, progress).find((x) => x.cluster === 'u1:verb')!
    expect(s).toMatchObject({ unit: 1, kind: 'vocab', total: 2, unseen: 0, weak: 1, learning: 1, mastered: 0 })
  })
})

describe('newAllowance (new items per calendar day)', () => {
  it('subtracts the items first seen today, whatever mode introduced them', () => {
    const progress: ProgressMap = { a: prog(2, T), b: prog(1, T), c: prog(2, T, { introduced: '2026-10-08' }) }
    expect(newAllowance(progress, T, 10)).toBe(8)
    expect(newAllowance(progress, T, 1)).toBe(0)
    expect(newAllowance(progress, '2026-10-10', 10)).toBe(10)
    expect(newAllowance({}, T, 0)).toBe(0)
  })
})

describe('in-session requeue', () => {
  const queue = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']
  it('a failed item returns after 4–6 items and must pass twice', () => {
    let s = startSession(queue)
    s = gradeInSession(s, 'again', () => 0) // c1 fails → reinserted after 4 items
    expect(s.queue.slice(1, 6)).toEqual(['c2', 'c3', 'c4', 'c5', 'c1'])
    for (let k = 0; k < 4; k++) s = gradeInSession(s, 'good', () => 0) // c2..c5
    expect(currentCard(s)).toBe('c1')
    s = gradeInSession(s, 'good', () => 0.99) // first pass → comes back after 6
    while (currentCard(s) !== 'c1') s = gradeInSession(s, 'good', () => 0)
    s = gradeInSession(s, 'good', () => 0) // second pass → done
    while (!isFinished(s)) s = gradeInSession(s, 'good', () => 0)
    expect(s.done).toBe(8)
    expect(s.queue.length).toBe(10)
  })
  it('persists the first grade only, plus any later «Again»', () => {
    let s = startSession(['c1', 'c2'])
    expect(shouldPersistGrade(s, 'again')).toBe(true)
    s = gradeInSession(s, 'again', () => 0) // c1 fails → comes back after c2
    expect(shouldPersistGrade(s, 'good')).toBe(true) // c2, first time
    s = gradeInSession(s, 'good', () => 0)
    expect(currentCard(s)).toBe('c1')
    expect(shouldPersistGrade(s, 'good')).toBe(false) // re-pass: rehearsal, not evidence
    expect(shouldPersistGrade(s, 'again')).toBe(true) // a second lapse still counts
  })
  it('a never-failed item leaves after one pass', () => {
    let s = startSession(['x', 'y'])
    s = gradeInSession(s, 'hard', () => 0)
    s = gradeInSession(s, 'good', () => 0)
    expect(isFinished(s)).toBe(true)
    expect(s.done).toBe(2)
  })
})

describe('fuzz and load balancing (Anki bands, reimplemented)', () => {
  it('gives no fuzz under 2.5 days and Anki-sized windows above', () => {
    expect([0, 1, 2].map(fuzzWindow)).toEqual([[0, 0], [1, 1], [2, 2]])
    expect([3, 7, 14, 30, 60].map(fuzzWindow)).toEqual([[2, 4], [5, 9], [12, 16], [27, 33], [55, 65]])
  })
  it('without load, the random source picks inside the window', () => {
    const none = {}
    expect(spreadDue(T, 7, { rand: () => 0, load: none })).toBe(addDays(T, 5))
    expect(spreadDue(T, 7, { rand: () => 0.999, load: none })).toBe(addDays(T, 9))
    expect(spreadDue(T, 1, { rand: () => 0.999, load: none })).toBe(addDays(T, 1))
  })
  it('with load, it takes the lightest day in the window; ties go to the random source', () => {
    const load = { [addDays(T, 5)]: 4, [addDays(T, 6)]: 1, [addDays(T, 7)]: 9, [addDays(T, 8)]: 1, [addDays(T, 9)]: 3 }
    expect(spreadDue(T, 7, { rand: () => 0, load })).toBe(addDays(T, 6))
    expect(spreadDue(T, 7, { rand: () => 0.999, load })).toBe(addDays(T, 8))
  })
  it('applyGrade spreads only when asked; again and the short boxes stay exact', () => {
    const spread = { rand: () => 0, load: {} }
    expect(applyGrade(prog(3, T), 'good', T).due).toBe(addDays(T, 7))
    expect(applyGrade(prog(3, T), 'good', T, spread).due).toBe(addDays(T, 5))
    expect(applyGrade(prog(4, T), 'again', T, spread).due).toBe(T)
    expect(applyGrade(undefined, 'good', T, spread).due).toBe(addDays(T, 1))
    expect(applyGrade(prog(1, T), 'hard', T, spread).due).toBe(addDays(T, 1))
  })
  it('dueHistogram counts items per due day', () => {
    expect(dueHistogram({ a: prog(2, T), b: prog(3, T), c: prog(3, '2026-10-12') })).toEqual({ [T]: 2, '2026-10-12': 1 })
  })
})

describe('forecast, catch-up, leeches, card mode', () => {
  const items = [item('a', 1, 'u1:noun', 1), item('b', 1, 'u1:noun', 2), item('c', 1, 'u1:verb', 3), item('d', 1, 'u1:verb', 4), item('e', 1, 'u1:noun', 5)]
  it('dueForecast folds overdue into today and counts the next days', () => {
    const progress: ProgressMap = { a: prog(2, '2026-10-01'), b: prog(2, T), c: prog(3, addDays(T, 2)), d: prog(3, addDays(T, 20)) }
    expect(dueForecast(items, progress, T, 4)).toEqual([2, 0, 1, 0])
    expect(countDue(items, progress, T)).toBe(2)
  })
  it('catch-up: above the budget, oldest first, capped, no new items', () => {
    const progress: ProgressMap = { a: prog(2, '2026-10-05'), b: prog(5, '2026-10-01'), c: prog(1, '2026-10-08'), d: prog(3, '2026-10-02') }
    expect(isCatchUp(4, 3)).toBe(true)
    expect(isCatchUp(3, 3)).toBe(false)
    // b (Oct 1) and d (Oct 2) are the oldest; interleaved across clusters
    expect(buildTodayQueue({ items, progress, today: T, newLimit: 10, reviewsPerDay: 2 })).toEqual(['b', 'd'])
    // under the budget: the usual order (lowest box first) and new items after the reviews
    expect(buildTodayQueue({ items, progress, today: T, newLimit: 10, reviewsPerDay: 4 })).toEqual(['c', 'a', 'd', 'b', 'e'])
  })
  it('a leech has failed 8 times or more', () => {
    expect(isLeech(prog(1, T, { lapses: 7 }))).toBe(false)
    expect(isLeech(prog(3, T, { lapses: 8 }))).toBe(true)
  })
  it('a vocabulary card is a choice while new or in box 1, typed from box 2', () => {
    expect(vocabMode(undefined)).toBe('choice')
    expect(vocabMode(prog(1, T, { lapses: 2 }))).toBe('choice')
    expect(vocabMode(prog(2, T))).toBe('typed')
    expect(vocabMode(prog(7, T))).toBe('typed')
  })
})
