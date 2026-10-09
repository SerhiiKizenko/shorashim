import { describe, expect, it } from 'vitest'
import {
  addDays,
  applyGrade,
  buildExtraNewQueue,
  buildFinalReviewQueue,
  buildTicket,
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
  newCardQuota,
  startSession,
  type ProgressMap,
  type SchedCard,
} from './scheduler'

const T = '2026-10-09'
const card = (id: string, block: 1 | 2 | 3 | 4, cluster: string, n: number): SchedCard => ({ id, block, cluster, examNumber: n })

describe('dates', () => {
  it('adds days and measures distance', () => {
    expect(addDays(T, 1)).toBe('2026-10-10')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(daysBetween(T, '2026-10-23')).toBe(14)
  })
})

describe('applyGrade (Leitner boxes)', () => {
  it('new card graded «Знаю» goes to box 2, due tomorrow', () => {
    const p = applyGrade(undefined, 'good', T)
    expect(p.box).toBe(2)
    expect(p.due).toBe('2026-10-10')
    expect(p.introduced).toBe(T)
    expect(p.reps).toBe(1)
  })
  it('«Не знаю» drops to box 1, due today, counts a lapse', () => {
    const p = applyGrade({ box: 4, due: T, introduced: T, lastReviewed: null, lastGrade: null, reps: 3, lapses: 0 }, 'again', T)
    expect(p.box).toBe(1)
    expect(p.due).toBe(T)
    expect(p.lapses).toBe(1)
  })
  it('«С трудом» keeps the box and reschedules by its interval', () => {
    const p = applyGrade({ box: 3, due: T, introduced: T, lastReviewed: null, lastGrade: null, reps: 1, lapses: 0 }, 'hard', T)
    expect(p.box).toBe(3)
    expect(p.due).toBe(addDays(T, 3))
  })
  it('box 4 + «Знаю» = box 5, never due again (final review only)', () => {
    const p = applyGrade({ box: 4, due: T, introduced: T, lastReviewed: null, lastGrade: null, reps: 1, lapses: 0 }, 'good', T)
    expect(p.box).toBe(5)
    expect(p.due).toBeNull()
    expect(isDue(p, '2030-01-01')).toBe(false)
  })
  it('isDue respects the date', () => {
    const p = applyGrade(undefined, 'good', T)
    expect(isDue(p, T)).toBe(false)
    expect(isDue(p, '2026-10-10')).toBe(true)
  })
})

describe('newCardQuota', () => {
  it('spreads new cards so they finish ~4 days before the exam', () => {
    expect(newCardQuota(100, 14)).toBe(10)
    expect(newCardQuota(278, 14)).toBe(28)
    expect(newCardQuota(100, 2)).toBe(100)
    expect(newCardQuota(0, 14)).toBe(0)
  })
})

describe('buildTodayQueue', () => {
  const cards = [card('a1', 1, 'A', 1), card('a2', 1, 'A', 2), card('b1', 1, 'B', 14), card('m1', 2, 'shoulder', 1), card('m2', 2, 'shoulder', 2)]
  it('puts due reviews first (lowest box first), then new cards up to the quota', () => {
    const progress: ProgressMap = {
      a1: { box: 2, due: T, introduced: T, lastReviewed: T, lastGrade: 'good', reps: 1, lapses: 0 },
      b1: { box: 1, due: T, introduced: T, lastReviewed: T, lastGrade: 'again', reps: 1, lapses: 1 },
      m1: { box: 3, due: '2026-10-12', introduced: T, lastReviewed: T, lastGrade: 'good', reps: 2, lapses: 0 },
    }
    const q = buildTodayQueue({ cards, progress, today: T, daysToExam: 14, newLimit: 1 })
    expect(q).toEqual(['b1', 'a1', 'a2'])
  })
  it('interleaves new cards across clusters', () => {
    const q = buildTodayQueue({ cards, progress: {}, today: T, daysToExam: 14, newLimit: 4 })
    expect(q).toEqual(['a1', 'b1', 'm1', 'a2'])
  })
  it('interleaveByCluster round-robins', () => {
    expect(interleaveByCluster(cards).map((c) => c.id)).toEqual(['a1', 'b1', 'm1', 'a2', 'm2'])
  })
})

