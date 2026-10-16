// Pure Leitner scheduler with open-ended intervals (no exam date). No I/O, no Date.now(): the caller passes
// `today` as 'YYYY-MM-DD' and a random source, so everything here is unit-testable and deterministic.
import { BOOKS, type BookId, type Tense } from '../content/schema'
import type { ErrorClass } from './answer'

export type Box = 1 | 2 | 3 | 4 | 5 | 6 | 7
/** Self-grade: «Again» → again, «Hard» → hard, «Good» → good. */
export type Grade = 'again' | 'hard' | 'good'

/** Box cadence in days. Box 7 = mastered: it still comes back, every 60 days. */
export const BOX_INTERVAL_DAYS: Record<Box, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14, 6: 30, 7: 60 }
export const MASTERED_BOX: Box = 7

export interface ItemProgress {
  box: Box
  /** next review date; always set */
  due: string
  introduced: string
  lastReviewed: string | null
  lastGrade: Grade | null
  reps: number
  lapses: number
}
export type ProgressMap = Record<string, ItemProgress>

/** One persisted answer in the review log: item id, local day, grade, and — when the typed answer was wrong — what
 * kind of mistake it was. A tuple, not an object, so a year of answers stays small in localStorage. */
export type ReviewEntry = [itemId: string, day: string, grade: Grade] | [itemId: string, day: string, grade: Grade, error: ErrorClass]

