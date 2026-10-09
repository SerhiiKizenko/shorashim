// Content model shared by the pipeline scripts (validate/encrypt) and the app.
import { z } from 'zod'

export const CardType = z.enum(['recall', 'list', 'mcq', 'match', 'order', 'image'])
export const ReviewStatus = z.enum(['draft', 'checked'])
export const CardFlag = z.enum(['stub', 'unsupported', 'conflict'])

export const SourceSchema = z
  .object({
    file: z.string().min(1),
    /** PDF page (1-based). null = file known, page not verified yet. */
    page: z.number().int().positive().nullable(),
    note: z.string().optional(),
  })
  .strict()

export const MmtSchema = z
  .object({
    ipp: z.string().optional(),
    ipv: z.string().optional(),
    contact: z.string().optional(),
    direction: z.string().optional(),
    separation: z.string().optional(),
    errors: z.array(z.string()).optional(),
  })
  .strict()

export const MuscleSchema = z
  .object({
    latinName: z.string().optional(),
    origin: z.string().optional(),
    insertion: z.string().optional(),
    function: z.string().optional(),
    synergists: z.string().optional(),
    antagonists: z.string().optional(),
    stabilizers: z.string().optional(),
    innervation: z.string().optional(),
    neurolymphatic: z.string().optional(),
    neurovascular: z.string().optional(),
    meridian: z.string().optional(),
    organ: z.string().optional(),
    chain: z.string().optional(),
    mmt: MmtSchema.optional(),
  })
  .strict()

export const CardSchema = z
  .object({
    /** b1-q001, b1-q142-03, b2-m01, b3-m07, b4-s12 */
    id: z.string().regex(/^b[1-4]-[qms]\d{2,3}(-\d{2})?$/),
    block: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    cluster: z.string().min(1),
    clusterTitle: z.string().min(1),
    examNumber: z.number().int().positive(),
    subNumber: z.number().int().positive().optional(),
    type: CardType,
    prompt: z.string().min(3),
    /** Markdown, Russian: short lead sentence, then bullets. */
    answer: z.string().min(1),
    /** «Как сказать на экзамене» — one spoken sentence. */
    examLine: z.string().optional(),
    facts: z.array(z.string()),
    images: z.array(z.string()),
    sources: z.array(SourceSchema),
    latin: z.array(z.string()),
    tags: z.array(z.string()),
    reviewStatus: ReviewStatus,
    flags: z.array(CardFlag).default([]),
    notes: z.string().optional(),
    muscle: MuscleSchema.optional(),
  })
  .strict()

export const BundleSchema = z
  .object({
    version: z.literal(1),
    cards: z.array(CardSchema),
  })
  .strict()

export type Card = z.infer<typeof CardSchema>
export type CardInput = z.input<typeof CardSchema>
export type Source = z.infer<typeof SourceSchema>
export type Muscle = z.infer<typeof MuscleSchema>
export type Bundle = z.infer<typeof BundleSchema>
export type Block = Card['block']

export const EXPECTED_COUNTS: Record<Block, number> = { 1: 169, 2: 36, 3: 41, 4: 32 } // the sheet lists 41 ММТ muscles (counted 2026-10-09)

export const UNSUPPORTED_MARK = '⚠︎ нет в материалах — проверить'
export const UNCONFIRMED_MARK = '⚠︎ не подтверждено в материалах'

/** Block-1 clusters by exam question number (from the kickoff's cluster map). */
export const BLOCK1_CLUSTERS: { key: string; from: number; to: number; title: string }[] = [
  { key: 'A', from: 1, to: 13, title: 'Основы ПК и методы диагностики' },
  { key: 'B', from: 14, to: 28, title: 'Физиология ММТ, тонус, проприоцепция' },
  { key: 'C', from: 29, to: 39, title: 'Триггерные точки, ФУ, нестабильность, спайки' },
  { key: 'D', from: 40, to: 51, title: 'Гипертонус, индикаторы, приоритет, ПНФ' },
  { key: 'E', from: 52, to: 60, title: 'Баланс МФЦ и паттерн шага' },
  { key: 'F', from: 61, to: 69, title: 'Ассоциации, ЗМН, ТМО, Lovett' },
  { key: 'G', from: 70, to: 95, title: 'Миофасциальные цепи' },
  { key: 'H', from: 96, to: 100, title: 'Стабилизаторы' },
  { key: 'I', from: 101, to: 130, title: 'Осанка, визуальная диагностика, регионы' },
  { key: 'J', from: 131, to: 138, title: 'Strain-counterstrain, диафрагмы, стопы' },
  { key: 'K', from: 139, to: 141, title: 'Стресс по Селье' },
  { key: 'L', from: 142, to: 142, title: 'Визуальные критерии 14 мышц' },
  { key: 'M', from: 143, to: 169, title: 'Связочные пары' },
]

export function block1Cluster(n: number): { key: string; title: string } {
  const c = BLOCK1_CLUSTERS.find((c) => n >= c.from && n <= c.to)
  if (!c) throw new Error(`no block-1 cluster for question ${n}`)
  return { key: c.key, title: c.title }
}

/** Display order of muscle-group and skill clusters (Block-1 letters sort naturally). */
export const CLUSTER_ORDER = ['head', 'neck', 'shoulder', 'trunk', 'pelvis', 'leg', 'other', 'vd', 'chains', 'gait', 'corr']
export const clusterRank = (key: string): number => {
  const i = CLUSTER_ORDER.indexOf(key)
  return i < 0 ? -1 : i
}

export const BLOCK_TITLES: Record<Block, string> = {
  1: 'Теория',
  2: 'Анатомия мышц',
  3: 'ММТ',
  4: 'Практические навыки',
}