describe('topic / weak / ticket queues', () => {
  const cards = [card('a1', 1, 'A', 1), card('a2', 1, 'A', 2), card('b1', 1, 'B', 14), card('g1', 1, 'G', 70), card('m1', 2, 'shoulder', 1), card('t1', 3, 'pelvis', 1), card('s1', 4, 'vd', 1)]
  const progress: ProgressMap = {
    a2: { box: 1, due: T, introduced: T, lastReviewed: T, lastGrade: 'again', reps: 1, lapses: 1 },
    a1: { box: 4, due: '2026-10-16', introduced: T, lastReviewed: T, lastGrade: 'good', reps: 3, lapses: 0 },
  }
  it('topic queue: due/box-1 first, then unseen, then the rest', () => {
    expect(buildTopicQueue(cards, progress, T, (c) => c.cluster === 'A')).toEqual(['a2', 'a1'])
    expect(buildTopicQueue(cards, progress, T, (c) => c.block === 1)).toEqual(['a2', 'b1', 'g1', 'a1'])
  })
  it('weak queue holds boxes 1–2 only', () => {
    expect(buildWeakQueue(cards, progress)).toEqual(['a2'])
  })
  it('final review holds every seen card, weakest first, and no new cards', () => {
    expect(buildFinalReviewQueue(cards, progress)).toEqual(['a2', 'a1'])
  })
  it('extra-new queue takes the next unseen cards across clusters', () => {
    expect(buildExtraNewQueue(cards, progress, 3)).toEqual(['b1', 'g1', 'm1'])
    expect(buildExtraNewQueue(cards, progress, 10)).toHaveLength(5)
  })
  it('ticket = 3 × block 1 from different clusters + one of each other block', () => {
    let i = 0
    const rand = () => [0.1, 0.9, 0.5, 0.2, 0.3, 0.4][i++ % 6]!
    const t = buildTicket(cards, rand)
    expect(t).toHaveLength(6)
    const b1 = t.slice(0, 3).map((id) => cards.find((c) => c.id === id)!)
    expect(new Set(b1.map((c) => c.cluster)).size).toBe(3)
    expect(t.slice(3)).toEqual(['m1', 't1', 's1'])
  })
  it('clusterStats counts unseen / weak / learning / learned', () => {
    const s = clusterStats(cards, progress).find((x) => x.cluster === 'A')!
    expect(s).toMatchObject({ total: 2, unseen: 0, weak: 1, learning: 1, learned: 0 })
  })
})

describe('in-session requeue', () => {
  const queue = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']
  it('a failed card returns after 4–6 cards and must pass twice', () => {
    let s = startSession(queue)
    s = gradeInSession(s, 'again', () => 0) // c1 fails → reinserted after 4 cards
    expect(s.queue.slice(1, 6)).toEqual(['c2', 'c3', 'c4', 'c5', 'c1'])
    for (let k = 0; k < 4; k++) s = gradeInSession(s, 'good', () => 0) // c2..c5
    expect(currentCard(s)).toBe('c1')
    s = gradeInSession(s, 'good', () => 0.99) // first pass → comes back after 6
    expect(s.queue.indexOf('c1', s.index)).toBe(s.index + 6 > s.queue.length - 1 ? s.queue.length - 1 : s.index + 6)
    while (currentCard(s) !== 'c1') s = gradeInSession(s, 'good', () => 0)
    s = gradeInSession(s, 'good', () => 0) // second pass → done
    while (!isFinished(s)) s = gradeInSession(s, 'good', () => 0)
    expect(s.done).toBe(8)
    expect(s.queue.length).toBe(10)
  })
  it('a never-failed card leaves after one pass', () => {
    let s = startSession(['x', 'y'])
    s = gradeInSession(s, 'hard', () => 0)
    s = gradeInSession(s, 'good', () => 0)
    expect(isFinished(s)).toBe(true)
    expect(s.done).toBe(2)
  })
})
