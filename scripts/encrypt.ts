// Validates, then encrypts content/*.json into public/data/bundle.enc and the audio tracks into
// public/data/audio/NN.enc. Key: PBKDF2(TRAINER_PASSPHRASE from .env.local, salt). The salt is kept in
// public/data/salt.json so a device that cached its derived key keeps working across content updates.
// Run: pnpm encrypt [--tracks 1-12] (default: every track the bundle lists; --tracks none skips audio)
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { deriveKey, encryptFile, fromHex, PBKDF2_ITERATIONS, randomBytes, SALT_BYTES, syntheticIv, toHex } from '../src/crypto/format'
import type { Bundle } from '../src/content/schema'
import { loadContent, readPassphrase } from './lib/content'
import { AUDIO_DIR, parsePages, PUBLIC_DATA_DIR } from './lib/paths'
import { fmtBytes } from './lib/run'
import { printResult, validateContent } from './validate'

interface SaltFile {
  version: 1
  salt: string
  iterations: number
}

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

/** The MP3 for a track number: filenames start with "NN " and are NFD on disk. */
async function findTrackFile(track: number): Promise<string> {
  const files = await readdir(AUDIO_DIR)
  const hit = files.find((f) => f.normalize('NFC').startsWith(`${String(track).padStart(2, '0')} `) && /\.mp3$/i.test(f))
  if (!hit) throw new Error(`no MP3 for track ${track} in the audio directory`)
  return join(AUDIO_DIR, hit)
}

async function main() {
  const argv = process.argv.slice(2)
  const i = argv.indexOf('--tracks')
  const spec = i >= 0 ? argv[i + 1] : undefined

  const result = validateContent(await loadContent())
  printResult(result)
  if (result.errors.length) {
    console.error('encrypt: refused — fix validation errors first')
    process.exit(1)
  }
  const bundle: Bundle = result.bundle

  const passphrase = await readPassphrase()
  const { salt, iterations, created } = await loadOrCreateSalt()
  if (created) console.log('encrypt: new salt written to public/data/salt.json (devices will re-enter the passphrase)')
  const key = await deriveKey(passphrase, salt, iterations)

  const plain = new TextEncoder().encode(JSON.stringify(bundle))
  const enc = await encryptFile(key, plain, salt, iterations, await syntheticIv(salt, plain))
  await writeFile(join(PUBLIC_DATA_DIR, 'bundle.enc'), enc)
  console.log(`bundle.enc: ${fmtBytes(enc.length)} (${fmtBytes(plain.length)} plain)`)

  // Audio: one encrypted file per track; the manifest lists files and sizes only (titles stay in the bundle).
  const wanted = spec === 'none' ? [] : spec ? parsePages(spec) : bundle.audio.map((a) => a.track)
  await mkdir(join(PUBLIC_DATA_DIR, 'audio'), { recursive: true })
  const audio: { track: number; file: string; bytes: number; type: string }[] = []
  for (const t of bundle.audio) {
    const file = `audio/${String(t.track).padStart(2, '0')}.enc`
    const out = join(PUBLIC_DATA_DIR, file)
    if (wanted.includes(t.track)) {
      const data = new Uint8Array(await readFile(await findTrackFile(t.track)))
      const encA = await encryptFile(key, data, salt, iterations, await syntheticIv(salt, data))
      await writeFile(out, encA)
      audio.push({ track: t.track, file, bytes: encA.length, type: 'audio/mpeg' })
    } else {
      const s = await stat(out).catch(() => null)
      if (s) audio.push({ track: t.track, file, bytes: s.size, type: 'audio/mpeg' })
    }
  }
  if (audio.length) console.log(`audio: ${audio.length} track(s), ${fmtBytes(audio.reduce((n, a) => n + a.bytes, 0))}`)

  const counts: Record<string, { total: number; checked: number }> = {}
  for (const [unit, s] of Object.entries(result.stats)) counts[`u${unit}`] = { total: s.vocab.total, checked: s.vocab.checked }
  counts.verbs = { total: bundle.verbs.length, checked: bundle.verbs.filter((v) => v.reviewStatus === 'checked').length }
  counts.exercises = { total: bundle.exercises.length, checked: bundle.exercises.filter((e) => e.reviewStatus === 'checked').length }
  const manifest = { version: 1, builtAt: new Date().toISOString(), bundle: { file: 'bundle.enc', bytes: enc.length }, audio: audio.sort((a, b) => a.track - b.track), counts }
  await writeFile(join(PUBLIC_DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`written ${relative(process.cwd(), PUBLIC_DATA_DIR)}/{bundle.enc,audio/*.enc,manifest.json,salt.json}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
