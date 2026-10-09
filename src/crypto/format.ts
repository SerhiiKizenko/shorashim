// Encrypted-file format shared by scripts/encrypt.ts (Node) and the app (Safari).
// Layout: magic "MMEM" (4) | version (1) | iterations uint32 BE (4) | saltLen (1) | salt | ivLen (1) | iv | AES-GCM ciphertext+tag
// Key: PBKDF2-SHA256(passphrase NFKC, salt, iterations) → AES-256-GCM. One salt per content build so the
// app derives the key once and can cache the raw key; every file gets its own IV. The header is
// self-describing, so the app never needs a side file to open a bundle.

export const FORMAT_VERSION = 1
export const PBKDF2_ITERATIONS = 210_000
export const SALT_BYTES = 16
export const IV_BYTES = 12
const MAGIC = Uint8Array.from([0x4d, 0x4d, 0x45, 0x4d]) // "MMEM"

export interface EncHeader {
  version: number
  iterations: number
  salt: Uint8Array
  iv: Uint8Array
}

export class WrongKeyError extends Error {
  constructor() {
    super('wrong passphrase or corrupted file')
    this.name = 'WrongKeyError'
  }
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('WebCrypto is unavailable (requires HTTPS or localhost)')
  return c.subtle
}

/** Copy a view into a standalone ArrayBuffer — what WebCrypto's BufferSource expects. */
function buf(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n)
  globalThis.crypto.getRandomValues(b)
  return b
}

export function encodeFile(header: EncHeader, ciphertext: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + 1 + 4 + 1 + header.salt.length + 1 + header.iv.length + ciphertext.length)
  const view = new DataView(out.buffer)
  let o = 0
  out.set(MAGIC, o); o += 4
  out[o++] = header.version
  view.setUint32(o, header.iterations); o += 4
  out[o++] = header.salt.length
  out.set(header.salt, o); o += header.salt.length
  out[o++] = header.iv.length
  out.set(header.iv, o); o += header.iv.length
  out.set(ciphertext, o)
  return out
}

export function decodeFile(bytes: Uint8Array): { header: EncHeader; ciphertext: Uint8Array } {
  if (bytes.length < 11 || !MAGIC.every((b, i) => bytes[i] === b)) throw new Error('not an MMEM file')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let o = 4
  const version = bytes[o++]!
  if (version !== FORMAT_VERSION) throw new Error(`unsupported format version ${version}`)
  const iterations = view.getUint32(o); o += 4
  const saltLen = bytes[o++]!
  const salt = bytes.slice(o, o + saltLen); o += saltLen
  const ivLen = bytes[o++]!
  const iv = bytes.slice(o, o + ivLen); o += ivLen
  if (saltLen === 0 || ivLen === 0 || iterations === 0 || o > bytes.length) throw new Error('corrupted MMEM header')
  return { header: { version, iterations, salt, iv }, ciphertext: bytes.slice(o) }
}

export function readSalt(bytes: Uint8Array): Uint8Array {
  return decodeFile(bytes).header.salt
}

export function readHeader(bytes: Uint8Array): EncHeader {
  return decodeFile(bytes).header
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const material = await subtle().importKey(
    'raw',
    buf(new TextEncoder().encode(passphrase.normalize('NFKC'))),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: buf(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptFile(
  key: CryptoKey,
  plaintext: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  iv: Uint8Array = randomBytes(IV_BYTES),
): Promise<Uint8Array> {
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(plaintext)))
  return encodeFile({ version: FORMAT_VERSION, iterations, salt, iv }, ct)
}

export async function decryptFile(key: CryptoKey, bytes: Uint8Array): Promise<Uint8Array> {
  const { header, ciphertext } = decodeFile(bytes)
  try {
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: buf(header.iv) }, key, buf(ciphertext)))
  } catch {
    throw new WrongKeyError()
  }
}

export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await subtle().exportKey('raw', key))
}

export async function importRawKey(raw: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey('raw', buf(raw), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

/** Deterministic IV for static content: SHA-256(salt ‖ plaintext)[0..12). Identical content ⇒ identical
 * ciphertext, so re-running encrypt does not churn git. Safe because an IV only repeats with the same
 * plaintext, which leaks nothing but equality. */
export async function syntheticIv(salt: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const joined = new Uint8Array(salt.length + plaintext.length)
  joined.set(salt, 0)
  joined.set(plaintext, salt.length)
  return new Uint8Array(await subtle().digest('SHA-256', buf(joined))).slice(0, IV_BYTES)
}

export const toHex = (u: Uint8Array): string => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('')
export const fromHex = (h: string): Uint8Array => {
  if (h.length % 2) throw new Error('odd hex length')
  return Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16))
}
