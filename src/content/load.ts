// Fetches the encrypted bundle and turns it into cards. `?data=<dir>` switches the data directory
// (used by the Playwright smoke test with a dummy bundle); the choice sticks for the tab.
import { decryptFile, deriveKey, exportRawKey, fromHex, importRawKey, readHeader, toHex } from '../crypto/format'
import { BundleSchema, type Card } from './schema'

export interface Manifest {
  version: number
  builtAt: string
  bundle: { file: string; bytes: number }
  images: { id: string; file: string; bytes: number }[]
  counts: Record<string, { total: number; checked: number }>
}

/** The data directory name: "data" (real bundle) or a test directory chosen with ?data=… for this tab. */
export function dataDir(): string {
  if (typeof window === 'undefined') return 'data'
  try {
    const q = new URLSearchParams(window.location.search).get('data')
    if (q && /^[\w-]+$/.test(q)) {
      sessionStorage.setItem('sh.dataDir', q)
      return q
    }
    return sessionStorage.getItem('sh.dataDir') ?? 'data'
  } catch {
    return 'data'
  }
}

/** Storage key suffix so a test bundle never touches the real bundle's cached key or progress. */
export function storageScope(): string {
  const d = dataDir()
  return d === 'data' ? '' : `:${d}`
}

export function dataBase(): string {
  return `${import.meta.env.BASE_URL}${dataDir()}/`
}

async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  let r: Response
  try {
    r = await fetch(url, init)
  } catch {
    throw new Error('offline')
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`)
  return r
}

export async function fetchManifest(): Promise<Manifest> {
  return (await fetchOk(`${dataBase()}manifest.json`, { cache: 'no-cache' })).json() as Promise<Manifest>
}

export async function fetchBytes(file: string): Promise<Uint8Array> {
  return new Uint8Array(await (await fetchOk(`${dataBase()}${file}`)).arrayBuffer())
}

export interface Unlocked {
  cards: Card[]
  manifest: Manifest
  rawKeyHex: string
}

/** Throws WrongKeyError on a bad passphrase/key, Error('offline') without network and cache. */
export async function unlockBundle(auth: { passphrase: string } | { rawKeyHex: string }): Promise<Unlocked> {
  const manifest = await fetchManifest()
  const bytes = await fetchBytes(manifest.bundle.file)
  const header = readHeader(bytes)
  const key = 'rawKeyHex' in auth ? await importRawKey(fromHex(auth.rawKeyHex)) : await deriveKey(auth.passphrase, header.salt, header.iterations)
  const plain = await decryptFile(key, bytes)
  const bundle = BundleSchema.parse(JSON.parse(new TextDecoder().decode(plain)))
  return { cards: bundle.cards, manifest, rawKeyHex: toHex(await exportRawKey(key)) }
}
