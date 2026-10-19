// Content model shared by the pipeline scripts (import / validate / encrypt) and the app. Everything the book
// says is data with a page citation: there is no conjugation engine here, only records.
import { z } from 'zod'

// ---------------------------------------------------------------- tenses, forms, shared fields
export const TENSES = ['future', 'past', 'present', 'imperative'] as const
export const TenseSchema = z.enum(TENSES)
export type Tense = z.infer<typeof TenseSchema>
export const TENSE_LABELS: Record<Tense, { en: string; he: string }> = {
  future: { en: 'Future', he: 'עתיד' },
  past: { en: 'Past', he: 'עבר' },
  present: { en: 'Present', he: 'הווה' },
  imperative: { en: 'Imperative', he: 'ציווי' },
}

// ---------------------------------------------------------------- source books
/** Where a record comes from. The main book is «Шэат иврит II» (PDF page = printed page); anything else the
 * teacher photographs — today her verb workbook — gets its own id, its own printed page numbers and its own section
 * in the app. `rank` orders new items across books (the main book first); `prefix` opens the ids of its records
 * (u04-… for a main-book unit, wb-… for the workbook). Pealim (pealim.com) is a reference, not a book: its «page» is
 * the dictionary entry number (pealim.com/dict/2-ledaber → 2), and it supplies the model verbs' full tables. */
export const BOOK_IDS = ['sheat-bet', 'workbook', 'pealim'] as const
export const BookIdSchema = z.enum(BOOK_IDS)
export type BookId = z.infer<typeof BookIdSchema>
export const MAIN_BOOK: BookId = 'sheat-bet'
export const BOOKS: Record<BookId, { title: string; short: string; rank: number; prefix: string }> = {
  'sheat-bet': { title: 'Шэат иврит II', short: 'Book', rank: 0, prefix: 'u' },
  workbook: { title: "the teacher's verb workbook", short: 'Workbook', rank: 1, prefix: 'wb' },
  pealim: { title: 'Pealim (pealim.com)', short: 'Pealim', rank: 2, prefix: 'pl' },
}
/** «p. 54» for the main book, «Workbook p. 40» for another book, «pealim.com/dict/2» for a Pealim entry. */
export const pageLabel = (book: BookId, page: number): string => (book === MAIN_BOOK ? `p. ${page}` : book === 'pealim' ? `pealim.com/dict/${page}` : `${BOOKS[book].short} p. ${page}`)

/** Every Hebrew form keeps how the book prints it (`pointed`) and how an Israeli adult types it (`plain`,
 * ktiv male). `plain` is not the pointed form with the marks stripped: דִּבֵּר → people type דיבר. */
export const HebrewFormSchema = z
  .object({
    pointed: z.string().min(1),
    plain: z.string().min(1),
    /** other accepted spellings */
    variants: z.array(z.string().min(1)).optional(),
  })
  .strict()
export type HebrewForm = z.infer<typeof HebrewFormSchema>

export const ReviewStatus = z.enum(['draft', 'checked'])
/** unreadable: a spot the page render did not settle (`?` in the text) · conflict: two passes or two pages
 * disagree · unsupported: not in the book · generated: a paradigm cell derived from the book's pattern, not
 * yet seen printed. */
export const FlagSchema = z.enum(['unsupported', 'conflict', 'unreadable', 'generated'])
export type Flag = z.infer<typeof FlagSchema>
/** A page citation. `book` defaults to the main book, so content written before the workbook arrived still parses. */
export const SourceSchema = z.object({ book: BookIdSchema.default(MAIN_BOOK), page: z.number().int().positive(), note: z.string().optional() }).strict()
export type Source = z.infer<typeof SourceSchema>

const shared = {
  /** the book the record comes from; its page fields count that book's printed pages */
  book: BookIdSchema.default(MAIN_BOOK),
  /** the main book's unit 1–13; null for a record of another book (the workbook has no units) */
  unit: z.number().int().min(1).max(13).nullable(),
  sources: z.array(SourceSchema).min(1),
  reviewStatus: ReviewStatus,
  flags: z.array(FlagSchema).default([]),
  notes: z.string().optional(),
}

