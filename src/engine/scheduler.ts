// Pure Leitner scheduler with open-ended intervals (no exam date). No I/O, no Date.now(): the caller passes
// `today` as 'YYYY-MM-DD' and a random source, so everything here is unit-testable and deterministic.
import type { Tense } from '../content/schema'

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

export type ItemKind = 'vocab' | 'grid' | 'exercise' | 'prep'
/** One schedule item: a vocabulary entry, a verb × tense grid, a book exercise or a preposition paradigm. */
export interface SchedItem {
  id: string
  kind: ItemKind
  unit: number
  /** interleaving key, e.g. `u01:verb`, `piel:future`, `u04:ex` */
  cluster: string
  /** book order inside the unit */
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

export function applyGrade(prev: ItemProgress | undefined, grade: Grade, today: string): ItemProgress {
  const base: ItemProgress = prev ?? { box: 1, due: today, introduced: today, lastReviewed: null, lastGrade: null, reps: 0, lapses: 0 }
  let box: Box = base.box
  let lapses = base.lapses
  if (grade === 'again') {
    box = 1
    lapses += 1
  } else if (grade === 'good') {
    box = Math.min(MASTERED_BOX, box + 1) as Box
  }
  return { ...base, box, due: addDays(today, BOX_INTERVAL_DAYS[box]), lastReviewed: today, lastGrade: grade, reps: base.reps + 1, lapses }
}

export const isDue = (p: ItemProgress, today: string): boolean => p.due <= today

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

const byBookOrder = (a: SchedItem, b: SchedItem) => a.unit - b.unit || a.order - b.order

export interface TodayQueueInput {
  items: SchedItem[]
  progress: ProgressMap
  today: string
  /** new items allowed today (Settings, default 10) */
  newLimit: number
}

/** «Today»: due reviews first (lowest box first), then today's new items in book order; both cluster-interleaved. */
export function buildTodayQueue(i: TodayQueueInput): string[] {
  const due = i.items
    .filter((c) => {
      const p = i.progress[c.id]
      return p !== undefined && isDue(p, i.today)
    })
    .sort((a, b) => i.progress[a.id]!.box - i.progress[b.id]!.box || i.progress[a.id]!.due.localeCompare(i.progress[b.id]!.due) || byBookOrder(a, b))
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

/** «Weak spots»: seen items still in boxes 1–2. */
export function buildWeakQueue(items: SchedItem[], progress: ProgressMap): string[] {
  return interleaveByCluster(items.filter((c) => (progress[c.id]?.box ?? 9) <= 2)).map((c) => c.id)
}

/** «N more new»: the next unseen items beyond today's limit, cluster-interleaved. */
export function buildExtraNewQueue(items: SchedItem[], progress: ProgressMap, n: number): string[] {
  const fresh = items.filter((c) => progress[c.id] === undefined).sort(byBookOrder)
  return interleaveByCluster(fresh).slice(0, n).map((c) => c.id)
}

export interface ClusterStat {
  cluster: string
  unit: number
  kind: ItemKind
  total: number
  unseen: number
  /** boxes 1–2 */
  weak: number
  /** boxes 3–6 */
  learning: number
  /** box 7 */
  mastered: number
}

export function clusterStats(items: SchedItem[], progress: ProgressMap): ClusterStat[] {
  const map = new Map<string, ClusterStat>()
  for (const c of items) {
    let s = map.get(c.cluster)
    if (!s) {
      s = { cluster: c.cluster, unit: c.unit, kind: c.kind, total: 0, unseen: 0, weak: 0, learning: 0, mastered: 0 }
      map.set(c.cluster, s)
    }
    s.total++
    const p = progress[c.id]
    if (!p) s.unseen++
    else if (p.box <= 2) s.weak++
    else if (p.box < MASTERED_BOX) s.learning++
    else s.mastered++
  }
  return [...map.values()].sort((a, b) => a.unit - b.unit || a.cluster.localeCompare(b.cluster))
}

// ---------------------------------------------------------------- in-session requeue
export interface Session {
  queue: string[]
  index: number
  /** items that failed at least once this session: they must pass twice before leaving */
  failed: Record<string, true>
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
