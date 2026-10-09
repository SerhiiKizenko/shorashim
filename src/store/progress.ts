// Learning progress, settings and streak — persisted to localStorage per device.
// Backup/Restore moves exactly this state as one JSON file.
import { z } from 'zod'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageScope } from '../content/load'
import { addDays, applyGrade, type Grade, type ProgressMap } from '../engine/scheduler'

const Box = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
const ProgressEntry = z.object({
  box: Box,
  due: z.string().nullable(),
  introduced: z.string(),
  lastReviewed: z.string().nullable(),
  lastGrade: z.enum(['again', 'hard', 'good']).nullable(),
  reps: z.number(),
  lapses: z.number(),
})
export const SettingsSchema = z.object({
  examDate: z.string().nullable(),
  theme: z.enum(['auto', 'light', 'dark']),
  onboarded: z.boolean(),
  /** manual override of the daily new-card quota; null = automatic */
  newPerDay: z.number().int().positive().nullable(),
})
export const StatsSchema = z.object({
  streak: z.number(),
  lastStudyDate: z.string().nullable(),
  totalReviews: z.number(),
})
export const BackupSchema = z.object({
  app: z.literal('shorashim'),
  version: z.literal(1),
  exportedAt: z.string(),
  progress: z.record(z.string(), ProgressEntry),
  settings: SettingsSchema,
  stats: StatsSchema,
})
export type Settings = z.infer<typeof SettingsSchema>
export type Stats = z.infer<typeof StatsSchema>
export type Backup = z.infer<typeof BackupSchema>

interface ProgressState {
  progress: ProgressMap
  settings: Settings
  stats: Stats
  grade: (cardId: string, grade: Grade, today: string) => void
  setSettings: (patch: Partial<Settings>) => void
  importBackup: (b: Backup) => void
  resetProgress: () => void
}

const defaultSettings: Settings = { examDate: null, theme: 'auto', onboarded: false, newPerDay: null }
const defaultStats: Stats = { streak: 0, lastStudyDate: null, totalReviews: 0 }

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: {},
      settings: defaultSettings,
      stats: defaultStats,

      grade(cardId, grade, today) {
        const { progress, stats } = get()
        let streak = stats.streak
        if (stats.lastStudyDate !== today) streak = stats.lastStudyDate === addDays(today, -1) ? streak + 1 : 1
        set({
          progress: { ...progress, [cardId]: applyGrade(progress[cardId], grade, today) },
          stats: { streak, lastStudyDate: today, totalReviews: stats.totalReviews + 1 },
        })
      },

      setSettings(patch) {
        set({ settings: { ...get().settings, ...patch } })
      },

      importBackup(b) {
        set({ progress: b.progress, settings: b.settings, stats: b.stats })
      },

      resetProgress() {
        set({ progress: {}, stats: defaultStats })
      },
    }),
    { name: `sh.progress${storageScope()}`, version: 1 },
  ),
)

export function makeBackup(s: Pick<ProgressState, 'progress' | 'settings' | 'stats'>): Backup {
  return { app: 'shorashim', version: 1, exportedAt: new Date().toISOString(), progress: s.progress, settings: s.settings, stats: s.stats }
}
