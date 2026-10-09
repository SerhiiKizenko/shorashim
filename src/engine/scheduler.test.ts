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
  currentCard,
  daysBetween,
  gradeInSession,
  interleaveByCluster,
  isDue,
  isFinished,
  MASTERED_BOX,
  startSession,
  type Box,
  type ItemProgress,
  type ProgressMap,
  type SchedItem,
} from './scheduler'

const T = '2026-10-09'
const item = (id: string, unit: number, cluster: string, order: number, kind: SchedItem['kind'] = 'vocab'): SchedItem => ({ id, kind, unit, cluster, order })
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
  it('hard keeps the box and reschedules by its interval', () => {
    const p = applyGrade(prog(3, T), 'hard', T)
    expect(p.box).toBe(3)
    expect(p.due).toBe(addDays(T, 3))
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
  it('weak queue holds boxes 1–2 only', () => {
    expect(buildWeakQueue(items, progress)).toEqual(['a2'])
  })
  it('extra-new queue takes the next unseen items across clusters', () => {
    expect(buildExtraNewQueue(items, progress, 3)).toEqual(['b1', 'm1', 't1'])
    expect(buildExtraNewQueue(items, progress, 10)).toHaveLength(5)
  })
  it('clusterStats counts unseen / weak / learning / mastered', () => {
    const s = clusterStats(items, progress).find((x) => x.cluster === 'u1:verb')!
    expect(s).toMatchObject({ unit: 1, kind: 'vocab', total: 2, unseen: 0, weak: 1, learning: 1, mastered: 0 })
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
  it('a never-failed item leaves after one pass', () => {
    let s = startSession(['x', 'y'])
    s = gradeInSession(s, 'hard', () => 0)
    s = gradeInSession(s, 'good', () => 0)
    expect(isFinished(s)).toBe(true)
    expect(s.done).toBe(2)
  })
})
