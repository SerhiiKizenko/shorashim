// All filesystem locations used by the pipeline. Sources are untrusted downloads: read-only, never executed.
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
/** Materials root (untrusted downloads): MATERIALS_DIR from the environment or .env.local. Never log it. */
function readEnvLocal(name: string): string | undefined {
  try {
    return new RegExp(`^${name}=(.*)$`, 'm').exec(readFileSync(join(ROOT, '.env.local'), 'utf8'))?.[1]?.trim()
  } catch {
    return undefined
  }
}
export const MATERIALS_DIR = process.env.MATERIALS_DIR ?? readEnvLocal('MATERIALS_DIR') ?? join(homedir(), 'Downloads', 'materials')
export const BOOK_PDF = join(MATERIALS_DIR, 'Sheat-Ivrit-Bet.pdf')
export const AUDIO_DIR = join(MATERIALS_DIR, 'audio')
export const TEACHER_DIR = join(MATERIALS_DIR, 'teacher')

export const CONTENT_DIR = join(ROOT, 'content') // gitignored plaintext
export const INVENTORY_JSON = join(CONTENT_DIR, 'inventory.json')
export const IMPORT_REPORT = join(CONTENT_DIR, 'import-report.md')
export const VERIFIED_DIR = join(CONTENT_DIR, 'verified')
export const SOURCES_DIR = join(ROOT, 'sources') // gitignored page renders + transcriptions
export const PAGES_DIR = join(SOURCES_DIR, 'pages')
export const TRANSCRIBED_DIR = join(SOURCES_DIR, 'transcribed')
export const PUBLIC_DATA_DIR = join(ROOT, 'public', 'data') // committed ciphertext
export const PUBLIC_TEST_DATA_DIR = join(ROOT, 'public', 'data-test')
export const DOCS_DIR = join(ROOT, 'docs')
export const ENV_LOCAL = join(ROOT, '.env.local')

export const pageFile = (page: number, suffix = ''): string => join(PAGES_DIR, `p${String(page).padStart(3, '0')}${suffix}.png`)
export const transcribedFile = (page: number, pass?: 1 | 2): string => join(TRANSCRIBED_DIR, `p${String(page).padStart(3, '0')}${pass ? `.pass${pass}` : ''}.json`)

/** "54-55,8,188-191" → [54, 55, 8, 188, 189, 190, 191] */
export function parsePages(spec: string): number[] {
  const out: number[] = []
  for (const part of spec.split(',')) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim())
    if (!m) throw new Error(`bad page spec: ${part}`)
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    for (let p = a; p <= b; p++) out.push(p)
  }
  return out
}