// ---------------------------------------------------------------- vocabulary
export const POS = ['verb', 'noun', 'adjective', 'adverb', 'conjunction', 'preposition', 'phrase', 'pronoun', 'numeral', 'other'] as const
export const PosSchema = z.enum(POS)
export type Pos = z.infer<typeof PosSchema>
export const POS_LABELS: Record<Pos, string> = {
  verb: 'Verbs',
  noun: 'Nouns',
  adjective: 'Adjectives',
  adverb: 'Adverbs',
  conjunction: 'Conjunctions',
  preposition: 'Prepositions',
  phrase: 'Phrases',
  pronoun: 'Pronouns',
  numeral: 'Numerals',
  other: 'Other',
}

export const VocabEntrySchema = z
  .object({
    /** u01-v002: unit, then page order; wb-v-dbr-piel: a workbook verb's entry, named after its verb id */
    id: z.string().regex(/^(u\d{2}-v\d{3}|wb-v-[a-z0-9]+-[a-z]+)$/),
    ...shared,
    pos: PosSchema,
    /** the entry exactly as printed, e.g. «מַבְטִיחַ — לְהַבְטִיחַ ל-» */
    he: z.string().min(1),
    /** infinitive for verbs, singular for nouns, the printed form otherwise */
    lemma: HebrewFormSchema,
    /** verbs: the printed 3 m.s. present */
    present: HebrewFormSchema.optional(),
    /** the book's Russian gloss, as printed */
    ru: z.string().min(1),
    /** English gloss — added text, marked in the UI; not in v1 */
    en: z.string().optional(),
    gender: z.enum(['m', 'f']).optional(),
    /** 'only' for plural-only nouns (ז״ר / נ״ר), or a printed plural */
    plural: z.union([z.literal('only'), HebrewFormSchema]).optional(),
    /** ל-, את, על, ב- … */
    government: z.string().optional(),
    verbId: z.string().optional(),
  })
  .strict()
export type VocabEntry = z.infer<typeof VocabEntrySchema>

// ---------------------------------------------------------------- verbs
export const BINYANIM = ['paal', 'piel', 'hifil', 'hitpael', 'nifal', 'pual', 'hufal'] as const
export const BinyanSchema = z.enum(BINYANIM)
export type Binyan = z.infer<typeof BinyanSchema>
export const BINYAN_LABELS: Record<Binyan, { en: string; he: string }> = {
  paal: { en: "pa'al", he: 'פָּעַל' },
  piel: { en: "pi'el", he: 'פִּיעֵל' },
  hifil: { en: "hif'il", he: 'הִפְעִיל' },
  hitpael: { en: "hitpa'el", he: 'הִתְפַּעֵל' },
  nifal: { en: "nif'al", he: 'נִפְעַל' },
  pual: { en: "pu'al", he: 'פּוּעַל' },
  hufal: { en: "huf'al", he: 'הוּפְעַל' },
}
export const ROOT_GROUPS = ['shlemim', 'ayin-vav', 'ayin-yod', 'pe-yod', 'pe-nun', 'pe-alef', 'lamed-he', 'lamed-alef', 'gutturals', 'ayin-ayin', 'quad'] as const
export const RootGroupSchema = z.enum(ROOT_GROUPS)
export type RootGroup = z.infer<typeof RootGroupSchema>

/** Cell keys stored per tense. Book convention (p.54): no ־נָה forms, so in the future אתן = אתם and הן = הם;
 * the past keeps a distinct אתן. */
export const TENSE_CELLS = {
  future: ['ani', 'ata', 'at', 'anachnu', 'atem', 'hu', 'hi', 'hem'],
  past: ['ani', 'ata', 'at', 'anachnu', 'atem', 'aten', 'hu', 'hi', 'hem'],
  present: ['ms', 'fs', 'mp', 'fp'],
  imperative: ['ata', 'at', 'atem'],
} as const satisfies Record<Tense, readonly string[]>
export type CellKey = (typeof TENSE_CELLS)[Tense][number]

