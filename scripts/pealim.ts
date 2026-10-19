// Copies Pealim verb tables into the pipeline. Run: pnpm pealim https://www.pealim.com/dict/2-ledaber/ [more URLs]
// Per URL: the page → MATERIALS_DIR/pealim/<verbId>/page.html, each form's recording → <clip key>.mp3 (a file already
// there is not fetched again), and the record → sources/transcribed/pealim/pNNN.json (book «pealim», page = the entry
// number). `pnpm import-book` then merges it like any page. Downloads are untrusted data: parsed, never executed.
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { stripMarks, translitRoot } from './lib/content'
import { PEALIM_DIR, TRANSCRIBED_DIR, transcribedFile } from './lib/paths'
import { parsePealim, pealimEntry } from './lib/pealim'
import { TranscriptionSchema, type TranscriptionInput } from './lib/transcription'

const UA = 'shorashim/1.0 (a personal Hebrew trainer copying a few verb tables once)'
const urls = process.argv.slice(2)
if (!urls.length) {
  console.error('usage: pnpm pealim <https://www.pealim.com/dict/…/> [more]')
  process.exit(1)
}

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`)
  return res
}
const present = (file: string) => stat(file).then((s) => s.size > 0, () => false)

// one at a time: a handful of small requests, no load on the site
for (const url of urls) {
  const entry = pealimEntry(url)
  const html = await (await get(url)).text()
  const v = parsePealim(html)
  const verbId = `v-${translitRoot(v.root)}-${v.binyan}`
  const dir = join(PEALIM_DIR, verbId)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'page.html'), html)
  let fetched = 0
  for (const [key, clipUrl] of Object.entries(v.clips)) {
    const file = join(dir, `${key}.mp3`)
    if (await present(file)) continue
    const res = await get(clipUrl)
    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('audio/')) throw new Error(`${verbId} ${key}: expected audio, got «${type}»`)
    await writeFile(file, new Uint8Array(await res.arrayBuffer()))
    fetched++
  }
  const raw = [
    `${v.infinitive.pointed} — ${v.meaning}`,
    ...Object.entries(v.forms).map(([tense, cells]) => `${tense}: ${Object.values(cells).map((f) => f.pointed).join(' · ')}`),
    `־נָה: ${v.naForms.future.pointed} · ${v.naForms.imperative.pointed}`,
  ].join('\n')
  const record: TranscriptionInput = {
    page: entry,
    book: 'pealim',
    unit: null,
    kind: 'reference',
    pass: 1,
    readAt: new Date().toISOString().slice(0, 10),
    raw,
    notes: `Copied by pnpm pealim from ${url}: the active table. The passive table and the colloquial-stress clips are skipped.`,
    verbs: [{ infinitive: v.infinitive, root: v.root, binyan: v.binyan, group: v.group, en: v.meaning, forms: v.forms, naForms: v.naForms, model: true, audio: Object.keys(v.clips), flags: [] }],
  }
  const out = transcribedFile('pealim', entry)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, JSON.stringify(TranscriptionSchema.parse(record), null, 2) + '\n')
  console.log(`${verbId}  ${v.infinitive.plain ?? stripMarks(v.infinitive.pointed)}  ${v.binyan}  ${v.root}  →  transcribed/${relative(TRANSCRIBED_DIR, out)} · ${Object.keys(v.clips).length} clips, ${fetched} downloaded`)
}
