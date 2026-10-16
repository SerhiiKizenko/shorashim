// Learning progress, settings, streak and the review log — persisted to localStorage per device.
// Backup/Restore moves exactly this state as one JSON file. Progress is keyed by schedule item id
// (`grid:<verb>:<tense>` …), so the tense focus only filters what is shown and never touches it.
// New fields always get a default, so an older backup (or an older stored state) still loads unchanged.
import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageScope } from '../content/load'
import { TenseSchema, type Tense } from '../content/schema'
import { ERROR_CLASSES, type ErrorClass } from '../engine/answer'
import { addDays, applyGrade, dueHistogram, type Grade, type ProgressMap, type ReviewEntry } from '../engine/scheduler'

const GradeSchema = z.enum(['again', 'hard', 'good'])
/** [item id, day, grade] or [item id, day, grade, error class]; see ReviewEntry */
const ReviewSchema = z.union([z.tuple([z.string(), z.string(), GradeSchema]), z.tuple([z.string(), z.string(), GradeSchema, z.enum(ERROR_CLASSES)])])
const BoxSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)])
const ProgressEntry = z.object({
  box: BoxSchema,
  due: z.string(),
  introduced: z.string(),
  lastReviewed: z.string().nullable(),
  lastGrade: GradeSchema.nullable(),
  reps: z.number(),
  lapses: z.number(),
})
export const SettingsSchema = z.object({
  /** which tenses the verb drills show; default Future only (decision 13) */
  tenseFocus: z.array(TenseSchema),
  /** new items per day */
  newPerDay: z.number().int().min(0),
  theme: z.enum(['auto', 'light', 'dark']),
  onboarded: z.boolean(),
  /** the day's review budget: above it «Today» switches to catch-up (oldest first, no new items) */
  reviewsPerDay: z.number().int().min(1).default(100),
  /** single verb cells mixed in after «Today» (0 = off) */
  mixedCells: z.number().int().min(0).default(10),
  /** the daily routine the learner studies after («morning coffee»): an implementation intention */
  anchor: z.string().max(60).optional(),
})
export const StatsSchema = z.object({
  streak: z.number(),
  lastStudyDate: z.string().nullable(),
  totalReviews: z.number(),
})
/** per grid cell (`verbId:tense:cell`) or exercise item: how often it was right / wrong */
const CellStat = z.object({ right: z.number(), wrong: z.number(), last: z.string().nullable() })
export const BackupSchema = z.object({
  app: z.literal('shorashim'),
  version: z.literal(1),
  exportedAt: z.string(),
  progress: z.record(z.string(), ProgressEntry),
  settings: SettingsSchema,
  stats: StatsSchema,
  cellStats: z.record(z.string(), CellStat).default({}),
  reviews: z.array(ReviewSchema).default([]),
})
export type Settings = z.infer<typeof SettingsSchema>
export type Stats = z.infer<typeof StatsSchema>
export type Backup = z.infer<typeof BackupSchema>
export type CellStats = Record<string, z.infer<typeof CellStat>>

interface ProgressState {
  progress: ProgressMap
  settings: Settings
  stats: Stats
  cellStats: CellStats
  /** every persisted answer, oldest first */
  reviews: ReviewEntry[]
  grade: (itemId: string, grade: Grade, today: string, error?: ErrorClass) => void
  recordCell: (key: string, ok: boolean, today: string) => void
  setSettings: (patch: Partial<Settings>) => void
  setTenseFocus: (focus: Tense[]) => void
  importBackup: (b: Backup) => void
  resetProgress: () => void
}

export const DEFAULT_SETTINGS: Settings = { tenseFocus: ['future'], newPerDay: 10, theme: 'auto', onboarded: false, reviewsPerDay: 100, mixedCells: 10 }
const defaultStats: Stats = { streak: 0, lastStudyDate: null, totalReviews: 0 }

/** zustand's default merge is shallow: a stored `settings` from before a field existed would replace the defaults
 * wholesale and leave the new field undefined. This fills every missing setting from DEFAULT_SETTINGS. */
export function mergePersisted<S extends { settings: Settings }>(persisted: unknown, current: S): S {
  const p = (persisted ?? {}) as Partial<S>
  return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } }
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: {},
      settings: DEFAULT_SETTINGS,
      stats: defaultStats,
      cellStats: {},
      reviews: [],

      grade(itemId, grade, today, error) {
        const { progress, stats, reviews } = get()
        let streak = stats.streak
        if (stats.lastStudyDate !== today) streak = stats.lastStudyDate === addDays(today, -1) ? streak + 1 : 1
        // Fuzz + load balancing: the new due date goes to the lightest day of its window (see spreadDue).
        const next = applyGrade(progress[itemId], grade, today, { rand: Math.random, load: dueHistogram(progress) })
        const entry: ReviewEntry = error ? [itemId, today, grade, error] : [itemId, today, grade]
        set({
          progress: { ...progress, [itemId]: next },
          stats: { streak, lastStudyDate: today, totalReviews: stats.totalReviews + 1 },
          reviews: [...reviews, entry],
        })
      },

      recordCell(key, ok, today) {
        const prev = get().cellStats[key] ?? { right: 0, wrong: 0, last: null }
        set({ cellStats: { ...get().cellStats, [key]: { right: prev.right + (ok ? 1 : 0), wrong: prev.wrong + (ok ? 0 : 1), last: today } } })
      },

      setSettings(patch) {
        set({ settings: { ...get().settings, ...patch } })
      },

      setTenseFocus(focus) {
        set({ settings: { ...get().settings, tenseFocus: focus } })
      },

      importBackup(b) {
        set({ progress: b.progress, settings: b.settings, stats: b.stats, cellStats: b.cellStats, reviews: b.reviews })
      },

      resetProgress() {
        set({ progress: {}, stats: defaultStats, cellStats: {}, reviews: [] })
      },
    }),
    {
      name: `sh.progress${storageScope()}`,
      version: 1,
      merge: mergePersisted,
    },
  ),
)

export function makeBackup(s: Pick<ProgressState, 'progress' | 'settings' | 'stats' | 'cellStats' | 'reviews'>): Backup {
  return { app: 'shorashim', version: 1, exportedAt: new Date().toISOString(), progress: s.progress, settings: s.settings, stats: s.stats, cellStats: s.cellStats, reviews: s.reviews }
}