/** One grid column: the pronoun shown and the cell it checks. The teacher's sheet order:
 * שם הפועל | שורש | אני | אתה | את | אנחנו | אתם | אתן | הוא | היא | הם-הן (9 columns for future and past). */
export interface GridColumn {
  label: string
  cell: CellKey
}
const col = (label: string, cell: CellKey): GridColumn => ({ label, cell })
export const GRID_COLUMNS: Record<Tense, GridColumn[]> = {
  future: [col('אני', 'ani'), col('אתה', 'ata'), col('את', 'at'), col('אנחנו', 'anachnu'), col('אתם', 'atem'), col('אתן', 'atem'), col('הוא', 'hu'), col('היא', 'hi'), col('הם-הן', 'hem')],
  past: [col('אני', 'ani'), col('אתה', 'ata'), col('את', 'at'), col('אנחנו', 'anachnu'), col('אתם', 'atem'), col('אתן', 'aten'), col('הוא', 'hu'), col('היא', 'hi'), col('הם-הן', 'hem')],
  present: [col('אני / אתה / הוא', 'ms'), col('אני / את / היא', 'fs'), col('אנחנו / אתם / הם', 'mp'), col('אנחנו / אתן / הן', 'fp')],
  imperative: [col('אתה', 'ata'), col('את', 'at'), col('אתם / אתן', 'atem')],
}

const CellsSchema = z.record(z.string(), HebrewFormSchema)
export const VerbFormsSchema = z
  .object({
    future: CellsSchema.optional(),
    past: CellsSchema.optional(),
    present: CellsSchema.optional(),
    imperative: CellsSchema.optional(),
  })
  .strict()
export type VerbForms = z.infer<typeof VerbFormsSchema>

export const VerbSchema = z
  .object({
    /** v-dbr-piel: root letters (ASCII) + binyan */
    id: z.string().regex(/^v-[a-z0-9]+-[a-z]+$/),
    ...shared,
    infinitive: HebrewFormSchema,
    /** «ד.ב.ר» */
    root: z.string().min(3),
    binyan: BinyanSchema,
    group: RootGroupSchema,
    /** pa'al future vowel type */
    paalType: z.enum(['efol', 'efal']).optional(),
    ru: z.string().optional(),
    /** English gloss as Pealim gives it (model verbs) */
    en: z.string().optional(),
    government: z.string().optional(),
    forms: VerbFormsSchema,
    /** שם הפעולה as printed (דִּבּוּר, הַפְסָקָה, הִסְתַּכְּלוּת) */
    verbalNoun: HebrewFormSchema.optional(),
    /** the cells the book itself prints (tables, examples, answer key), and where */
    checkedAgainst: z.array(z.object({ book: BookIdSchema.default(MAIN_BOOK), page: z.number().int().positive(), tense: TenseSchema, cells: z.array(z.string()) }).strict()).default([]),
    /** a model verb: one per binyan, learnt in every tense (the «Model verbs» section) */
    model: z.boolean().optional(),
    /** the ־נָה forms (future אתן/הן, imperative אתן) — shown for reading, never a cell and never an accepted answer:
     * the teacher's grid uses the masculine form, as modern Hebrew does */
    naForms: z.object({ future: HebrewFormSchema.optional(), imperative: HebrewFormSchema.optional() }).strict().optional(),
    /** one recording per form: clip key (`past.ani`, `infinitive`, `na.future` …) → encrypted file in the data dir */
    audio: z.object({ type: z.string().min(1), clips: z.record(z.string(), z.string().min(1)) }).strict().optional(),
  })
  .strict()
export type Verb = z.infer<typeof VerbSchema>
/** The clip key of a form: `<tense>.<cell>`, `infinitive`, or `na.<tense>` for a ־נָה form. */
export const clipKey = (tense: Tense, cell: string): string => `${tense}.${cell}`

// ---------------------------------------------------------------- grammar topics and exercises
export const GrammarTableSchema = z
  .object({ title: z.string().optional(), columns: z.array(z.string()), rows: z.array(z.array(z.string())) })
  .strict()
