// Search extracted sources (text + OCR) with a Unicode-aware, case-insensitive regex; prints slug p.N: line.
// Usage: pnpm find "регекс" [--in slug-substring] [--ctx 1] [--max 60]
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { OCR_DIR, TEXT_DIR } from './lib/paths'

const argv = process.argv.slice(2)
const opt = (name: string, def?: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def }
const pattern = argv.find((a, i) => !a.startsWith('--') && (i === 0 || !argv[i - 1]!.startsWith('--')))
if (!pattern) { console.error('usage: pnpm find "regex" [--in slug] [--ctx N] [--max N]'); process.exit(2) }
const re = new RegExp(pattern, 'iu')
const only = opt('--in')
const ctx = Number(opt('--ctx', '0'))
const max = Number(opt('--max', '60'))

let shown = 0
for (const root of [TEXT_DIR, OCR_DIR]) {
  const slugs = (await readdir(root).catch(() => [] as string[])).filter((s) => !s.startsWith('.') && (!only || s.includes(only))).sort()
  for (const slug of slugs) {
    const all = await readFile(join(root, slug, 'all.txt'), 'utf8').catch(() => '')
    if (!all) continue
    const lines = all.split('\n')
    let page = 0
    const pageOf: number[] = []
    for (const l of lines) { const m = /^=== page (\d+) ===$/.exec(l); if (m) page = Number(m[1]); pageOf.push(page) }
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i]!)) continue
      if (shown++ >= max) { console.log(`… (more than ${max} hits; narrow with --in or --max)`); process.exit(0) }
      const from = Math.max(0, i - ctx), to = Math.min(lines.length - 1, i + ctx)
      const kind = root === OCR_DIR ? 'ocr' : 'txt'
      for (let j = from; j <= to; j++) console.log(`${kind} ${slug} p.${pageOf[j]}${j === i ? ':' : ' '} ${lines[j]!.trim()}`)
      if (ctx) console.log('--')
    }
  }
}
if (!shown) console.log('no hits')
