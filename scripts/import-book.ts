// Turns the resolved transcriptions (sources/transcribed/pNNN.json) into content/*.json — every record `draft`
// with its page cited — and writes content/import-report.md with counts per unit and part of speech, generated
// paradigm cells, derived plain spellings and open flags. Counts come from the transcriptions, never from
// estimates. Run: pnpm import-book
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { TENSE_CELLS, type Bundle, type BundleInput, type Flag, type HebrewForm, type Tense } from '../src/content/schema'
import { saveContentFile, stripMarks, translitRoot } from './lib/content'
import { IMPORT_REPORT, INVENTORY_JSON, TRANSCRIBED_DIR } from './lib/paths'
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

/** A transcribed form → a record form: `plain` defaults to the pointed form with its marks stripped. */
function form(f: { pointed: string; plain?: string; variants?: string[] }, where: string): HebrewForm {
  const pointed = f.pointed.normalize('NFC')
  const plain = (f.plain ?? stripMarks(pointed)).normalize('NFC')
  if (!f.plain && /[ְ-ׇ]/.test(pointed)) derivedPlain.push(`${where}: ${pointed} → ${plain}`)
  return { pointed, plain, ...(f.variants ? { variants: f.variants } : {}) }
}

const inventory = JSON.parse(await readFile(INVENTORY_JSON, 'utf8')) as Inventory
const files = (await readdir(TRANSCRIBED_DIR).catch(() => [] as string[])).filter((f) => /^p\d{3}\.json$/.test(f)).sort()
const pages: Transcription[] = []
for (const f of files) {
  const p = TranscriptionSchema.safeParse(JSON.parse(await readFile(join(TRANSCRIBED_DIR, f), 'utf8')))
  if (!p.success) {
    console.error(`${f}: ${p.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
    process.exit(1)
  }
  pages.push(p.data)
}
report.push(`# Import report — ${new Date().toISOString().slice(0, 10)}`, '', `Transcribed pages: ${pages.map((p) => p.page).join(', ') || 'none'}.`, '')

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
      unit: p.unit,
      sources: [{ page: p.page }],
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

// ---------------------------------------------------------------- verbs (printed cells + generated pi'el future)
const verbs: Verb[] = []
const generated: string[] = []
for (const p of pages) {
  for (const tv of p.verbs) {
    const id = `v-${translitRoot(tv.root)}-${tv.binyan}`
    const existing = verbs.find((v) => v.id === id)
    const forms: Record<string, Record<string, HebrewForm>> = existing ? ((existing.forms as Record<string, Record<string, HebrewForm>>) ?? {}) : {}
    const checkedAgainst = existing?.checkedAgainst ?? []
    for (const [tense, cells] of Object.entries(tv.forms ?? {})) {
      const t = forms[tense] ?? (forms[tense] = {})
      const printed: string[] = []
      for (const [cell, f] of Object.entries(cells ?? {})) {
        if (!(TENSE_CELLS[tense as Tense] as readonly string[]).includes(cell)) throw new Error(`${id}: unknown cell ${tense}.${cell} on p.${p.page}`)
        t[cell] = form(f, `${id} ${tense}.${cell}`)
        printed.push(cell)
      }
      if (printed.length) checkedAgainst.push({ page: p.page, tense: tense as Tense, cells: printed })
    }
    const flags: Flag[] = [...new Set([...(existing?.flags ?? []), ...tv.flags])]
    const vocabEntry = vocab.find((v) => v.pos === 'verb' && v.lemma.plain === tv.infinitive.plain)
    const infinitive = form(tv.infinitive, `${id} infinitive`)
    // pi'el, regular or quadriliteral: fill the future from the book's pattern (p.54) where the page prints nothing
    if (tv.binyan === 'piel' && (tv.group === 'shlemim' || tv.group === 'quad')) {
      const gen = pielFuture(infinitive)
      const t = forms.future ?? (forms.future = {})
      const missing = (TENSE_CELLS.future as readonly string[]).filter((c) => !t[c])
      for (const c of missing) t[c] = gen[c as keyof typeof gen]
      if (missing.length) {
        if (!flags.includes('generated')) flags.push('generated')
        generated.push(`${id}: future ${missing.join(', ')}`)
      }
    }
    const rec: Verb = {
      id,
      unit: p.unit ?? existing?.unit ?? 1,
      sources: [...(existing?.sources ?? []), { page: p.page }],
      reviewStatus: 'draft',
      flags,
      ...(tv.notes ? { notes: tv.notes } : {}),
      infinitive,
      root: tv.root.normalize('NFC'),
      binyan: tv.binyan,
      group: tv.group,
      ...(tv.paalType ? { paalType: tv.paalType } : {}),
      ...(tv.ru ?? vocabEntry?.ru ? { ru: (tv.ru ?? vocabEntry?.ru)! } : {}),
      ...(tv.government ?? vocabEntry?.government ? { government: (tv.government ?? vocabEntry?.government)! } : {}),
      forms,
      checkedAgainst,
    }
    if (existing) Object.assign(existing, rec)
    else verbs.push(rec)
    if (vocabEntry) vocabEntry.verbId = id
  }
}

// ---------------------------------------------------------------- exercises + answer key
const exercises: Exercise[] = []
for (const p of pages) {
  if (!p.unit) continue
  for (const te of p.exercises) {
    exercises.push({
      id: `u${pad2(p.unit)}-ex${te.number}`,
      unit: p.unit,
      sources: [{ page: p.page }],
      reviewStatus: 'draft',
      flags: te.flags,
      ...(te.notes ? { notes: te.notes } : {}),
      page: p.page,
      number: te.number,
      instructionHe: te.instructionHe.normalize('NFC'),
      instructionEn: te.instructionEn,
      kind: te.kind,
      gradable: te.gradable,
      items: te.items.map((it) => ({ label: it.label, prompt: it.prompt.normalize('NFC'), ...(it.hint ? { hint: it.hint.normalize('NFC') } : {}), ...(it.tense ? { tense: it.tense } : {}), answers: (it.answers ?? ['?']).map((a) => a.normalize('NFC')), flags: it.answers ? it.flags : [...new Set([...it.flags, 'unreadable' as const])] })),
    })
  }
}
const missingAnswers: string[] = []
for (const p of pages) {
  for (const k of p.key) {
    const ex = exercises.find((e) => e.unit === k.unit && e.number === k.exercise)
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
  if (!p.unit) continue
  for (const g of p.grammar) {
    const id = `u${pad2(p.unit)}-s${g.section}`
    const existing = grammar.find((x) => x.id === id)
    const verbIds = g.verbs.map((inf) => verbs.find((v) => v.infinitive.plain === inf)?.id).filter((x): x is string => !!x)
    const unresolved = g.verbs.filter((inf) => !verbs.some((v) => v.infinitive.plain === inf))
    if (unresolved.length) report.push(`- ${id}: verbs without a paradigm record: ${unresolved.join(' ')}`)
    const exerciseIds = exercises.filter((e) => e.unit === p.unit && e.number.startsWith(`${g.section}.`)).map((e) => e.id)
    const rec: Grammar = {
      id,
      unit: p.unit,
      sources: [...(existing?.sources ?? []), { page: p.page }],
      reviewStatus: 'draft',
      flags: g.flags,
      ...(g.notes ? { notes: g.notes } : {}),
      section: g.section,
      titleHe: g.titleHe.normalize('NFC'),
      titleEn: g.titleEn,
      pages: [...new Set([...(existing?.pages ?? []), p.page])],
      ...(g.explanationRu ? { explanationRu: g.explanationRu.normalize('NFC') } : {}),
      explanationEn: g.explanationEn.normalize('NFC'),
      ...(g.teacherNote ? { teacherNote: g.teacherNote.normalize('NFC') } : {}),
      tables: g.tables.map((t) => ({ ...t, columns: t.columns.map((c) => c.normalize('NFC')), rows: t.rows.map((r) => r.map((c) => c.normalize('NFC'))) })),
      examples: g.examples.map((e) => ({ ...e, he: e.he.normalize('NFC') })),
      verbIds: [...new Set([...(existing?.verbIds ?? []), ...verbIds])],
      exerciseIds: [...new Set([...(existing?.exerciseIds ?? []), ...exerciseIds])],
      ...(g.tense ? { tense: g.tense } : {}),
      ...(g.binyan ? { binyan: g.binyan } : {}),
    }
    if (existing) Object.assign(existing, rec)
    else grammar.push(rec)
  }
}
const texts: Text[] = []
const proverbs: Proverb[] = []
const tCount: Record<number, number> = {}
const pCount: Record<number, number> = {}
for (const p of pages) {
  if (!p.unit) continue
  for (const t of p.texts) {
    const n = (tCount[p.unit] = (tCount[p.unit] ?? 0) + 1)
    texts.push({ id: `u${pad2(p.unit)}-t${n}`, unit: p.unit, sources: [{ page: p.page }], reviewStatus: 'draft', flags: t.flags, titleHe: t.titleHe.normalize('NFC'), pages: [p.page], paragraphs: t.paragraphs.map((x) => x.normalize('NFC')), ...(t.audioTrack !== undefined ? { audioTrack: t.audioTrack } : {}) })
  }
  for (const pr of p.proverbs) {
    const n = (pCount[p.unit] = (pCount[p.unit] ?? 0) + 1)
    proverbs.push({ id: `u${pad2(p.unit)}-p${n}`, unit: p.unit, sources: [{ page: p.page }], reviewStatus: 'draft', flags: pr.flags, he: pr.he.normalize('NFC'), ...(pr.ru ? { ru: pr.ru } : {}) })
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
report.push('', `## Grammar topics: ${grammar.length} · texts: ${texts.length} · proverbs: ${proverbs.length}`)
const flagged = [...vocab, ...verbs, ...grammar, ...exercises, ...texts, ...proverbs].filter((r) => r.flags?.length)
report.push('', `## Flagged records: ${flagged.length}`, '', ...flagged.map((r) => `- ${r.id}: ${r.flags!.join(', ')}${'notes' in r && r.notes ? ` — ${r.notes}` : ''}`))
report.push('', `## Plain spellings derived from the pointed form (review: ktiv male may differ): ${derivedPlain.length}`, '', ...derivedPlain.map((d) => `- ${d}`))
await writeFile(IMPORT_REPORT, report.join('\n') + '\n')
console.log(`import: ${vocab.length} vocab, ${verbs.length} verbs, ${grammar.length} grammar, ${exercises.length} exercises, ${texts.length} texts, ${proverbs.length} proverbs → content/*.json; report in content/import-report.md`)
