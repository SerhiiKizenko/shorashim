// Compares the two transcription passes of a page field by field and prints every difference. Conflicts are
// settled by re-reading the spot at a higher zoom, never by guessing; the resolved record is written as
// sources/transcribed/pNNN.json with `pnpm diff-pass N --accept 1|2` once the passes agree (or pass 1 was fixed).
// Usage: pnpm diff-pass 54 [--accept 1]
import { readFile, writeFile } from 'node:fs/promises'
import { TranscriptionSchema } from './lib/transcription'
import { transcribedFile } from './lib/paths'

const argv = process.argv.slice(2)
const page = Number(argv[0])
if (!page) {
  console.error('usage: pnpm diff-pass <page> [--accept 1|2]')
  process.exit(2)
}
const acceptIdx = argv.indexOf('--accept')
const accept = acceptIdx >= 0 ? (Number(argv[acceptIdx + 1]) as 1 | 2) : undefined

async function load(pass: 1 | 2) {
  const raw = JSON.parse(await readFile(transcribedFile(page, pass), 'utf8'))
  const p = TranscriptionSchema.safeParse(raw)
  if (!p.success) {
    console.error(`pass ${pass} does not match the transcription schema:`)
    for (const i of p.error.issues) console.error(`  ${i.path.join('.')}: ${i.message}`)
    process.exit(1)
  }
  return p.data
}

function* flatten(v: unknown, path = ''): Generator<[string, unknown]> {
  if (Array.isArray(v)) for (const [i, x] of v.entries()) yield* flatten(x, `${path}[${i}]`)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) yield* flatten(x, path ? `${path}.${k}` : k)
  else yield [path, v]
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
console.log(diffs ? `${diffs} difference(s) on p.${page}` : `p.${page}: the two passes agree`)
if (accept) {
  const chosen = accept === 1 ? a : b
  await writeFile(transcribedFile(page), JSON.stringify({ ...chosen, pass: accept }, null, 2) + '\n')
  console.log(`wrote ${transcribedFile(page)} from pass ${accept}`)
}
process.exit(diffs && !accept ? 1 : 0)
