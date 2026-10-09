// Validates, then encrypts content/cards/*.json (+ content/images/*.webp) into public/data/*.enc.
// Key: PBKDF2(TRAINER_PASSPHRASE from .env.local, salt). The salt is kept in public/data/salt.json so a
// device that cached its derived key keeps working across content updates. Run: pnpm encrypt
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { deriveKey, encryptFile, fromHex, PBKDF2_ITERATIONS, randomBytes, SALT_BYTES, syntheticIv, toHex } from '../src/crypto/format'
import type { Bundle } from '../src/content/schema'
import { loadCards, readPassphrase } from './lib/cards'
import { IMAGES_DIR, PUBLIC_DATA_DIR } from './lib/paths'
import { fmtBytes } from './lib/run'
import { printResult, validateCards } from './validate'

interface SaltFile { version: 1; salt: string; iterations: number }

async function loadOrCreateSalt(): Promise<{ salt: Uint8Array; iterations: number; created: boolean }> {
  const file = join(PUBLIC_DATA_DIR, 'salt.json')
  try {
    const s = JSON.parse(await readFile(file, 'utf8')) as SaltFile
    return { salt: fromHex(s.salt), iterations: s.iterations, created: false }
  } catch {
    const salt = randomBytes(SALT_BYTES)
    await mkdir(PUBLIC_DATA_DIR, { recursive: true })
    await writeFile(file, JSON.stringify({ version: 1, salt: toHex(salt), iterations: PBKDF2_ITERATIONS } satisfies SaltFile, null, 2) + '\n')
    return { salt, iterations: PBKDF2_ITERATIONS, created: true }
  }
}

async function main() {
  const result = await validateCards(await loadCards())
  printResult(result)
  if (result.errors.length) {
    console.error('encrypt: refused — fix validation errors first')
    process.exit(1)
  }

  const passphrase = await readPassphrase()
  const { salt, iterations, created } = await loadOrCreateSalt()
  if (created) console.log('encrypt: new salt written to public/data/salt.json (devices will re-enter the passphrase)')
  const key = await deriveKey(passphrase, salt, iterations)

  await mkdir(join(PUBLIC_DATA_DIR, 'img'), { recursive: true })
  const bundle: Bundle = { version: 1, cards: result.cards }
  const plain = new TextEncoder().encode(JSON.stringify(bundle))
  const enc = await encryptFile(key, plain, salt, iterations, await syntheticIv(salt, plain))
  await writeFile(join(PUBLIC_DATA_DIR, 'bundle.enc'), enc)
  console.log(`bundle.enc: ${fmtBytes(enc.length)} (${result.cards.length} cards, ${fmtBytes(plain.length)} plain)`)

  const images: { id: string; file: string; bytes: number }[] = []
  for (const f of (await readdir(IMAGES_DIR).catch(() => [] as string[])).sort()) {
    const data = new Uint8Array(await readFile(join(IMAGES_DIR, f)))
    const out = await encryptFile(key, data, salt, iterations, await syntheticIv(salt, data))
    await writeFile(join(PUBLIC_DATA_DIR, 'img', `${f}.enc`), out)
    images.push({ id: f, file: `img/${f}.enc`, bytes: out.length })
  }
  if (images.length) console.log(`images: ${images.length} files, ${fmtBytes(images.reduce((n, i) => n + i.bytes, 0))}`)

  const manifest = {
    version: 1,
    builtAt: new Date().toISOString(),
    bundle: { file: 'bundle.enc', bytes: enc.length },
    images,
    counts: Object.fromEntries(Object.entries(result.stats).map(([b, s]) => [b, { total: s.total, checked: s.checked }])),
  }
  await writeFile(join(PUBLIC_DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`written ${relative(process.cwd(), PUBLIC_DATA_DIR)}/{bundle.enc,manifest.json,salt.json}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
