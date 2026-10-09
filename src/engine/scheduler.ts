// Pure Leitner scheduler tuned for a ~14-day horizon. No I/O, no Date.now(): the caller passes `today`
// as 'YYYY-MM-DD' and a random source, so everything here is unit-testable and deterministic.

export type Box = 1 | 2 | 3 | 4 | 5
/** Self-grade: «Не знаю» → again, «С трудом» → hard, «Знаю» → good. */
export type Grade = 'again' | 'hard' | 'good'

export interface CardProgress {
  box: Box
  /** next review date, null once the card is in box 5 («усвоено») */
  due: string | null
  introduced: string
  lastReviewed: string | null
  lastGrade: Grade | null
  reps: number
  lapses: number
}
export type ProgressMap = Record<string, CardProgress>

export interface SchedCard {
  id: string
  block: 1 | 2 | 3 | 4
  cluster: string
  examNumber: number
}

/** Box cadence: 1 = every session, 2 = next day, 3 = +3 days, 4 = +7 days, 5 = final review only. */
export const BOX_INTERVAL_DAYS: Record<Box, number | null> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: null }

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

export function applyGrade(prev: CardProgress | undefined, grade: Grade, today: string): CardProgress {
  const base: CardProgress = prev ?? {
    box: 1,
    due: today,
    introduced: today,
    lastReviewed: null,
    lastGrade: null,
    reps: 0,
    lapses: 0,
  }
  let box: Box = base.box
  let lapses = base.lapses
  if (grade === 'again') {
    box = 1
    lapses += 1
  } else if (grade === 'good') {
    box = Math.min(5, box + 1) as Box
  }
  const interval = BOX_INTERVAL_DAYS[box]
  return {
    ...base,
    box,
    due: interval === null ? null : addDays(today, interval),
    lastReviewed: today,
    lastGrade: grade,
    reps: base.reps + 1,
    lapses,
  }
}

export function isDue(p: CardProgress, today: string): boolean {
  return p.box < 5 && p.due !== null && p.due <= today
}

/** New cards per day so that everything is introduced ~4 days before the exam. */
export function newCardQuota(remainingNew: number, daysToExam: number): number {
  if (remainingNew <= 0) return 0
  return Math.ceil(remainingNew / Math.max(1, daysToExam - 4))
}

/** Round-robin across clusters so consecutive cards come from different topics. */
export function interleaveByCluster<T extends { cluster: string; block: number }>(items: T[]): T[] {
  const groups = new Map<string, T[]>()
  for (const it of items) {
    const key = `${it.block}:${it.cluster}`
    const g = groups.get(key)
    if (g) g.push(it)
    else groups.set(key, [it])
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

const byExamOrder = (a: SchedCard, b: SchedCard) => a.block - b.block || a.examNumber - b.examNumber

export interface TodayQueueInput {
  cards: SchedCard[]
  progress: ProgressMap
  today: string
  daysToExam: number
  /** override the computed quota (settings / tests) */
  newLimit?: number
}

/** «Сегодня»: due reviews first (lowest box first), then today's share of new cards; both cluster-interleaved. */
export function buildTodayQueue(i: TodayQueueInput): string[] {
  const due = i.cards
    .filter((c) => {
      const p = i.progress[c.id]
      return p !== undefined && isDue(p, i.today)
    })
    .sort((a, b) => i.progress[a.id]!.box - i.progress[b.id]!.box || (i.progress[a.id]!.due ?? '').localeCompare(i.progress[b.id]!.due ?? '') || byExamOrder(a, b))
  const fresh = i.cards.filter((c) => i.progress[c.id] === undefined).sort(byExamOrder)
  const quota = i.newLimit ?? newCardQuota(fresh.length, i.daysToExam)
  return [...interleaveByCluster(due), ...interleaveByCluster(fresh).slice(0, quota)].map((c) => c.id)
}

/** «Блок / тема»: everything matching `pick`; due and box-1 cards first, then unseen, then the rest, in exam order. */
export function buildTopicQueue(cards: SchedCard[], progress: ProgressMap, today: string, pick: (c: SchedCard) => boolean): string[] {
  const mine = cards.filter(pick).sort(byExamOrder)
  const rank = (c: SchedCard) => {
    const p = progress[c.id]
    if (!p) return 1
    if (isDue(p, today) || p.box === 1) return 0
    return 2
  }
  return mine.sort((a, b) => rank(a) - rank(b) || byExamOrder(a, b)).map((c) => c.id)
}

/** «Слабые места»: seen cards still in boxes 1–2. */
export function buildWeakQueue(cards: SchedCard[], progress: ProgressMap): string[] {
  return interleaveByCluster(cards.filter((c) => (progress[c.id]?.box ?? 9) <= 2)).map((c) => c.id)
}

/** «Повтор перед экзаменом»: every card seen so far, weakest box first, no new cards. */
export function buildFinalReviewQueue(cards: SchedCard[], progress: ProgressMap): string[] {
  const seen = cards.filter((c) => progress[c.id] !== undefined)
  const out: string[] = []
  for (const box of [1, 2, 3, 4, 5] as Box[]) out.push(...interleaveByCluster(seen.filter((c) => progress[c.id]!.box === box)).map((c) => c.id))
  return out
}

/** «Ещё N новых»: the next unseen cards beyond today's quota, cluster-interleaved. */
export function buildExtraNewQueue(cards: SchedCard[], progress: ProgressMap, n: number): string[] {
  const fresh = cards.filter((c) => progress[c.id] === undefined).sort(byExamOrder)
  return interleaveByCluster(fresh).slice(0, n).map((c) => c.id)
}

/** «Билет»: 3 × block 1 from different clusters + 1 each of blocks 2, 3, 4. */
export function buildTicket(cards: SchedCard[], rand: () => number): string[] {
  const pickOne = (pool: SchedCard[]): SchedCard | undefined => pool[Math.floor(rand() * pool.length)]
  const out: SchedCard[] = []
  const usedClusters = new Set<string>()
  for (let k = 0; k < 3; k++) {
    const pool = cards.filter((c) => c.block === 1 && !usedClusters.has(c.cluster))
    const c = pickOne(pool.length ? pool : cards.filter((c) => c.block === 1))
    if (!c) break
    usedClusters.add(c.cluster)
    out.push(c)
  }
  for (const block of [2, 3, 4] as const) {
    const c = pickOne(cards.filter((c) => c.block === block))
    if (c) out.push(c)
  }
  return out.map((c) => c.id)
}

export interface ClusterStat {
  block: 1 | 2 | 3 | 4
  cluster: string
  total: number
  unseen: number
  weak: number
  learning: number
  learned: number
}

export function clusterStats(cards: SchedCard[], progress: ProgressMap): ClusterStat[] {
  const map = new Map<string, ClusterStat>()
  for (const c of cards) {
    const key = `${c.block}:${c.cluster}`
    let s = map.get(key)
    if (!s) {
      s = { block: c.block, cluster: c.cluster, total: 0, unseen: 0, weak: 0, learning: 0, learned: 0 }
      map.set(key, s)
    }
    s.total++
    const p = progress[c.id]
    if (!p) s.unseen++
    else if (p.box <= 2) s.weak++
    else if (p.box <= 4) s.learning++
    else s.learned++
  }
  return [...map.values()].sort((a, b) => a.block - b.block || a.cluster.localeCompare(b.cluster))
}

// ---------------------------------------------------------------- in-session requeue
export interface Session {
  queue: string[]
  index: number
  /** cards that failed at least once this session: they must pass twice before leaving */
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

/** A failed card comes back after 4–6 other cards and must then be passed twice in a row. */
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
