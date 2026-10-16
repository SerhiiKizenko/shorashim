import { describe, expect, it } from 'vitest'
import { answeredOn, studyDays } from './habit'
import type { ItemProgress, ReviewEntry } from './scheduler'

const T = '2026-10-16'
const p = (lastReviewed: string | null): ItemProgress => ({ box: 2, due: T, introduced: '2026-10-01', lastReviewed, lastGrade: 'good', reps: 1, lapses: 0 })

describe('studyDays (rolling 7 days)', () => {
  it('marks the days with an answer, oldest first, today last', () => {
    const reviews: ReviewEntry[] = [['vocab:a', '2026-10-10', 'good'], ['vocab:b', '2026-10-16', 'again', 'prefix'], ['vocab:a', '2026-10-16', 'good']]
    expect(studyDays(reviews, {}, T)).toEqual([true, false, false, false, false, false, true])
  })
  it('also counts days known only from an item\'s last review (progress older than the log)', () => {
    expect(studyDays([], { a: p('2026-10-14'), b: p(null), c: p('2026-09-01') }, T)).toEqual([false, false, false, false, true, false, false])
  })
  it('answeredOn counts one day\'s logged answers', () => {
    const reviews: ReviewEntry[] = [['a', T, 'good'], ['b', T, 'hard'], ['c', '2026-10-15', 'good']]
    expect(answeredOn(reviews, T)).toBe(2)
    expect(answeredOn([], T)).toBe(0)
  })
})
