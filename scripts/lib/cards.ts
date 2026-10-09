import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Block, CardInput } from '../../src/content/schema'
import { CARDS_DIR, ENV_LOCAL } from './paths'

export async function loadCards(): Promise<CardInput[]> {
  let files: string[] = []
  try {
    files = (await readdir(CARDS_DIR)).filter((f) => /^block[1-4]\.json$/.test(f)).sort()
  } catch {
    return []
  }
  const all: CardInput[] = []
  for (const f of files) all.push(...(JSON.parse(await readFile(join(CARDS_DIR, f), 'utf8')) as CardInput[]))
  return all
}

export async function saveCards(block: Block, cards: CardInput[]): Promise<string> {
  await mkdir(CARDS_DIR, { recursive: true })
  const file = join(CARDS_DIR, `block${block}.json`)
  await writeFile(file, JSON.stringify(cards, null, 2) + '\n')
  return file
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
