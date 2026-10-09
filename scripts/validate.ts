// Validates the plaintext content before encryption. Exits 1 on errors. Run: pnpm validate
import { BundleSchema, EXPECTED_COUNTS, TENSE_CELLS, type Bundle, type BundleInput, type Tense } from '../src/content/schema'
import { loadContent, walkStrings } from './lib/content'
import { fmtBytes } from './lib/run'

export const TEXT_BUDGET = 3 * 1024 * 1024

export interface UnitStat {
  vocab: { total: number; checked: number; byPos: Record<string, number> }
  verbs: number
  grammar: number
  exercises: number
  texts: number
  proverbs: number
}
export interface ValidationResult {
  errors: string[]
  warnings: string[]
  bundle: Bundle
  stats: Record<number, UnitStat>
}

/** Fields where a question mark is part of the text, not an unreadable spot. */
const QUESTION_OK = /(^|\.)(prompt|instructionHe|instructionEn|explanationRu|explanationEn|teacherNote|titleHe|titleEn|notes|he|ru|en|raw|paragraphs\[\d+\])$/

export function validateContent(raw: BundleInput): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const parsed = BundleSchema.safeParse(raw)
  if (!parsed.success) {
    for (const i of parsed.error.issues) errors.push(`${i.path.join('.')}: ${i.message}`)
    return { errors, warnings, bundle: BundleSchema.parse({ version: 1, units: [], vocab: [], verbs: [], grammar: [], exercises: [], texts: [], proverbs: [], prepositions: [], audio: [] }), stats: {} }
  }
  const b = parsed.data
  const all = [...b.vocab, ...b.verbs, ...b.grammar, ...b.exercises, ...b.texts, ...b.proverbs, ...b.prepositions]

  const ids = new Set<string>()
  for (const r of all) {
    if (ids.has(r.id)) errors.push(`${r.id}: duplicate id`)
    ids.add(r.id)
    for (const [path, s] of walkStrings(r)) {
      if (s !== s.normalize('NFC')) errors.push(`${r.id}: ${path} is not NFC`)
      if (r.reviewStatus === 'checked' && s.includes('?') && !QUESTION_OK.test(path)) errors.push(`${r.id}: checked but ${path} contains "?"`)
    }
    if (r.reviewStatus === 'checked' && r.flags.includes('unreadable')) errors.push(`${r.id}: checked but flagged unreadable`)
  }

  const verbIds = new Set(b.verbs.map((v) => v.id))
  const exerciseIds = new Set(b.exercises.map((e) => e.id))
  const tracks = new Set(b.audio.map((a) => a.track))
  for (const v of b.vocab) if (v.verbId && !verbIds.has(v.verbId)) errors.push(`${v.id}: verbId ${v.verbId} not found`)
  for (const v of b.verbs) {
    for (const tense of Object.keys(v.forms) as Tense[]) {
      const cells = v.forms[tense]
      if (!cells) continue
      const allowed = TENSE_CELLS[tense] as readonly string[]
      for (const k of Object.keys(cells)) if (!allowed.includes(k)) errors.push(`${v.id}: ${tense} has unknown cell ${k}`)
      if (v.reviewStatus === 'checked') for (const k of allowed) if (!cells[k]) errors.push(`${v.id}: checked but ${tense}.${k} missing`)
    }
    for (const c of v.checkedAgainst) for (const k of c.cells) if (!v.forms[c.tense]?.[k]) errors.push(`${v.id}: checkedAgainst lists ${c.tense}.${k} which has no cell`)
  }
  for (const g of b.grammar) {
    for (const id of g.verbIds) if (!verbIds.has(id)) errors.push(`${g.id}: verb ${id} not found`)
    for (const id of g.exerciseIds) if (!exerciseIds.has(id)) errors.push(`${g.id}: exercise ${id} not found`)
    if (g.audioTrack !== undefined && !tracks.has(g.audioTrack)) warnings.push(`${g.id}: audio track ${g.audioTrack} not in the bundle`)
  }
  for (const e of b.exercises) {
    if (e.gradable) for (const it of e.items) if (it.answers.every((a) => a === '?' || !a.trim())) {
      if (e.reviewStatus === 'checked') errors.push(`${e.id}: checked but item ${it.label} has no answer`)
      else warnings.push(`${e.id}: item ${it.label} has no answer yet`)
    }
  }
  for (const t of b.texts) if (t.audioTrack !== undefined && !tracks.has(t.audioTrack)) warnings.push(`${t.id}: audio track ${t.audioTrack} not in the bundle`)

  const stats: Record<number, UnitStat> = {}
  for (const u of b.units) stats[u.unit] = { vocab: { total: 0, checked: 0, byPos: {} }, verbs: 0, grammar: 0, exercises: 0, texts: 0, proverbs: 0 }
  const unitStat = (n: number) => (stats[n] ??= { vocab: { total: 0, checked: 0, byPos: {} }, verbs: 0, grammar: 0, exercises: 0, texts: 0, proverbs: 0 })
  for (const v of b.vocab) {
    const s = unitStat(v.unit)
    s.vocab.total++
    if (v.reviewStatus === 'checked') s.vocab.checked++
    s.vocab.byPos[v.pos] = (s.vocab.byPos[v.pos] ?? 0) + 1
  }
  for (const v of b.verbs) unitStat(v.unit).verbs++
  for (const g of b.grammar) unitStat(g.unit).grammar++
  for (const e of b.exercises) unitStat(e.unit).exercises++
  for (const t of b.texts) unitStat(t.unit).texts++
  for (const p of b.proverbs) unitStat(p.unit).proverbs++
  for (const [unit, exp] of Object.entries(EXPECTED_COUNTS)) {
    const have = stats[Number(unit)]?.vocab.total ?? 0
    if (exp && have !== exp.vocab) errors.push(`unit ${unit}: ${have} vocabulary entries, the page has ${exp.vocab}`)
  }

  const textBytes = Buffer.byteLength(JSON.stringify(b))
  if (textBytes > TEXT_BUDGET) errors.push(`text bundle ${fmtBytes(textBytes)} exceeds ${fmtBytes(TEXT_BUDGET)}`)
  return { errors, warnings, bundle: b, stats }
}

export function printResult(r: ValidationResult): void {
  for (const [unit, s] of Object.entries(r.stats).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const pos = Object.entries(s.vocab.byPos).map(([p, n]) => `${p} ${n}`).join(', ')
    console.log(`unit ${unit}: vocab ${s.vocab.total} (${s.vocab.checked} checked${pos ? `; ${pos}` : ''}) · verbs ${s.verbs} · grammar ${s.grammar} · exercises ${s.exercises} · texts ${s.texts} · proverbs ${s.proverbs}`)
  }
  for (const w of r.warnings) console.log(`warn  ${w}`)
  for (const e of r.errors) console.log(`ERROR ${e}`)
  console.log(r.errors.length ? `validate: ${r.errors.length} error(s)` : 'validate: ok')
}

if (process.argv[1]?.endsWith('validate.ts')) {
  const r = validateContent(await loadContent())
  printResult(r)
  process.exit(r.errors.length ? 1 : 0)
}
