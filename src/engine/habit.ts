// Habit read-outs for Home and the session bar, derived from what is already stored (the review log and each
// item's last review) rather than from counters that could drift. Pure; the caller passes `today`.
import { addDays, type ProgressMap, type ReviewEntry } from './scheduler'

/** Which of the last `days` days had at least one answer, oldest first (the last entry is today). A rolling window:
 * a missed day stays visible for a week and then drops out — there is no streak to lose. Days come from the review
 * log and from every item's last review, so progress made before the log existed still counts. */
export function studyDays(reviews: ReviewEntry[], progress: ProgressMap, today: string, days = 7): boolean[] {
  const studied = new Set<string>()
  for (const r of reviews) studied.add(r[1])
  for (const p of Object.values(progress)) if (p.lastReviewed) studied.add(p.lastReviewed)
  return Array.from({ length: days }, (_, i) => studied.has(addDays(today, i - (days - 1))))
}

/** Answers persisted on `day` (first answers and lapses — the re-passes after «Again» are rehearsal and not logged). */
export const answeredOn = (reviews: ReviewEntry[], day: string): number => reviews.reduce((n, r) => n + (r[1] === day ? 1 : 0), 0)
