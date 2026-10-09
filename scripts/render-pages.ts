// Renders book pages to sources/pages/pNNN.png at 300 dpi (the scan's own resolution) and, for vocabulary
// pages, three column crops upscaled 2× (pNNN-c1.png … c3; c1 = the right column, reading order) so the
// pointed Hebrew is legible for transcription. Run: pnpm render --pages 54-55,8 [--columns 8]
import { mkdir, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { BOOK_PDF, PAGES_DIR, pageFile, parsePages } from './lib/paths'
import { run } from './lib/run'

const argv = process.argv.slice(2)
const opt = (name: string) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const pages = parsePages(opt('--pages') ?? '')
const columns = new Set(parsePages(opt('--columns') ?? ''))
const force = argv.includes('--force')
if (!pages.length) {
  console.error('usage: pnpm render --pages 54-55,8 [--columns 8,18] [--force]')
  process.exit(2)
}

/** Vocabulary pages: three columns, right to left. Fractions of the page width [left, right], measured on p.8
 * (the columns sit at ≈ 61–88 %, 32–59 % and 1–31 %); a little overlap is fine, cutting a letter is not. */
const COLUMN_X: [number, number][] = [
  [0.58, 0.9],
  [0.3, 0.6],
  [0.0, 0.32],
]

await mkdir(PAGES_DIR, { recursive: true })
for (const p of pages) {
  const out = pageFile(p)
  const exists = await stat(out).then(() => true, () => false)
  if (!exists || force) {
    const prefix = join(PAGES_DIR, `tmp-${p}`)
    await run('pdftoppm', ['-r', '300', '-f', String(p), '-l', String(p), '-png', BOOK_PDF, prefix])
    // pdftoppm pads the page number to the width of the document's page count
    const produced = `${prefix}-${String(p).padStart(3, '0')}.png`
    await rename(produced, out).catch(() => rename(`${prefix}-${p}.png`, out))
    console.log(`rendered p.${p}`)
  }
  if (columns.has(p)) {
    const geom = (await run('magick', ['identify', '-format', '%w %h', out])).trim().split(' ').map(Number)
    const [w, h] = [geom[0]!, geom[1]!]
    for (const [i, [x0, x1]] of COLUMN_X.entries()) {
      const crop = `${Math.round((x1 - x0) * w)}x${h}+${Math.round(x0 * w)}+0`
      await run('magick', [out, '-crop', crop, '+repage', '-resize', '200%', '-unsharp', '0x1', pageFile(p, `-c${i + 1}`)])
    }
    console.log(`cropped p.${p} into 3 columns (2×)`)
  }
}
