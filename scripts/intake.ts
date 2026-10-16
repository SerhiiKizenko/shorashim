// Intake of new teacher material (homework PDFs from CamScanner). Idempotent by content hash:
//   pnpm intake <pdf…>                                  copy each PDF into MATERIALS_DIR/teacher/intake/<date>-<md5:8>.pdf
//                                                       (never into the repo), render every page at 300 dpi to
//                                                       sources/intake/<md5:8>/page-NN.png, record it in the inventory
//   pnpm intake --assign <md5:8> 1=workbook:40 2=…      say which book and printed page each render is; workbook pages
//                                                       are copied to sources/pages/workbook/pNNN.png, main-book pages
//                                                       are re-rendered from the book PDF (a cleaner scan)
//   pnpm intake --status                                every intake, its pages, and how far each page has got
// The PDFs are untrusted downloads: they are only copied and rasterised (pdftoppm), never opened by an interpreter.
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { BOOK_IDS, MAIN_BOOK, type BookId } from '../src/content/schema'
import { BOOK_PDF, INTAKE_DIR, INVENTORY_JSON, PAGES_DIR, TEACHER_INTAKE_DIR, pageFile, transcribedFile } from './lib/paths'
import { md5File, pdfPages, run } from './lib/run'

interface Intake {
  md5: string
  /** the original file name, for the learner's reference */
  source: string
  /** the copy under MATERIALS_DIR, relative to it */
  file: string
  date: string
  pages: number
  /** render index (1-based) → "<book>:<printed page>" */
  assigned: Record<string, string>
}
type Inventory = Record<string, unknown> & { intakes?: Intake[] }

const exists = (p: string) => stat(p).then(() => true, () => false)
const pad = (n: number, w: number) => String(n).padStart(w, '0')
const today = new Date().toISOString().slice(0, 10)

async function loadInventory(): Promise<Inventory> {
  return JSON.parse(await readFile(INVENTORY_JSON, 'utf8')) as Inventory
}
async function saveInventory(inv: Inventory): Promise<void> {
  await writeFile(INVENTORY_JSON, JSON.stringify(inv, null, 2) + '\n')
}

/** Renders every page of a PDF at 300 dpi into `dir` as page-NN.png. */
async function renderAll(pdf: string, dir: string, pages: number): Promise<void> {
  await mkdir(dir, { recursive: true })
  await run('pdftoppm', ['-r', '300', '-png', pdf, join(dir, 'tmp')])
  // pdftoppm pads the page number to the width of the page count
  const w = String(pages).length
  for (let i = 1; i <= pages; i++) await rename(join(dir, `tmp-${pad(i, w)}.png`), join(dir, `page-${pad(i, 2)}.png`))
}

async function intake(files: string[]): Promise<void> {
  const inv = await loadInventory()
  const intakes = (inv.intakes ??= [])
  await mkdir(TEACHER_INTAKE_DIR, { recursive: true })
  for (const f of files) {
    if (!(await exists(f))) {
      console.error(`not found: ${basename(f)}`)
      process.exitCode = 1
      continue
    }
    const md5 = await md5File(f)
    const short = md5.slice(0, 8)
    const known = intakes.find((x) => x.md5 === md5)
    if (known) {
      console.log(`${basename(f)}: already taken in on ${known.date} as ${short} (${known.pages} pages)`)
      continue
    }
    const name = `${today}-${short}.pdf`
    await copyFile(f, join(TEACHER_INTAKE_DIR, name))
    const pages = await pdfPages(join(TEACHER_INTAKE_DIR, name))
    await renderAll(join(TEACHER_INTAKE_DIR, name), join(INTAKE_DIR, short), pages)
    intakes.push({ md5, source: basename(f), file: `teacher/intake/${name}`, date: today, pages, assigned: {} })
    console.log(`${basename(f)}: ${short}, ${pages} pages → sources/intake/${short}/page-01…${pad(pages, 2)}.png`)
  }
  await saveInventory(inv)
}

async function assign(short: string, specs: string[]): Promise<void> {
  const inv = await loadInventory()
  const it = inv.intakes?.find((x) => x.md5.startsWith(short))
  if (!it) throw new Error(`no intake ${short}`)
  for (const spec of specs) {
    const m = /^(\d+)=([a-z-]+):(\d+)$/.exec(spec)
    if (!m) throw new Error(`bad assignment «${spec}»: use <render>=<book>:<page>, e.g. 1=workbook:40`)
    const [, idx, book, page] = m as unknown as [string, string, BookId, string]
    if (!(BOOK_IDS as readonly string[]).includes(book)) throw new Error(`unknown book ${book}: ${BOOK_IDS.join(', ')}`)
    const n = Number(page)
    await mkdir(join(PAGES_DIR, book), { recursive: true })
    const out = pageFile(book, n)
    if (book === MAIN_BOOK) {
      // the book PDF is a cleaner scan than a phone photo of the same page
      if (!(await exists(out))) {
        const tmp = join(PAGES_DIR, book, `tmp-${n}`)
        await run('pdftoppm', ['-r', '300', '-f', String(n), '-l', String(n), '-png', BOOK_PDF, tmp])
        await rename(`${tmp}-${pad(n, String(await pdfPages(BOOK_PDF)).length)}.png`, out)
      }
    } else {
      await copyFile(join(INTAKE_DIR, it.md5.slice(0, 8), `page-${pad(Number(idx), 2)}.png`), out)
    }
    it.assigned[idx] = `${book}:${n}`
    const done = await exists(transcribedFile(book, n))
    console.log(`render ${idx} → ${book} p.${n}${done ? ' (already transcribed)' : ''}`)
  }
  await saveInventory(inv)
}

async function status(): Promise<void> {
  const inv = await loadInventory()
  for (const it of inv.intakes ?? []) {
    console.log(`${it.md5.slice(0, 8)}  ${it.date}  ${it.source}  ${it.pages} pages`)
    for (let i = 1; i <= it.pages; i++) {
      const a = it.assigned[String(i)]
      if (!a) {
        console.log(`  ${i}: not assigned`)
        continue
      }
      const [book, page] = a.split(':') as [BookId, string]
      const n = Number(page)
      const dir = join(PAGES_DIR, '..', 'transcribed', book)
      const files = await readdir(dir).catch(() => [] as string[])
      const p = `p${pad(n, 3)}`
      const state = files.includes(`${p}.json`) ? 'resolved' : files.includes(`${p}.pass2.json`) ? 'pass 2' : files.includes(`${p}.pass1.json`) ? 'pass 1' : 'not transcribed'
      console.log(`  ${i}: ${book} p.${n} — ${state}`)
    }
  }
}

const argv = process.argv.slice(2)
if (argv[0] === '--assign') await assign(argv[1] ?? '', argv.slice(2))
else if (argv[0] === '--status' || argv.length === 0) await status()
else await intake(argv)
