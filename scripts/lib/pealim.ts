// Reads one Pealim verb page (pealim.com/dict/<n>-<name>/) into the forms the trainer stores: the active table only
// (the passive pu'al / huf'al table is skipped), each cell pointed as Pealim prints it, the ktiv male spelling Pealim
// gives next to it, and the URL of its recording. Pure: HTML in, record out — the network lives in scripts/pealim.ts.
import { BINYANIM, TENSE_CELLS, type Binyan, type RootGroup, type Tense } from '../../src/content/schema'
import { stripMarks } from './content'

export interface PealimForm {
  pointed: string
  /** only when the everyday spelling differs from the pointed form with its marks stripped */
  plain?: string
}

export interface PealimVerb {
  binyan: Binyan
  /** «ד.ב.ר», letters as Pealim prints them (a shin keeps its dot) */
  root: string
  group: RootGroup
  /** Pealim's English gloss, from the page title */
  meaning: string
  infinitive: PealimForm
  forms: Record<Tense, Record<string, PealimForm>>
  naForms: { future: PealimForm; imperative: PealimForm }
  /** clip key (`past.ani`, `infinitive`, `na.future`, `na.imperative`) → MP3 URL */
  clips: Record<string, string>
}

/** Pealim cell id → the trainer's cell. Future and imperative אתן / הן (־נָה) are read separately as `naForms`. */
const CELL_IDS: Record<Tense, Record<string, string>> = {
  present: { ms: 'AP-ms', fs: 'AP-fs', mp: 'AP-mp', fp: 'AP-fp' },
  past: { ani: 'PERF-1s', ata: 'PERF-2ms', at: 'PERF-2fs', anachnu: 'PERF-1p', atem: 'PERF-2mp', aten: 'PERF-2fp', hu: 'PERF-3ms', hi: 'PERF-3fs', hem: 'PERF-3p' },
  future: { ani: 'IMPF-1s', ata: 'IMPF-2ms', at: 'IMPF-2fs', anachnu: 'IMPF-1p', atem: 'IMPF-2mp', hu: 'IMPF-3ms', hi: 'IMPF-3fs', hem: 'IMPF-3mp' },
  imperative: { ata: 'IMP-2ms', at: 'IMP-2fs', atem: 'IMP-2mp' },
}

const BINYAN_NAMES: Record<string, Binyan> = Object.fromEntries(BINYANIM.map((b) => [b, b]))

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&rlm;/g, '‏')
    .replace(/&lrm;/g, '‎')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&(apos|#39);/g, "'")
    .replace(/&amp;/g, '&')
}

/** a form as the trainer stores it: no «!» after an imperative, no direction marks, NFC */
const clean = (s: string): string => decode(s).replace(/[!‎‏]/g, '').replace(/^\s*~\s*/, '').trim().normalize('NFC')

/** The cell `id` of the active table: its main form, the ktiv male next to it, and its recording. The «aux forms» that
 * Pealim tucks into the same cell (the colloquial stress, the masculine form for ־נָה) are cut off first. */
function readCell(html: string, id: string): { form: PealimForm; audio: string } {
  const start = html.indexOf(`id="${id}"`)
  if (start < 0) throw new Error(`Pealim cell ${id} not found`)
  const end = html.indexOf('</td>', start)
  let body = html.slice(start, end < 0 ? undefined : end)
  const aux = body.indexOf('aux-forms')
  if (aux >= 0) body = body.slice(0, aux)
  const menukad = /class="menukad">([^<]*)</.exec(body)?.[1]
  const audio = /data-audio="([^"]+)"/.exec(body)?.[1]
  if (!menukad) throw new Error(`Pealim cell ${id} has no form`)
  if (!audio) throw new Error(`Pealim cell ${id} has no recording`)
  const pointed = clean(menukad)
  const chaser = /class="chaser">([^<]*)</.exec(body)?.[1]
  const plain = chaser ? clean(chaser) : undefined
  return { form: plain && plain !== stripMarks(pointed) ? { pointed, plain } : { pointed }, audio: decode(audio) }
}

export function parsePealim(html: string): PealimVerb {
  // «Verb – PI'EL | Root: ד - ב - ר | Infinitive: …» — the page's own one-line summary
  const descTag = /<meta[^>]*name="description"[^>]*>/.exec(html)?.[0] ?? ''
  const desc = decode(/content="([^"]*)"/.exec(descTag)?.[1] ?? '')
  const parts = desc.split('|').map((p) => p.trim())
  const binyanName = /^Verb\s*[–-]\s*(.+)$/.exec(parts.find((p) => p.startsWith('Verb')) ?? '')?.[1]
  const binyan = BINYAN_NAMES[(binyanName ?? '').toLowerCase().replace(/['’]/g, '')]
  if (!binyan) throw new Error(`not a verb page, or an unknown binyan: «${binyanName ?? desc.slice(0, 40)}»`)
  const rootText = /^Root:\s*(.+)$/.exec(parts.find((p) => p.startsWith('Root:')) ?? '')?.[1]
  if (!rootText) throw new Error('no «Root:» in the page summary')
  const root = rootText.split('-').map((l) => l.trim().normalize('NFC')).join('.')
  // only the plain root group is read; any other («פ״נ», «ל״ה» …) is a different table pattern — stop, never guess
  if (!html.includes('does not have any special conjugation properties')) throw new Error(`${root}: the root has special conjugation properties — the group must be set by hand`)
  const meaning = clean((/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '').split(' – ')[1] ?? '')

  const clips: Record<string, string> = {}
  const forms = {} as PealimVerb['forms']
  for (const [tense, ids] of Object.entries(CELL_IDS) as [Tense, Record<string, string>][]) {
    forms[tense] = {}
    for (const cell of TENSE_CELLS[tense]) {
      const { form, audio } = readCell(html, ids[cell]!)
      forms[tense][cell] = form
      clips[`${tense}.${cell}`] = audio
    }
  }
  const inf = readCell(html, 'INF-L')
  clips.infinitive = inf.audio
  // ־נָה: future אתן and הן are one form; imperative אתן
  const na2 = readCell(html, 'IMPF-2fp')
  const na3 = readCell(html, 'IMPF-3fp')
  if (na2.form.pointed !== na3.form.pointed) throw new Error(`future ־נָה forms differ: ${na2.form.pointed} / ${na3.form.pointed}`)
  const naImp = readCell(html, 'IMP-2fp')
  clips['na.future'] = na2.audio
  clips['na.imperative'] = naImp.audio
  return { binyan, root, group: 'shlemim', meaning, infinitive: inf.form, forms, naForms: { future: na2.form, imperative: naImp.form }, clips }
}

/** «https://www.pealim.com/dict/2-ledaber/» → 2 (the entry number is the record's «page») */
export function pealimEntry(url: string): number {
  const m = /pealim\.com\/(?:[a-z]{2}\/)?dict\/(\d+)-/.exec(url)
  if (!m) throw new Error(`not a Pealim verb URL: ${url}`)
  return Number(m[1])
}
