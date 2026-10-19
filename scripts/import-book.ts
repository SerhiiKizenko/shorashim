// Turns the resolved transcriptions (sources/transcribed/pNNN.json) into content/*.json — every record `draft`
// with its page cited — and writes content/import-report.md with counts per unit and part of speech, generated
// paradigm cells, derived plain spellings and open flags. Counts come from the transcriptions, never from
// estimates. Run: pnpm import-book
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BOOK_IDS, MAIN_BOOK, pageLabel, TENSE_CELLS, type Bundle, type BundleInput, type HebrewForm, type Tense } from '../src/content/schema'
import { saveContentFile, stripMarks, translitRoot } from './lib/content'
import { IMPORT_REPORT, INVENTORY_JSON, TRANSCRIBED_DIR } from './lib/paths'
import { generatePlain } from './lib/paradigm'
import { pielFuture } from './lib/piel-future'
import { TranscriptionSchema, type Transcription } from './lib/transcription'

type Vocab = BundleInput['vocab'][number]
type Verb = BundleInput['verbs'][number]
type Grammar = BundleInput['grammar'][number]
type Exercise = BundleInput['exercises'][number]
type Text = BundleInput['texts'][number]
type Proverb = BundleInput['proverbs'][number]

interface Inventory {
  book: { units: { unit: number; letter: string; pages: [number, number]; vocabPage: number }[] }
  audio: { tracks: { track: number; unit: number | null; bookPages: number[]; titleHe: string | null; kind: Bundle['audio'][number]['kind']; seconds: number }[] }
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const pad3 = (n: number) => String(n).padStart(3, '0')
const report: string[] = []
const derivedPlain: string[] = []

/** A transcribed form → a record form: `plain` defaults to the pointed form with its marks stripped. Listed for review
 * unless `quiet` (Pealim prints its ktiv male whenever it differs, so a missing one is not a guess). */
function form(f: { pointed: string; plain?: string; variants?: string[] }, where: string, quiet = false): HebrewForm {
  const pointed = f.pointed.normalize('NFC')
  const plain = (f.plain ?? stripMarks(pointed)).normalize('NFC')
  if (!quiet && !f.plain && /[ְ-ׇ]/.test(pointed)) derivedPlain.push(`${where}: ${pointed} → ${plain}`)
  return { pointed, plain, ...(f.variants ? { variants: f.variants } : {}) }
}

const inventory = JSON.parse(await readFile(INVENTORY_JSON, 'utf8')) as Inventory
// resolved transcriptions only (pass files are skipped), book by book in BOOK_IDS order, pages ascending
const pages: Transcription[] = []
for (const book of BOOK_IDS) {
  const dir = join(TRANSCRIBED_DIR, book)
  // three digits or more: Pealim entry numbers run past 999 (p1993.json)
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => /^p\d{3,}\.json$/.test(f)).sort()
  for (const f of files) {
    const p = TranscriptionSchema.safeParse(JSON.parse(await readFile(join(dir, f), 'utf8')))
    if (!p.success) {
      console.error(`${book}/${f}: ${p.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
      process.exit(1)
    }
    if (p.data.book !== book) {
      console.error(`${book}/${f}: the record says book ${p.data.book}`)
      process.exit(1)
    }
    pages.push(p.data)
  }
}
report.push(`# Import report — ${new Date().toISOString().slice(0, 10)}`, '', `Transcribed pages: ${BOOK_IDS.map((b) => `${b} ${pages.filter((p) => p.book === b).map((p) => p.page).join(', ') || '—'}`).join(' · ')}.`, '')

// ---------------------------------------------------------------- vocabulary (ids in page order per unit)
const vocab: Vocab[] = []
const counter: Record<number, number> = {}
for (const p of pages) {
  if (!p.unit) continue
  for (const v of p.vocab) {
    const n = (counter[p.unit] = (counter[p.unit] ?? 0) + 1)
    const id = `u${pad2(p.unit)}-v${pad3(n)}`
    vocab.push({
      id,
      book: p.book,
      unit: p.unit,
      sources: [{ book: p.book, page: p.page }],
      reviewStatus: 'draft',
      flags: v.flags,
      ...(v.notes ? { notes: v.notes } : {}),
      pos: v.pos,
      he: v.he.normalize('NFC'),
      lemma: form(v.lemma, `${id} lemma`),
      ...(v.present ? { present: form(v.present, `${id} present`) } : {}),
      ru: v.ru.normalize('NFC'),
      ...(v.gender ? { gender: v.gender } : {}),
      ...(v.plural ? { plural: v.plural === 'only' ? 'only' : form(v.plural, `${id} plural`) } : {}),
      ...(v.government ? { government: v.government } : {}),
    })
  }
}

// ---------------------------------------------------------------- verbs: printed cells from every page first
const verbs: Verb[] = []
const generated: string[] = []
const selfCheck: string[] = []
let compared = 0
const conflicts: string[] = []
const isPointed = (s: string) => /[ְ-ׇ]/.test(s)
type Cells = Record<string, HebrewForm>
const formsOf = (v: Verb) => (v.forms ?? (v.forms = {})) as Record<string, Cells>
/** printed cells per verb, `tense.cell` → page, for the generator's self-check */
const printedAt = new Map<string, Map<string, { book: string; page: number }>>()
const rootOf = new Map<string, string>()
/** verbs whose infinitive Pealim prints: its full pointing confirms (or corrects) a derived one. Workbook prints stay
 * out of this — their pointing is partial by design, so the first reading is kept as before. */
const printedInfinitive = new Set<string>()
/** per verb: Pealim's cells checked against the cells an earlier page printed */
const pealimCheck = new Map<string, { compared: number; disagree: number; repointed: number }>()
for (const p of pages) {
  const quiet = p.book === 'pealim'
  for (const tv of p.verbs) {
    const id = `v-${translitRoot(tv.root)}-${tv.binyan}`
    const letters = stripMarks(tv.root).replace(/[^א-ת]/g, '')
    if (rootOf.has(id) && rootOf.get(id) !== letters) throw new Error(`${id}: two roots map to one id (${rootOf.get(id)} / ${letters}) — fix translitRoot before importing`)
    rootOf.set(id, letters)
    let v = verbs.find((x) => x.id === id)
    const infinitive = form(tv.infinitive, `${id} infinitive`, quiet)
    const printsInfinitive = p.book === 'pealim' && isPointed(infinitive.pointed) && !tv.flags.includes('generated')
    if (!v) {
      v = { id, book: p.book, unit: p.unit, sources: [], reviewStatus: 'draft', flags: [], infinitive, root: tv.root.normalize('NFC'), binyan: tv.binyan, group: tv.group, forms: {}, checkedAgainst: [] }
      verbs.push(v)
    } else if (!isPointed(v.infinitive.pointed) && isPointed(infinitive.pointed)) v.infinitive = infinitive
    else if (printsInfinitive && !printedInfinitive.has(id) && v.infinitive.pointed !== infinitive.pointed) {
      // a derived pointing meets a printed one: the print wins
      selfCheck.push(`${id} infinitive: derived ${v.infinitive.pointed}, printed ${infinitive.pointed} (${p.book} p.${p.page}) — the print is kept`)
      v.infinitive = infinitive
    }
    if (printsInfinitive) printedInfinitive.add(id)
    if (!v.sources!.some((s) => s.book === p.book && s.page === p.page)) v.sources!.push({ book: p.book, page: p.page })
    v.flags = [...new Set([...(v.flags ?? []), ...tv.flags])]
    if (tv.notes && !(v.notes ?? '').includes(tv.notes)) v.notes = v.notes ? `${v.notes} · ${tv.notes}` : tv.notes
    if (tv.paalType) v.paalType = tv.paalType
    if (tv.ru && !v.ru) v.ru = tv.ru.normalize('NFC')
    if (tv.en && !v.en) v.en = tv.en
    if (tv.government && !v.government) v.government = tv.government
    // Pealim: a model verb, its ־נָה forms (for reading only) and one recording per form (encrypted by pnpm encrypt)
    if (tv.model) v.model = true
    if (tv.naForms) v.naForms = Object.fromEntries(Object.entries(tv.naForms).map(([t, f]) => [t, form(f, `${id} ־נָה ${t}`, quiet)]))
    if (tv.audio?.length) v.audio = { type: 'audio/mpeg', clips: Object.fromEntries(tv.audio.map((k) => [k, `forms/${id}/${k}.enc`])) }
    const forms = formsOf(v)
    const at = printedAt.get(id) ?? new Map()
    printedAt.set(id, at)
    for (const [tense, cells] of Object.entries(tv.forms ?? {})) {
      const t = forms[tense] ?? (forms[tense] = {})
      const printed: string[] = []
      for (const [cell, f] of Object.entries(cells ?? {})) {
        if (!(TENSE_CELLS[tense as Tense] as readonly string[]).includes(cell)) throw new Error(`${id}: unknown cell ${tense}.${cell} on ${p.book} p.${p.page}`)
        const next = form(f, `${id} ${tense}.${cell}`, quiet)
        const prev = t[cell]
        if (prev && p.book === 'pealim') {
          const c = pealimCheck.get(id) ?? { compared: 0, disagree: 0, repointed: 0 }
          c.compared++
          if (prev.plain !== next.plain) c.disagree++
          // same letters, different points: a page's partial pointing gives way to Pealim's complete one (decided
          // 2026-10-19 — the model verbs are read and heard, so text and recording should match)
          else if (prev.pointed !== next.pointed) {
            c.repointed++
            t[cell] = next
          }
          pealimCheck.set(id, c)
        }
        if (prev && prev.plain !== next.plain) {
          // two printed cells disagree: keep the first, flag both
          conflicts.push(`${id} ${tense}.${cell}: ${prev.plain} vs ${next.plain} (${p.book} p.${p.page})`)
          if (!v.flags!.includes('conflict')) v.flags!.push('conflict')
          continue
        }
        if (!prev || (!isPointed(prev.pointed) && isPointed(next.pointed))) t[cell] = next
        printed.push(cell)
        at.set(`${tense}.${cell}`, { book: p.book, page: p.page })
      }
      if (printed.length) v.checkedAgainst!.push({ book: p.book, page: p.page, tense: tense as Tense, cells: printed })
    }
    if (tv.verbalNoun) {
      const vn = form(tv.verbalNoun, `${id} verbalNoun`)
      if (v.verbalNoun && v.verbalNoun.plain !== vn.plain) conflicts.push(`${id} verbal noun: ${v.verbalNoun.plain} vs ${vn.plain} (${p.book} p.${p.page})`)
      else if (!v.verbalNoun || (!isPointed(v.verbalNoun.pointed) && isPointed(vn.pointed))) v.verbalNoun = vn
      at.set('verbalNoun', { book: p.book, page: p.page })
    }
  }
}
/** verbal nouns the pages print (the rest are generated) */
const printedNoun = new Set([...printedAt].filter(([, at]) => at.has('verbalNoun')).map(([id]) => id))

// ---------------------------------------------------------------- verbs: generated cells for what no page prints
const sameForm = (a: string, b: HebrewForm) => [b.plain, stripMarks(b.pointed), ...(b.variants ?? [])].map((x) => x.normalize('NFC')).includes(a)
for (const v of verbs) {
  const forms = formsOf(v)
  const before = Object.values(forms).reduce((n, c) => n + Object.keys(c).length, 0)
  const missing: string[] = []
  // pi'el future from a pointed infinitive: the book's own pattern (p.54), pointed
  if (v.binyan === 'piel' && ['shlemim', 'quad', 'ayin-yod', 'gutturals'].includes(v.group) && isPointed(v.infinitive.pointed)) {
    const gen = pielFuture(v.infinitive)
    const t = forms.future ?? (forms.future = {})
    for (const c of TENSE_CELLS.future) if (!t[c]) {
      t[c] = gen[c as keyof typeof gen]
      missing.push(`future.${c}`)
    }
  }
  const plain = generatePlain(v.binyan, v.group, v.root)
  if (plain) {
    for (const [tense, cells] of Object.entries(plain.forms)) {
      const t = forms[tense] ?? (forms[tense] = {})
      for (const [c, f] of Object.entries(cells ?? {})) {
        const variants = plain.variants[`${tense}.${c}`]
        // self-check: the pattern against every cell a page prints
        const printed = t[c]
        if (printed && printedAt.get(v.id)?.has(`${tense}.${c}`)) {
          compared++
          if (!sameForm(f, printed)) selfCheck.push(`${v.id} ${tense}.${c}: printed ${printed.plain}, pattern gives ${f}`)
        }
        if (!t[c]) {
          t[c] = { pointed: f, plain: f, ...(variants ? { variants } : {}) }
          missing.push(`${tense}.${c}`)
        }
      }
    }
    if (plain.verbalNoun) {
      if (v.verbalNoun && printedNoun.has(v.id)) compared++
      if (v.verbalNoun && printedNoun.has(v.id) && !sameForm(plain.verbalNoun, v.verbalNoun)) selfCheck.push(`${v.id} verbal noun: printed ${v.verbalNoun.plain}, pattern gives ${plain.verbalNoun}`)
      if (!v.verbalNoun) {
        v.verbalNoun = { pointed: plain.verbalNoun, plain: plain.verbalNoun, ...(plain.variants.verbalNoun ? { variants: plain.variants.verbalNoun } : {}) }
        missing.push('verbalNoun')
        if (plain.verbalNounNote) v.notes = v.notes ? `${v.notes} · ${plain.verbalNounNote}` : plain.verbalNounNote
      }
    }
    if (stripMarks(v.infinitive.pointed) !== plain.infinitive && v.infinitive.plain !== plain.infinitive) selfCheck.push(`${v.id} infinitive: printed ${v.infinitive.plain}, pattern gives ${plain.infinitive}`)
  }
  if (missing.length) {
    if (!v.flags!.includes('generated')) v.flags!.push('generated')
    generated.push(`${v.id}: ${missing.length} generated (${before} printed) — ${[...new Set(missing.map((m) => m.split('.')[0]))].join(', ')}`)
  } else if (printedInfinitive.has(v.id) && v.flags!.includes('generated')) {
    // nothing generated, and Pealim prints the infinitive: the `generated` a transcription put on its derived
    // infinitive (or pointing) no longer holds
    v.flags = v.flags!.filter((f) => f !== 'generated')
    generated.push(`${v.id}: no cell generated; the derived infinitive is now printed (${v.sources!.map((s) => pageLabel(s.book ?? MAIN_BOOK, s.page)).join(', ')}) — flag cleared`)
  }
  for (const [tense, cells] of Object.entries(forms)) if (!Object.keys(cells).length) delete forms[tense]
}
for (const v of verbs) {
  const vocabEntry = vocab.find((x) => x.pos === 'verb' && x.lemma.plain === v.infinitive.plain)
  if (vocabEntry) {
    vocabEntry.verbId = v.id
    if (!v.ru) v.ru = vocabEntry.ru
    if (!v.government && vocabEntry.government) v.government = vocabEntry.government
  }
}

// ---------------------------------------------------------------- workbook verbs as vocabulary (the new words)
// sources/transcribed/<book>/glosses.json: { "<plain infinitive>": "<Russian>" } for a book that prints no glosses
const glosses: Record<string, string> = {}
for (const book of BOOK_IDS) Object.assign(glosses, JSON.parse(await readFile(join(TRANSCRIBED_DIR, book, 'glosses.json'), 'utf8').catch(() => '{}')) as Record<string, string>)
for (const v of verbs) if (!v.ru && glosses[v.infinitive.plain]) v.ru = glosses[v.infinitive.plain]!.normalize('NFC')
const noGloss: string[] = []
for (const v of verbs) {
  if (!v.sources!.some((s) => s.book === 'workbook')) continue
  if (vocab.some((x) => x.pos === 'verb' && x.lemma.plain === v.infinitive.plain)) continue
  if (!v.ru) {
    noGloss.push(v.id)
    continue
  }
  vocab.push({
    id: `wb-${v.id}`,
    book: 'workbook',
    unit: null,
    sources: v.sources!.filter((s) => s.book === 'workbook'),
    reviewStatus: 'draft',
    flags: ['unsupported'],
    notes: 'The workbook prints no gloss: the Russian is added from general usage — confirm with the teacher.',
    pos: 'verb',
    he: v.infinitive.pointed,
    lemma: v.infinitive,
    ...(v.forms?.present?.ms ? { present: v.forms.present.ms } : {}),
    ru: v.ru,
    verbId: v.id,
  })
}

// ---------------------------------------------------------------- exercises (+ answers from the key, or from the paradigm)
const exercises: Exercise[] = []
const unresolved: string[] = []
const exId = (book: string, unit: number | null, number: string) => (book === 'workbook' ? `wb-ex${number}` : `u${pad2(unit!)}-ex${number}`)
const findVerb = (inf: string) => verbs.find((v) => v.infinitive.plain === inf || stripMarks(v.infinitive.pointed) === inf)
/** every accepted spelling of a cell: the plain form, then its variants */
const spellings = (f: HebrewForm) => [f.plain, ...(f.variants ?? [])].map((x) => x.normalize('NFC'))
for (const p of pages) {
  if (p.book !== 'workbook' && !p.unit) continue
  for (const te of p.exercises) {
    const id = exId(p.book, p.unit, te.number)
    const items = te.items.map((it) => {
      const base = { label: it.label, prompt: it.prompt.normalize('NFC'), ...(it.hint ? { hint: it.hint.normalize('NFC') } : {}), ...(it.tense ? { tense: it.tense } : {}) }
      if (p.book !== 'workbook') return { ...base, answers: (it.answers ?? ['?']).map((a) => a.normalize('NFC')), flags: it.answers ? it.flags : [...new Set([...it.flags, 'unreadable' as const])] }
      // workbook: the answer is the verb's own cell(s); printed example answers win
      const v = it.verb ? findVerb(it.verb.normalize('NFC')) : undefined
      const flags = new Set(it.flags)
      let answers = it.answers?.map((a) => a.normalize('NFC'))
      let answerPointed: string | undefined
      if (!v) unresolved.push(`${id} ${it.label}: verb ${it.verb ?? '(none)'} has no record`)
      const target = v ? { verbId: v.id, ...(it.tense ? { tense: it.tense } : {}), ...(it.cells ? { cells: it.cells } : {}), ...(it.ask ? { ask: it.ask } : {}) } : undefined
      if (v && !answers) {
        const printed = printedAt.get(v.id)
        if (te.kind === 'identify') answers = [stripMarks(it.prompt.normalize('NFC'))]
        else if (it.ask === 'infinitive') {
          // «תוכל ל___»: the page prints the ל, the learner types the rest (the full infinitive is accepted too)
          const glued = /ל_{3}/.test(it.prompt)
          const full = [...new Set([v.infinitive.plain, stripMarks(v.infinitive.pointed)])]
          answers = glued ? [...new Set([...full.map((f) => f.replace(/^ל/, '')), ...full])] : full
          if (isPointed(v.infinitive.pointed) && !glued) answerPointed = v.infinitive.pointed
          if (v.flags!.includes('generated') && !isPointed(v.infinitive.pointed)) flags.add('generated')
        } else if (it.ask === 'verbalNoun') {
          if (v.verbalNoun) {
            answers = spellings(v.verbalNoun)
            if (isPointed(v.verbalNoun.pointed)) answerPointed = v.verbalNoun.pointed
            if (!printedNoun.has(v.id)) flags.add('generated')
          }
        } else if (it.tense && it.cells?.length) {
          const cells = it.cells.map((c) => v.forms?.[it.tense!]?.[c]).filter((f): f is HebrewForm => !!f)
          if (cells.length === it.cells.length) {
            answers = [...new Set(cells.flatMap(spellings))]
            const first = cells[0]!
            if (isPointed(first.pointed)) answerPointed = first.pointed
            if (it.cells.some((c) => !printed?.has(`${it.tense}.${c}`))) flags.add('generated')
          }
        }
        if (!answers) unresolved.push(`${id} ${it.label}: ${v.id} has no ${it.ask ?? `${it.tense}.${it.cells?.join('/')}`}`)
      }
      return { ...base, ...(target ? { target } : {}), answers: answers ?? ['?'], ...(answerPointed ? { answerPointed } : {}), ...(p.book === 'workbook' && it.answers ? { keyPage: p.page } : {}), flags: [...flags] }
    })
    exercises.push({
      id,
      book: p.book,
      unit: p.unit,
      sources: [{ book: p.book, page: p.page }],
      reviewStatus: 'draft',
      flags: te.flags,
      ...(te.notes ? { notes: te.notes } : {}),
      page: p.page,
      number: te.number,
      instructionHe: te.instructionHe.normalize('NFC'),
      instructionEn: te.instructionEn,
      kind: te.kind,
      gradable: te.gradable,
      items,
    })
  }
}
const missingAnswers: string[] = []
for (const p of pages) {
  for (const k of p.key) {
    const ex = exercises.find((e) => e.book !== 'workbook' && e.unit === k.unit && e.number === k.exercise)
    if (!ex) {
      report.push(`- key p.${p.page}: unit ${k.unit} exercise ${k.exercise} has answers but no transcribed exercise yet`)
      continue
    }
    for (const a of k.answers) {
      const it = ex.items.find((x) => x.label === a.label)
      if (!it) {
        report.push(`- ${ex.id}: key p.${p.page} answers item ${a.label}, which the exercise does not have`)
        continue
      }
      it.answers = a.answers.map((s) => s.normalize('NFC'))
      if (a.pointed) it.answerPointed = a.pointed.normalize('NFC')
      it.keyPage = p.page
      it.flags = [...new Set([...(it.flags ?? []).filter((f) => f !== 'unreadable'), ...a.flags])]
      if (!ex.sources!.some((s) => s.page === p.page)) ex.sources!.push({ page: p.page, note: 'answer key' })
    }
  }
}
for (const ex of exercises) for (const it of ex.items) if (ex.gradable && it.answers.every((a) => a === '?')) missingAnswers.push(`${ex.id} ${it.label}`)

// ---------------------------------------------------------------- grammar topics, texts, proverbs
const grammar: Grammar[] = []
for (const p of pages) {
  if (p.book !== 'workbook' && !p.unit) continue
  for (const g of p.grammar) {
    const id = p.book === 'workbook' ? `wb-s${g.section}` : `u${pad2(p.unit!)}-s${g.section}`
    const existing = grammar.find((x) => x.id === id)
    const tableVerbIds = g.verbs.map((inf) => findVerb(inf)?.id).filter((x): x is string => !!x)
    const missingVerbs = g.verbs.filter((inf) => !findVerb(inf))
    if (missingVerbs.length) report.push(`- ${id}: verbs without a paradigm record: ${missingVerbs.join(' ')}`)
    const mine = exercises.filter((e) => e.book === p.book && (p.book === 'workbook' || e.unit === p.unit) && e.number.startsWith(`${g.section}.`))
    // a workbook topic covers every verb of its pages: the table's, and every verb its exercises ask for
    const topicPages = new Set([p.page, ...mine.map((e) => e.page)])
    const pageVerbIds = p.book === 'workbook' ? pages.filter((x) => x.book === 'workbook' && topicPages.has(x.page)).flatMap((x) => x.verbs.map((tv) => `v-${translitRoot(tv.root)}-${tv.binyan}`)) : []
    const rec: Grammar = {
      id,
      book: p.book,
      unit: p.unit,
      sources: [...(existing?.sources ?? []), { book: p.book, page: p.page }],
      reviewStatus: 'draft',
      flags: g.flags,
      ...(g.notes ? { notes: g.notes } : {}),
      section: g.section,
      titleHe: g.titleHe.normalize('NFC'),
      titleEn: g.titleEn,
      pages: [...new Set([...(existing?.pages ?? []), p.page, ...(p.book === 'workbook' ? mine.map((e) => e.page) : [])])].sort((a, b) => a - b),
      ...(g.explanationRu ? { explanationRu: g.explanationRu.normalize('NFC') } : {}),
      explanationEn: g.explanationEn.normalize('NFC'),
      ...(g.teacherNote ? { teacherNote: g.teacherNote.normalize('NFC') } : {}),
      tables: g.tables.map((t) => ({ ...t, columns: t.columns.map((c) => c.normalize('NFC')), rows: t.rows.map((r) => r.map((c) => c.normalize('NFC'))) })),
      examples: g.examples.map((e) => ({ ...e, he: e.he.normalize('NFC') })),
      verbIds: [...new Set([...(existing?.verbIds ?? []), ...tableVerbIds, ...pageVerbIds])],
      exerciseIds: [...new Set([...(existing?.exerciseIds ?? []), ...mine.map((e) => e.id)])],
      ...(g.tense ? { tense: g.tense } : {}),
      ...(g.binyan ? { binyan: g.binyan } : {}),
    }
    if (existing) Object.assign(existing, rec)
    else grammar.push(rec)
  }
}
const texts: Text[] = []
const proverbs: Proverb[] = []
const tCount: Record<string, number> = {}
const pCount: Record<string, number> = {}
for (const p of pages) {
  if (p.book !== 'workbook' && !p.unit) continue
  const prefix = p.book === 'workbook' ? 'wb' : `u${pad2(p.unit!)}`
  for (const t of p.texts) {
    const n = (tCount[prefix] = (tCount[prefix] ?? 0) + 1)
    texts.push({ id: `${prefix}-t${n}`, book: p.book, unit: p.unit, sources: [{ book: p.book, page: p.page }], reviewStatus: 'draft', flags: t.flags, titleHe: t.titleHe.normalize('NFC'), pages: [p.page], paragraphs: t.paragraphs.map((x) => x.normalize('NFC')), ...(t.audioTrack !== undefined ? { audioTrack: t.audioTrack } : {}) })
  }
  for (const pr of p.proverbs) {
    const n = (pCount[prefix] = (pCount[prefix] ?? 0) + 1)
    proverbs.push({ id: `${prefix}-p${n}`, book: p.book, unit: p.unit, sources: [{ book: p.book, page: p.page }], reviewStatus: 'draft', flags: pr.flags, he: pr.he.normalize('NFC'), ...(pr.ru ? { ru: pr.ru } : {}) })
  }
}

// ---------------------------------------------------------------- units + audio from the inventory
const units = inventory.book.units.map((u) => ({ unit: u.unit, letter: u.letter, pages: u.pages, vocabPage: u.vocabPage, sections: [] }))
const audio = inventory.audio.tracks.map((t) => ({ track: t.track, file: `audio/${pad2(t.track)}.enc`, unit: t.unit, pages: t.bookPages, titleHe: t.titleHe ? t.titleHe.normalize('NFC') : null, kind: t.kind, seconds: t.seconds }))

await saveContentFile('vocab', vocab)
await saveContentFile('verbs', verbs)
await saveContentFile('grammar', grammar)
await saveContentFile('exercises', exercises)
await saveContentFile('texts', texts)
await saveContentFile('proverbs', proverbs)
await saveContentFile('prepositions', [])
await saveContentFile('units', units)
await saveContentFile('audio', audio)

// ---------------------------------------------------------------- report
report.push('', '## Vocabulary per unit and part of speech', '', '| unit | page | total | by part of speech |', '|---|---|---|---|')
for (const u of units) {
  const mine = vocab.filter((v) => v.unit === u.unit)
  if (!mine.length) continue
  const byPos: Record<string, number> = {}
  for (const v of mine) byPos[v.pos] = (byPos[v.pos] ?? 0) + 1
  report.push(`| ${u.unit} | ${u.vocabPage} | ${mine.length} | ${Object.entries(byPos).map(([p, n]) => `${p} ${n}`).join(', ')} |`)
}
report.push('', `## Verbs: ${verbs.length} (${verbs.filter((v) => v.flags?.includes('generated')).length} with generated cells)`, '', ...generated.map((g) => `- ${g}`))
report.push('', `## Exercises: ${exercises.length}; items without an answer: ${missingAnswers.length}`, '', ...missingAnswers.map((m) => `- ${m}`))
report.push('', `## Generator vs print (G3 self-check): ${compared} printed cells compared, ${selfCheck.length} mismatch(es)`, '', ...selfCheck.map((m) => `- ${m}`))
report.push('', `## Printed cells that disagree: ${conflicts.length}`, '', ...conflicts.map((m) => `- ${m}`))
const models = verbs.filter((v) => v.model)
report.push(
  '',
  `## Model verbs (Pealim): ${models.length}`,
  '',
  ...models.map((v) => {
    const cells = Object.values(formsOf(v)).reduce((n, c) => n + Object.keys(c).length, 0)
    const pc = pealimCheck.get(v.id)
    const pattern = selfCheck.filter((s) => s.startsWith(`${v.id} `)).length
    return `- ${v.id} ${v.infinitive.pointed} (${v.binyan}): ${cells} cells, ${Object.keys(v.audio?.clips ?? {}).length} clips · ${v.sources!.map((s) => pageLabel(s.book ?? MAIN_BOOK, s.page)).join(', ')} · Pealim vs earlier prints: ${pc ? `${pc.compared} cells compared, ${pc.disagree} disagree, ${pc.repointed} take Pealim's pointing` : 'nothing printed earlier'} · pattern self-check: ${pattern} mismatch(es) · flags: ${v.flags!.join(', ') || 'none'}`
  }),
)
report.push('', `## Workbook items whose answer could not be derived: ${unresolved.length}`, '', ...unresolved.map((m) => `- ${m}`))
report.push('', `## Workbook verbs without a gloss (no word card): ${noGloss.length}`, '', ...noGloss.map((m) => `- ${m}`))
const wb = (xs: { book?: string }[]) => xs.filter((x) => x.book === 'workbook').length
report.push('', `## Workbook: ${wb(vocab)} words · ${wb(verbs)} verbs first seen there (${verbs.filter((v) => v.sources!.some((s) => s.book === 'workbook')).length} on its pages) · ${wb(grammar)} topics · ${wb(exercises)} exercises, ${exercises.filter((e) => e.book === 'workbook').reduce((n, e) => n + e.items.length, 0)} items · ${wb(proverbs)} sayings`)
report.push('', `## Grammar topics: ${grammar.length} · texts: ${texts.length} · proverbs: ${proverbs.length}`)
const flagged = [...vocab, ...verbs, ...grammar, ...exercises, ...texts, ...proverbs].filter((r) => r.flags?.length)
report.push('', `## Flagged records: ${flagged.length}`, '', ...flagged.map((r) => `- ${r.id}: ${r.flags!.join(', ')}${'notes' in r && r.notes ? ` — ${r.notes}` : ''}`))
report.push('', `## Plain spellings derived from the pointed form (review: ktiv male may differ): ${derivedPlain.length}`, '', ...derivedPlain.map((d) => `- ${d}`))
await writeFile(IMPORT_REPORT, report.join('\n') + '\n')
console.log(`import: ${vocab.length} vocab, ${verbs.length} verbs, ${grammar.length} grammar, ${exercises.length} exercises, ${texts.length} texts, ${proverbs.length} proverbs → content/*.json; report in content/import-report.md`)
