// Per-device cache of the raw AES key (hex), never the passphrase. Opt-in via «Запомнить на этом устройстве».
import { storageScope } from '../content/load'

const KEY = `sh.rawKey${storageScope()}`

export function loadCachedKeyHex(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function saveCachedKeyHex(hex: string): void {
  try {
    localStorage.setItem(KEY, hex)
  } catch {
    /* private mode / quota — the user simply re-enters the passphrase next time */
  }
}

export function clearCachedKey(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
