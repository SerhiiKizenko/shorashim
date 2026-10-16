// Compares the two transcription passes of a page field by field and prints every difference. Conflicts are
// settled by re-reading the spot at a higher zoom, never by guessing; the resolved record is written as
// sources/transcribed/<book>/pNNN.json with `pnpm diff-pass [book] N --accept 1|2` once the passes agree (or pass 1
// was fixed). Usage: pnpm diff-pass 54 [--accept 1] · pnpm diff-pass workbook 40
import { readFile, writeFile } from 'node:fs/promises'
import { BOOK_IDS, MAIN_BOOK, type BookId } from '../src/content/schema'
import { TranscriptionSchema } from './lib/transcription'
import { transcribedFile } from './lib/paths'

const argv = process.argv.slice(2)
const book: BookId = (BOOK_IDS as readonly string[]).includes(argv[0] ?? '') ? (argv.shift() as BookId) : MAIN_BOOK
const page = Number(argv[0])
if (!page) {
  console.error(`usage: pnpm diff-pass [${BOOK_IDS.join('|')}] <page> [--accept 1|2]`)
  process.exit(2)
}
const acceptIdx = argv.indexOf('--accept')
const accept = acceptIdx >= 0 ? (Number(argv[acceptIdx + 1]) as 1 | 2) : undefined

async function load(pass: 1 | 2) {
  const raw = JSON.parse(await readFile(transcribedFile(book, page, pass), 'utf8'))
  const p = TranscriptionSchema.safeParse(raw)
  if (!p.success) {
    console.error(`pass ${pass} does not match the transcription schema:`)
    for (const i of p.error.issues) console.error(`  ${i.path.join('.')}: ${i.message}`)
    process.exit(1)
  }
  return p.data
}

/** Free text two readers never word alike (English renderings, notes): not compared. */
const SKIP = new Set(['notes', 'explanationEn', 'instructionEn', 'titleEn', 'teacherNote'])
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }
/** marks dropped and final letters as base letters, so צ.ל.ם and צ.ל.מ are one root */
const strip = (s: unknown) => (typeof s === 'string' ? s.normalize('NFC').replace(/[\u0591-\u05C7]/g, '').replace(/[ךםןףץ]/g, (c) => FINALS[c] ?? c) : '')
/** Array elements are matched by identity, not position, so one extra or reordered entry does not shift the rest:
 * verbs by root + binyan, exercises by number, items by label, topics by section, vocabulary by its printed text. */
function keyOf(x: unknown, i: number): string {
  const o = (x ?? {}) as Record<string, unknown>
  if (typeof o.root === 'string' && typeof o.binyan === 'string') return `${strip(o.root)}|${o.binyan}`
  if (typeof o.number === 'string' && Array.isArray(o.items)) return `ex ${o.number}`
  if (typeof o.label === 'string' && typeof o.prompt === 'string') return o.label
  if (typeof o.section === 'number') return `§${o.section}`
  if (typeof o.he === 'string' && typeof o.pos === 'string') return strip(o.he)
  return String(i)
}
function* flatten(v: unknown, path = ''): Generator<[string, unknown]> {
  if (Array.isArray(v)) for (const [i, x] of v.entries()) yield* flatten(x, `${path}[${keyOf(x, i)}]`)
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) if (!SKIP.has(k)) yield* flatten(x, path ? `${path}.${k}` : k)
  } else yield [path, v]
}

const [a, b] = await Promise.all([load(1), load(2)])
const fa = new Map(flatten({ ...a, pass: 0, readAt: '', images: [], raw: '' }))
const fb = new Map(flatten({ ...b, pass: 0, readAt: '', images: [], raw: '' }))
let diffs = 0
for (const key of new Set([...fa.keys(), ...fb.keys()])) {
  const x = fa.get(key)
  const y = fb.get(key)
  if (JSON.stringify(x) === JSON.stringify(y)) continue
  diffs++
  console.log(`${key}\n  pass 1: ${JSON.stringify(x)}\n  pass 2: ${JSON.stringify(y)}`)
}
const where = `${book} p.${page}`
console.log(diffs ? `${diffs} difference(s) on ${where}` : `${where}: the two passes agree`)
if (accept) {
  const chosen = accept === 1 ? a : b
  await writeFile(transcribedFile(book, page), JSON.stringify({ ...chosen, book, pass: accept }, null, 2) + '\n')
  console.log(`wrote ${transcribedFile(book, page)} from pass ${accept}`)
}
process.exit(diffs && !accept ? 1 : 0)