export type ItemKind = 'vocab' | 'grid' | 'exercise' | 'prep'
/** One schedule item: a vocabulary entry, a verb × tense grid, a book exercise or a preposition paradigm. */
export interface SchedItem {
  id: string
  kind: ItemKind
  /** the book the item comes from; with `unit` it gives the book order of new items */
  book: BookId
  /** main-book unit, or null for an item of another book (the workbook has no units) */
  unit: number | null
  /** interleaving key, e.g. `u01:verb`, `piel:future`, `u04:ex`, `workbook:ex` */
  cluster: string
  /** book order inside the unit (or inside the other book) */
  order: number
  /** tenses the item drills (a grid has one; an exercise the tenses of its tagged items); absent = always on */
  tenses?: Tense[]
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** Local calendar date of a Date object (the device's day, not UTC). */
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------------------------------------------------------------- fuzz and load balancing
/** Anki's fuzz bands (rslib/src/scheduler/states/fuzz.rs; the published numbers, reimplemented): no fuzz under 2.5
 * days, above that ± (1 day + 15 % of the part of the interval between 2.5 and 7 days + 10 % of the part between 7
 * and 20 + 5 % of the part above 20). Our boxes: 3 → 2–4, 7 → 5–9, 14 → 12–16, 30 → 27–33, 60 → 55–65. */
const FUZZ_BANDS = [
  { start: 2.5, end: 7, factor: 0.15 },
  { start: 7, end: 20, factor: 0.1 },
  { start: 20, end: Infinity, factor: 0.05 },
] as const

/** The days an item with this interval may land on: [lowest, highest], in days from today. */
export function fuzzWindow(interval: number): [number, number] {
  if (interval < 2.5) return [interval, interval]
  let delta = 1
  for (const b of FUZZ_BANDS) delta += b.factor * Math.max(0, Math.min(interval, b.end) - b.start)
  return [Math.max(1, Math.round(interval - delta)), Math.round(interval + delta)]
}

/** How many items are due on each day, from the stored schedule: the load the balancer spreads against. */
export function dueHistogram(progress: ProgressMap): Record<string, number> {
  const h: Record<string, number> = {}
  for (const p of Object.values(progress)) h[p.due] = (h[p.due] ?? 0) + 1
  return h
}

/** What applyGrade needs to spread due dates: a random source and the current load per day. */
export interface Spread {
  rand: () => number
  load: Record<string, number>
}

/** The due date for an interval: inside its fuzz window, the day with the fewest items already due; ties at random.
 * With no load at all this is plain fuzz, so the forty words of one vocabulary page stop landing on one day. */
export function spreadDue(today: string, interval: number, s: Spread): string {
  const [lo, hi] = fuzzWindow(interval)
  let best: string[] = []
  let bestLoad = Infinity
  for (let d = lo; d <= hi; d++) {
    const day = addDays(today, d)
    const load = s.load[day] ?? 0
    if (load < bestLoad) {
      bestLoad = load
      best = [day]
    } else if (load === bestLoad) best.push(day)
  }
  return best[Math.floor(s.rand() * best.length)] ?? addDays(today, interval)
}

/** Without `spread` the due date is exact (box interval); the store passes one so real schedules are fuzzed. */
export function applyGrade(prev: ItemProgress | undefined, grade: Grade, today: string, spread?: Spread): ItemProgress {
  const base: ItemProgress = prev ?? { box: 1, due: today, introduced: today, lastReviewed: null, lastGrade: null, reps: 0, lapses: 0 }
  let box: Box = base.box
  let lapses = base.lapses
  if (grade === 'again') {
    box = 1
    lapses += 1
  } else if (grade === 'good') {
    box = Math.min(MASTERED_BOX, box + 1) as Box
  }
  // «Hard» keeps the box but never comes back the same day: a box-1 item rests until tomorrow (decision 2026-10-16).
  const days = grade === 'hard' ? Math.max(1, BOX_INTERVAL_DAYS[box]) : BOX_INTERVAL_DAYS[box]
  const due = spread ? spreadDue(today, days, spread) : addDays(today, days)
  return { ...base, box, due, lastReviewed: today, lastGrade: grade, reps: base.reps + 1, lapses }
}

export const isDue = (p: ItemProgress, today: string): boolean => p.due <= today

/** Weak = failed and not yet recovered: box 1, or box 2 reached after a lapse. A new item answered Good once sits in
 * box 2 with no lapse — young, not weak (decision 2026-10-16). */
export const isWeak = (p: ItemProgress): boolean => p.box === 1 || (p.box === 2 && p.lapses > 0)

/** A leech keeps failing: Anki's threshold of 8 lapses. Nothing is suspended — Weak spots lists it for the teacher. */
export const LEECH_LAPSES = 8
export const isLeech = (p: ItemProgress): boolean => p.lapses >= LEECH_LAPSES

/** How a vocabulary card asks: recognition (Hebrew → pick the meaning) while the word is new or failed (box 1),
 * typed production (meaning → Hebrew) from box 2 on. A choice can only lift a word to box 2, never further. */
export type VocabMode = 'choice' | 'typed'
export const vocabMode = (p: ItemProgress | undefined): VocabMode => (!p || p.box === 1 ? 'choice' : 'typed')

/** Due counts for today (overdue included, index 0) and each following day, over the given items. */
export function dueForecast(items: SchedItem[], progress: ProgressMap, today: string, days = 14): number[] {
  const out = Array.from({ length: days }, () => 0)
  for (const it of items) {
    const p = progress[it.id]
    if (!p) continue
    const d = Math.max(0, daysBetween(today, p.due))
    if (d < days) out[d] = (out[d] ?? 0) + 1
  }
  return out
}

export const countDue = (items: SchedItem[], progress: ProgressMap, today: string): number => items.filter((c) => progress[c.id] && isDue(progress[c.id]!, today)).length

/** Catch-up: more is due than a day's review budget (after a break). «Today» then takes the oldest first, up to the
 * budget, and no new items. */
export const isCatchUp = (dueCount: number, reviewsPerDay: number): boolean => dueCount > reviewsPerDay

/** Round-robin across clusters so consecutive items come from different places. */
export function interleaveByCluster<T extends { cluster: string }>(items: T[]): T[] {
  const groups = new Map<string, T[]>()
  for (const it of items) {
    const g = groups.get(it.cluster)
    if (g) g.push(it)
    else groups.set(it.cluster, [it])
  }
  const lists = [...groups.values()]
  const out: T[] = []
  let any = true
  while (any) {
    any = false
    for (const l of lists) {
      const x = l.shift()
      if (x) {
        out.push(x)
        any = true
      }
    }
  }
  return out
}

/** Main book before the workbook (BOOKS rank), then unit, then page order. Inside another book `unit` is null. */
const byBookOrder = (a: SchedItem, b: SchedItem) => BOOKS[a.book].rank - BOOKS[b.book].rank || (a.unit ?? 0) - (b.unit ?? 0) || a.order - b.order

/** New items still allowed today: the daily limit minus the items first seen today, in any mode. */
export function newAllowance(progress: ProgressMap, today: string, newPerDay: number): number {
  let introduced = 0
  for (const p of Object.values(progress)) if (p.introduced === today) introduced++
  return Math.max(0, newPerDay - introduced)
}

export interface TodayQueueInput {
  items: SchedItem[]
  progress: ProgressMap
  today: string
  /** new items still allowed today — see newAllowance */
  newLimit: number
  /** the day's review budget; above it «Today» switches to catch-up (see isCatchUp). Absent = no limit. */
  reviewsPerDay?: number
}

/** «Today»: due reviews first (lowest box first), then today's new items in book order; both cluster-interleaved.
 * In catch-up the oldest-due items come first, capped at the budget, and no new items are added. */
export function buildTodayQueue(i: TodayQueueInput): string[] {
  const p = (c: SchedItem) => i.progress[c.id]!
  const dueItems = i.items.filter((c) => {
    const pr = i.progress[c.id]
    return pr !== undefined && isDue(pr, i.today)
  })
  const budget = i.reviewsPerDay ?? Infinity
  if (isCatchUp(dueItems.length, budget)) {
    const oldest = dueItems.sort((a, b) => p(a).due.localeCompare(p(b).due) || p(a).box - p(b).box || byBookOrder(a, b)).slice(0, budget)
    return interleaveByCluster(oldest).map((c) => c.id)
  }
  const due = dueItems.sort((a, b) => p(a).box - p(b).box || p(a).due.localeCompare(p(b).due) || byBookOrder(a, b))
  const fresh = i.items.filter((c) => i.progress[c.id] === undefined).sort(byBookOrder)
  return [...interleaveByCluster(due), ...interleaveByCluster(fresh).slice(0, Math.max(0, i.newLimit))].map((c) => c.id)
}

/** «Unit / topic»: everything matching `pick`; due and box-1 items first, then unseen, then the rest, in book order. */
export function buildTopicQueue(items: SchedItem[], progress: ProgressMap, today: string, pick: (c: SchedItem) => boolean): string[] {
  const mine = items.filter(pick).sort(byBookOrder)
  const rank = (c: SchedItem) => {
    const p = progress[c.id]
    if (!p) return 1
    if (isDue(p, today) || p.box === 1) return 0
    return 2
  }
  return mine.sort((a, b) => rank(a) - rank(b) || byBookOrder(a, b)).map((c) => c.id)
}

/** «Weak spots»: seen items that are weak (see isWeak). */
export function buildWeakQueue(items: SchedItem[], progress: ProgressMap): string[] {
  return interleaveByCluster(
    items.filter((c) => {
      const p = progress[c.id]
      return p !== undefined && isWeak(p)
    }),
  ).map((c) => c.id)
}

/** «N more new»: the next unseen items beyond today's limit, cluster-interleaved. */
export function buildExtraNewQueue(items: SchedItem[], progress: ProgressMap, n: number): string[] {
  const fresh = items.filter((c) => progress[c.id] === undefined).sort(byBookOrder)
  return interleaveByCluster(fresh).slice(0, n).map((c) => c.id)
}

export interface ClusterStat {
  cluster: string
  book: BookId
  unit: number | null
  kind: ItemKind
  total: number
  unseen: number
  /** failed and not yet recovered (see isWeak) */
  weak: number
  /** seen, not weak, not yet mastered */
  learning: number
  /** box 7 */
  mastered: number
}

export function clusterStats(items: SchedItem[], progress: ProgressMap): ClusterStat[] {
  const map = new Map<string, ClusterStat>()
  for (const c of items) {
    let s = map.get(c.cluster)
    if (!s) {
      s = { cluster: c.cluster, book: c.book, unit: c.unit, kind: c.kind, total: 0, unseen: 0, weak: 0, learning: 0, mastered: 0 }
      map.set(c.cluster, s)
    }
    s.total++
    const p = progress[c.id]
    if (!p) s.unseen++
    else if (isWeak(p)) s.weak++
    else if (p.box < MASTERED_BOX) s.learning++
    else s.mastered++
  }
  return [...map.values()].sort((a, b) => BOOKS[a.book].rank - BOOKS[b.book].rank || (a.unit ?? 0) - (b.unit ?? 0) || a.cluster.localeCompare(b.cluster))
}

// ---------------------------------------------------------------- in-session requeue
export interface Session {
  queue: string[]
  index: number
  /** items that failed at least once this session: they must pass twice before leaving */
  failed: Record<string, true>
  /** every item graded this session has an entry (0 right after a fail) */
  passes: Record<string, number>
  done: number
}

export function startSession(queue: string[]): Session {
  return { queue: [...queue], index: 0, failed: {}, passes: {}, done: 0 }
}

export const currentCard = (s: Session): string | null => s.queue[s.index] ?? null
export const isFinished = (s: Session): boolean => s.index >= s.queue.length
export const remaining = (s: Session): number => Math.max(0, s.queue.length - s.index)

/** A failed item comes back after 4–6 other items and must then be passed twice in a row. */
export function gradeInSession(s: Session, grade: Grade, rand: () => number): Session {
  const id = s.queue[s.index]
  if (id === undefined) return s
  const next = s.index + 1
  const queue = [...s.queue]
  const failed = { ...s.failed }
  const passes = { ...s.passes }
  let done = s.done
  const reinsert = () => queue.splice(Math.min(queue.length, next + 4 + Math.floor(rand() * 3)), 0, id)
  if (grade === 'again') {
    failed[id] = true
    passes[id] = 0
    reinsert()
  } else if (failed[id] && (passes[id] ?? 0) + 1 < 2) {
    passes[id] = (passes[id] ?? 0) + 1
    reinsert()
  } else {
    passes[id] = (passes[id] ?? 0) + 1
    done++
  }
  return { queue, index: next, failed, passes, done }
}

/** The schedule learns from the first answer to an item in a session only. The forced re-passes of a failed item
 * (see gradeInSession) are rehearsal, not evidence for a longer interval — except a fresh «Again», which is a real
 * lapse and must be recorded. */
export function shouldPersistGrade(s: Session, grade: Grade): boolean {
  const id = s.queue[s.index]
  return id !== undefined && (!(id in s.passes) || grade === 'again')
}
