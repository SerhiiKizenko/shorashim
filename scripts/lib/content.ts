// content/*.json — one plaintext file per collection, gitignored. Shared by import / validate / encrypt / patch.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { COLLECTIONS, EMPTY_BUNDLE, type BundleInput, type Collection } from '../../src/content/schema'
import { CONTENT_DIR, ENV_LOCAL } from './paths'

export const CONTENT_FILES = [...COLLECTIONS, 'units', 'audio'] as const
export type ContentFile = (typeof CONTENT_FILES)[number]

export async function readJsonArray<T>(file: string): Promise<T[]> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T[]
  } catch {
    return []
  }
}

export async function loadContent(): Promise<BundleInput> {
  const b: Record<string, unknown> = { ...EMPTY_BUNDLE }
  for (const f of CONTENT_FILES) b[f] = await readJsonArray(join(CONTENT_DIR, `.json`))
  return b as unknown as BundleInput
}

export async function saveContentFile(name: ContentFile, records: unknown[]): Promise<string> {
  await mkdir(CONTENT_DIR, { recursive: true })
  const file = join(CONTENT_DIR, `${name}.json`)
  await writeFile(file, JSON.stringify(records, null, 2) + '\n')
  return file
}

/** Which collection an id belongs to, by its shape. */
export function collectionOf(id: string): Collection | null {
  if (/^u\d{2}-v\d{3}$/.test(id)) return 'vocab'
  if (/^v-/.test(id)) return 'verbs'
  if (/^u\d{2}-s\d+$/.test(id)) return 'grammar'
  if (/^u\d{2}-ex/.test(id)) return 'exercises'
  if (/^u\d{2}-t\d+$/.test(id)) return 'texts'
  if (/^u\d{2}-p\d+$/.test(id)) return 'proverbs'
  if (/^prep-/.test(id)) return 'prepositions'
  return null
}

/** Reads TRAINER_PASSPHRASE from .env.local. Never log the returned value. */
export async function readPassphrase(): Promise<string> {
  const env = await readFile(ENV_LOCAL, 'utf8').catch(() => {
    throw new Error('.env.local not found')
  })
  const m = /^TRAINER_PASSPHRASE=(.*)$/m.exec(env)
  if (!m) throw new Error('TRAINER_PASSPHRASE missing in .env.local')
  const raw = m[1]!.trim()
  const unquoted = /^(['"])(.*)\1$/.exec(raw)?.[2] ?? raw
  if (!unquoted) throw new Error('TRAINER_PASSPHRASE is empty')
  return unquoted
}

/** Pointed → unpointed, keeping the letters as they are (maqaf becomes a hyphen). Not ktiv male: דִּבֵּר → דבר. */
export const stripMarks = (s: string): string => s.normalize('NFC').replace(/־/g, '-').replace(/[֑-ׇ]/g, '')

/** Walks every string in a JSON value with its path, for validation. */
export function* walkStrings(v: unknown, path = ''): Generator<[string, string]> {
  if (typeof v === 'string') yield [path, v]
  else if (Array.isArray(v)) for (const [i, x] of v.entries()) yield* walkStrings(x, `${path}[${i}]`)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) yield* walkStrings(x, path ? `${path}.${k}` : k)
}

/** Hebrew letters → ASCII for ids: ד.ב.ר → dbr. */
const TRANSLIT: Record<string, string> = { א: 'a', ב: 'b', ג: 'g', ד: 'd', ה: 'h', ו: 'v', ז: 'z', ח: 'ch', ט: 't', י: 'y', כ: 'k', ך: 'k', ל: 'l', מ: 'm', ם: 'm', נ: 'n', ן: 'n', ס: 's', ע: 'e', פ: 'p', ף: 'p', צ: 'ts', ץ: 'ts', ק: 'q', ר: 'r', ש: 'sh', ת: 't' }
export const translitRoot = (root: string): string => [...stripMarks(root)].map((c) => TRANSLIT[c] ?? '').join('')