export const GrammarTopicSchema = z
  .object({
    /** u04-s2: unit + TOC section number; wb-s40: a workbook topic, numbered by the page of its paradigm table */
    id: z.string().regex(/^(u\d{2}|wb)-s\d+$/),
    ...shared,
    section: z.number().int().positive(),
    titleHe: z.string().min(1),
    titleEn: z.string().min(1),
    pages: z.array(z.number().int().positive()).min(1),
    /** the book's Russian explanation, as printed */
    explanationRu: z.string().optional(),
    /** markdown; a faithful English rendering of the book, page cited */
    explanationEn: z.string().min(1),
    /** the teacher's method, shown labelled as such */
    teacherNote: z.string().optional(),
    tables: z.array(GrammarTableSchema).default([]),
    examples: z.array(z.object({ he: z.string(), ru: z.string().optional(), en: z.string().optional() }).strict()).default([]),
    verbIds: z.array(z.string()).default([]),
    exerciseIds: z.array(z.string()).default([]),
    /** set when the topic is a tense paradigm (drives the Verbs track) */
    tense: TenseSchema.optional(),
    binyan: BinyanSchema.optional(),
    audioTrack: z.number().int().optional(),
  })
  .strict()
export type GrammarTopic = z.infer<typeof GrammarTopicSchema>

/** identify = «שבצו את הפעלים בטבלה»: each item shows one verb form and the learner names its tense and person. */
export const ExerciseKind = z.enum(['transform', 'fill', 'conjugate-in-context', 'match', 'questions', 'open', 'identify'])
/** What an item asks for when the answer is a verb form: the verb, the tense and the person cell(s) that fit the
 * sentence, or the infinitive / verbal noun. The importer fills `answers` from it (the workbook prints no key). */
export const ExerciseTargetSchema = z
  .object({
    verbId: z.string().min(1),
    tense: TenseSchema.optional(),
    /** keys of TENSE_CELLS[tense]; several when more than one person fits (אני in the present: ms and fs) */
    cells: z.array(z.string().min(1)).optional(),
    ask: z.enum(['infinitive', 'verbalNoun']).optional(),
  })
  .strict()
export type ExerciseTarget = z.infer<typeof ExerciseTargetSchema>
export const ExerciseItemSchema = z
  .object({
    /** א, ב, ג … as printed */
    label: z.string().min(1),
    /** as printed; «___» marks a blank */
    prompt: z.string().min(1),
    /** e.g. the infinitive printed under the blank */
    hint: z.string().optional(),
    /** the tense this item asks for, when the exercise mixes tenses */
    tense: TenseSchema.optional(),
    /** the verb form the item asks for (see ExerciseTargetSchema); «identify» items show it in `prompt` */
    target: ExerciseTargetSchema.optional(),
    /** from the answer key; the first is shown on reveal; plain spelling (niqqud never required) */
    answers: z.array(z.string().min(1)).min(1),
    answerPointed: z.string().optional(),
    keyPage: z.number().int().positive().optional(),
    flags: z.array(FlagSchema).default([]),
  })
  .strict()
export const ExerciseSchema = z
  .object({
    /** u04-ex2.1: unit + the book's exercise number; wb-ex40.1: workbook topic page + ordinal (the workbook prints none) */
    id: z.string().regex(/^(u\d{2}|wb)-ex\d+\.\d+$/),
    ...shared,
    page: z.number().int().positive(),
    number: z.string().min(1),
    instructionHe: z.string().min(1),
    /** via the instruction key, pp.186–187 */
    instructionEn: z.string().min(1),
    kind: ExerciseKind,
    items: z.array(ExerciseItemSchema).min(1),
    /** false = open question, self-graded */
    gradable: z.boolean(),
  })
  .strict()
export type Exercise = z.infer<typeof ExerciseSchema>
export type ExerciseItem = z.infer<typeof ExerciseItemSchema>

