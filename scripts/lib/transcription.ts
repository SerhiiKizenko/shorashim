// The record a transcription pass writes for one page: sources/transcribed/pNNN[.passN].json.
// Rules (docs/CONTENT-RULES.md): vowel points exactly as printed; `?` for anything unreadable, with the
// `unreadable` flag; `plain` only when it differs from the pointed form with its marks stripped (the importer
// derives the rest); nothing invented.
import { z } from 'zod'
import { BinyanSchema, ExerciseKind, FlagSchema, HebrewFormSchema, PosSchema, RootGroupSchema, TenseSchema } from '../../src/content/schema'

const Form = z.object({ pointed: z.string().min(1), plain: z.string().min(1).optional(), variants: z.array(z.string()).optional() }).strict()

export const TVocab = z
  .object({
    pos: PosSchema,
    /** the printed heading this entry sits under (e.g. «שמות עצם») */
    heading: z.string().optional(),
    he: z.string().min(1),
    lemma: Form,
    present: Form.optional(),
    ru: z.string().min(1),
    gender: z.enum(['m', 'f']).optional(),
    plural: z.union([z.literal('only'), Form]).optional(),
    government: z.string().optional(),
    flags: z.array(FlagSchema).default([]),
    notes: z.string().optional(),
  })
  .strict()

export const TVerb = z
  .object({
    infinitive: Form,
    root: z.string().min(3),
    binyan: BinyanSchema,
    group: RootGroupSchema,
    paalType: z.enum(['efol', 'efal']).optional(),
    ru: z.string().optional(),
    government: z.string().optional(),
    /** cells the page prints, per tense */
    forms: z.partialRecord(TenseSchema, z.record(z.string(), Form)).optional(),
    flags: z.array(FlagSchema).default([]),
    notes: z.string().optional(),
  })
  .strict()

export const TGrammar = z
  .object({
    section: z.number().int().positive(),
    titleHe: z.string().min(1),
    titleEn: z.string().min(1),
    explanationRu: z.string().optional(),
    explanationEn: z.string().min(1),
    teacherNote: z.string().optional(),
    tables: z.array(z.object({ title: z.string().optional(), columns: z.array(z.string()), rows: z.array(z.array(z.string())) }).strict()).default([]),
    examples: z.array(z.object({ he: z.string(), ru: z.string().optional(), en: z.string().optional() }).strict()).default([]),
    /** infinitives (plain) of the verbs the topic lists */
    verbs: z.array(z.string()).default([]),
    tense: TenseSchema.optional(),
    binyan: BinyanSchema.optional(),
    flags: z.array(FlagSchema).default([]),
    notes: z.string().optional(),
  })
  .strict()

export const TExercise = z
  .object({
    number: z.string().min(1),
    instructionHe: z.string().min(1),
    instructionEn: z.string().min(1),
    kind: ExerciseKind,
    gradable: z.boolean(),
    items: z.array(
      z
        .object({
          label: z.string().min(1),
          prompt: z.string().min(1),
          hint: z.string().optional(),
          tense: TenseSchema.optional(),
          /** filled from the answer key page, if the page itself prints an example answer */
          answers: z.array(z.string()).optional(),
          flags: z.array(FlagSchema).default([]),
        })
        .strict(),
    ),
    flags: z.array(FlagSchema).default([]),
    notes: z.string().optional(),
  })
  .strict()

/** An answer-key page: answers per unit + exercise number + item label. */
export const TKey = z
  .object({
    unit: z.number().int().positive(),
    exercise: z.string().min(1),
    answers: z.array(z.object({ label: z.string().min(1), answers: z.array(z.string().min(1)).min(1), pointed: z.string().optional(), flags: z.array(FlagSchema).default([]) }).strict()),
    notes: z.string().optional(),
  })
  .strict()

export const TText = z.object({ titleHe: z.string().min(1), paragraphs: z.array(z.string()), audioTrack: z.number().int().optional(), flags: z.array(FlagSchema).default([]) }).strict()
export const TProverb = z.object({ he: z.string().min(1), ru: z.string().optional(), flags: z.array(FlagSchema).default([]) }).strict()

export const TranscriptionSchema = z
  .object({
    page: z.number().int().positive(),
    unit: z.number().int().min(1).max(13).nullable(),
    kind: z.enum(['vocab', 'grammar', 'exercises', 'key', 'text', 'proverbs', 'instructions', 'mixed']),
    pass: z.union([z.literal(1), z.literal(2)]),
    readAt: z.string(),
    /** which renders were read */
    images: z.array(z.string()).default([]),
    /** the page text as read, in reading order (used by `pnpm find`) */
    raw: z.string(),
    notes: z.string().optional(),
    vocab: z.array(TVocab).default([]),
    verbs: z.array(TVerb).default([]),
    grammar: z.array(TGrammar).default([]),
    exercises: z.array(TExercise).default([]),
    key: z.array(TKey).default([]),
    texts: z.array(TText).default([]),
    proverbs: z.array(TProverb).default([]),
  })
  .strict()
export type Transcription = z.infer<typeof TranscriptionSchema>
export type TranscriptionInput = z.input<typeof TranscriptionSchema>

export { HebrewFormSchema }
