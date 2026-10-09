// Niqqud-insensitive search over the transcriptions: matches the regex against every string in
// sources/transcribed/*.json with vowel points stripped. Prints p.N [field]: text.
// Usage: pnpm find "להבטיח" [--pass 2] [--max 60]
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { normalizeHebrew } from '../src/engine/answer'
import { TRANSCRIBED_DIR } from './lib/paths'

const argv = process.argv.slice(2)
const opt = (name: string, def?: string) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : def
}
const pattern = argv.find((a, i) => !a.startsWith('--') && (i === 0 || !argv[i - 1]!.startsWith('--')))
if (!pattern) {
  console.error('usage: pnpm find "regex" [--pass 1|2] [--max N]')
  process.exit(2)
}
const re = new RegExp(normalizeHebrew(pattern) || pattern, 'iu')
const pass = opt('--pass')
const max = Number(opt('--max', '60'))

function* strings(v: unknown, path: string): Generator<[string, string]> {
  if (typeof v === 'string') yield [path, v]
  else if (Array.isArray(v)) for (const [i, x] of v.entries()) yield* strings(x, `${path}[${i}]`)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) yield* strings(x, path ? `${path}.${k}` : k)
}

let shown = 0
const files = (await readdir(TRANSCRIBED_DIR).catch(() => [] as string[])).filter((f) => f.endsWith('.json')).sort()
for (const f of files) {
  if (pass && !f.includes(`.pass${pass}.`)) continue
  if (!pass && /\.pass\d\./.test(f)) continue
  const doc = JSON.parse(await readFile(join(TRANSCRIBED_DIR, f), 'utf8')) as { page: number }
  for (const [path, s] of strings(doc, '')) {
    if (path === 'raw') {
      for (const line of s.split('\n')) if (re.test(normalizeHebrew(line))) print(doc.page, 'raw', line)
    } else if (re.test(normalizeHebrew(s))) print(doc.page, path, s)
  }
}
function print(page: number, field: string, text: string) {
  if (shown++ >= max) {
    console.log(`… more than ${max} hits; narrow the pattern or raise --max`)
    process.exit(0)
  }
  console.log(`p.${page} ${field}: ${text.trim()}`)
}
if (!shown) console.log('no hits')
