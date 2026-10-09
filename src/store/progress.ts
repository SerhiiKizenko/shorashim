// Learning progress, settings and streak — persisted to localStorage per device.
// Backup/Restore moves exactly this state as one JSON file. Progress is keyed by schedule item id
// (`grid:<verb>:<tense>` …), so the tense focus only filters what is shown and never touches it.
import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageScope } from '../content/load'
import { TenseSchema, type Tense } from '../content/schema'
import { addDays, applyGrade, type Grade, type ProgressMap } from '../engine/scheduler'

const BoxSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)])
const ProgressEntry = z.object({
  box: BoxSchema,
  due: z.string(),
  introduced: z.string(),
  lastReviewed: z.string().nullable(),
  lastGrade: z.enum(['again', 'hard', 'good']).nullable(),
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
  grade: (itemId: string, grade: Grade, today: string) => void
  recordCell: (key: string, ok: boolean, today: string) => void
  setSettings: (patch: Partial<Settings>) => void
  setTenseFocus: (focus: Tense[]) => void
  importBackup: (b: Backup) => void
  resetProgress: () => void
}

export const DEFAULT_SETTINGS: Settings = { tenseFocus: ['future'], newPerDay: 10, theme: 'auto', onboarded: false }
const defaultStats: Stats = { streak: 0, lastStudyDate: null, totalReviews: 0 }

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: {},
      settings: DEFAULT_SETTINGS,
      stats: defaultStats,
      cellStats: {},

      grade(itemId, grade, today) {
        const { progress, stats } = get()
        let streak = stats.streak
        if (stats.lastStudyDate !== today) streak = stats.lastStudyDate === addDays(today, -1) ? streak + 1 : 1
        set({
          progress: { ...progress, [itemId]: applyGrade(progress[itemId], grade, today) },
          stats: { streak, lastStudyDate: today, totalReviews: stats.totalReviews + 1 },
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
        set({ progress: b.progress, settings: b.settings, stats: b.stats, cellStats: b.cellStats })
      },

      resetProgress() {
        set({ progress: {}, stats: defaultStats, cellStats: {} })
      },
    }),
    { name: `sh.progress${storageScope()}`, version: 1 },
  ),
)

export function makeBackup(s: Pick<ProgressState, 'progress' | 'settings' | 'stats' | 'cellStats'>): Backup {
  return { app: 'shorashim', version: 1, exportedAt: new Date().toISOString(), progress: s.progress, settings: s.settings, stats: s.stats, cellStats: s.cellStats }
}
