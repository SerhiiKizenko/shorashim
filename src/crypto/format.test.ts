import { describe, expect, it } from 'vitest'
import {
  decodeFile,
  decryptFile,
  deriveKey,
  encryptFile,
  exportRawKey,
  fromHex,
  importRawKey,
  randomBytes,
  readHeader,
  readSalt,
  syntheticIv,
  toHex,
  WrongKeyError,
} from './format'

const enc = (s: string) => new TextEncoder().encode(s)
const dec = (u: Uint8Array) => new TextDecoder().decode(u)
const ITER = 2_000 // fast for tests; production uses PBKDF2_ITERATIONS

describe('encrypted file format', () => {
  it('round-trips Cyrillic text through encrypt → decrypt', async () => {
    const salt = randomBytes(16)
    const key = await deriveKey('пароль-тест', salt, ITER)
    const file = await encryptFile(key, enc('Дельтовидная мышца — m. deltoideus'), salt, ITER)
    expect(dec(await decryptFile(key, file))).toBe('Дельтовидная мышца — m. deltoideus')
    expect(toHex(readSalt(file))).toBe(toHex(salt))
    expect(readHeader(file).iterations).toBe(ITER)
  })

  it('rejects a wrong passphrase with WrongKeyError', async () => {
    const salt = randomBytes(16)
    const good = await deriveKey('правильный', salt, ITER)
    const bad = await deriveKey('неправильный', salt, ITER)
    const file = await encryptFile(good, enc('secret'), salt, ITER)
    await expect(decryptFile(bad, file)).rejects.toBeInstanceOf(WrongKeyError)
  })

  it('normalises the passphrase (NFKC) so composed and decomposed input match', async () => {
    const salt = randomBytes(16)
    const composed = await deriveKey('й', salt, ITER) // U+0439
    const decomposed = await deriveKey('й', salt, ITER) // и + combining breve
    const file = await encryptFile(composed, enc('x'), salt, ITER)
    expect(dec(await decryptFile(decomposed, file))).toBe('x')
  })

  it('exported raw key re-imports and still decrypts (device cache path)', async () => {
    const salt = randomBytes(16)
    const key = await deriveKey('p', salt, ITER)
    const file = await encryptFile(key, enc('cached'), salt, ITER)
    const raw = await exportRawKey(key)
    expect(raw.length).toBe(32)
    const again = await importRawKey(fromHex(toHex(raw)))
    expect(dec(await decryptFile(again, file))).toBe('cached')
  })

  it('refuses files without the magic header', () => {
    expect(() => decodeFile(enc('not an mmem file at all'))).toThrow(/not an MMEM/)
  })

  it('synthetic IV is deterministic per (salt, plaintext) so re-encrypting is byte-identical', async () => {
    const salt = randomBytes(16)
    const key = await deriveKey('p', salt, ITER)
    const iv1 = await syntheticIv(salt, enc('same'))
    const iv2 = await syntheticIv(salt, enc('same'))
    expect(toHex(iv1)).toBe(toHex(iv2))
    expect(toHex(await syntheticIv(salt, enc('other')))).not.toBe(toHex(iv1))
    const a = await encryptFile(key, enc('same'), salt, ITER, iv1)
    const b = await encryptFile(key, enc('same'), salt, ITER, iv2)
    expect(toHex(a)).toBe(toHex(b))
  })
})