// ---------------------------------------------------------------- texts, proverbs, prepositions, audio, units
export const TextSchema = z
  .object({
    id: z.string().regex(/^(u\d{2}|wb)-t\d+$/),
    ...shared,
    titleHe: z.string().min(1),
    pages: z.array(z.number().int().positive()).min(1),
    paragraphs: z.array(z.string()),
    audioTrack: z.number().int().optional(),
  })
  .strict()
export type Text = z.infer<typeof TextSchema>

export const ProverbSchema = z
  .object({
    id: z.string().regex(/^(u\d{2}|wb)-p\d+$/),
    ...shared,
    he: z.string().min(1),
    ru: z.string().optional(),
    en: z.string().optional(),
    audioTrack: z.number().int().optional(),
  })
  .strict()
export type Proverb = z.infer<typeof ProverbSchema>

/** Inflected prepositions use the same grid component; ten cells, הן distinct. */
export const PREP_CELLS = ['ani', 'ata', 'at', 'hu', 'hi', 'anachnu', 'atem', 'aten', 'hem', 'hen'] as const
export const PrepositionParadigmSchema = z
  .object({
    id: z.string().regex(/^prep-[a-z]+$/),
    ...shared,
    preposition: HebrewFormSchema,
    ru: z.string().min(1),
    cells: z.record(z.string(), HebrewFormSchema),
    audioTrack: z.number().int().optional(),
  })
  .strict()
export type PrepositionParadigm = z.infer<typeof PrepositionParadigmSchema>

export const AUDIO_KINDS = ['intro', 'text', 'preposition', 'proverbs', 'song', 'saying'] as const
export const AudioTrackSchema = z
  .object({
    track: z.number().int().min(0),
    /** path inside the data directory, e.g. audio/01.enc */
    file: z.string().min(1),
    unit: z.number().int().nullable(),
    pages: z.array(z.number().int()),
    titleHe: z.string().nullable(),
    kind: z.enum(AUDIO_KINDS),
    seconds: z.number(),
  })
  .strict()
export type AudioTrack = z.infer<typeof AudioTrackSchema>

export const UnitMetaSchema = z
  .object({
    unit: z.number().int().min(1).max(13),
    letter: z.string().min(1),
    pages: z.tuple([z.number().int(), z.number().int()]),
    vocabPage: z.number().int(),
    sections: z.array(z.object({ number: z.number().int(), titleHe: z.string(), page: z.number().int() }).strict()).default([]),
  })
  .strict()
export type UnitMeta = z.infer<typeof UnitMetaSchema>

export const COLLECTIONS = ['vocab', 'verbs', 'grammar', 'exercises', 'texts', 'proverbs', 'prepositions'] as const
export type Collection = (typeof COLLECTIONS)[number]

export const BundleSchema = z
  .object({
    version: z.literal(1),
    units: z.array(UnitMetaSchema),
    vocab: z.array(VocabEntrySchema),
    verbs: z.array(VerbSchema),
    grammar: z.array(GrammarTopicSchema),
    exercises: z.array(ExerciseSchema),
    texts: z.array(TextSchema),
    proverbs: z.array(ProverbSchema),
    prepositions: z.array(PrepositionParadigmSchema),
    audio: z.array(AudioTrackSchema),
  })
  .strict()
export type Bundle = z.infer<typeof BundleSchema>
export type BundleInput = z.input<typeof BundleSchema>

export const EMPTY_BUNDLE: BundleInput = { version: 1, units: [], vocab: [], verbs: [], grammar: [], exercises: [], texts: [], proverbs: [], prepositions: [], audio: [] }

/** Vocabulary entries per unit, counted on the page by hand (never from an estimate). Filled as pages are transcribed. */
export const EXPECTED_COUNTS: Partial<Record<number, { vocab: number }>> = {
  1: { vocab: 39 }, // p.8, counted 2026-10-09: 14 verbs, 15 nouns, 6 adverbs, 2 phrases, 1 conjunction, 1 adjective
}

/** Unit letters as the book prints them (יחידה א … יג). */
export const UNIT_LETTERS: Record<number, string> = { 1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט', 10: 'י', 11: 'יא', 12: 'יב', 13: 'יג' }
