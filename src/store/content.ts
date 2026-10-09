import { create } from 'zustand'
import type { Card } from '../content/schema'
import { unlockBundle, type Manifest } from '../content/load'
import { WrongKeyError } from '../crypto/format'
import { clearCachedKey, loadCachedKeyHex, saveCachedKeyHex } from '../crypto/keyCache'

export type ContentStatus = 'idle' | 'checking' | 'locked' | 'unlocking' | 'ready'

interface ContentState {
  status: ContentStatus
  error: string | null
  cards: Card[]
  byId: Record<string, Card>
  manifest: Manifest | null
  /** On start: try the cached key, else show the lock screen. */
  init: () => Promise<void>
  unlock: (passphrase: string, remember: boolean) => Promise<boolean>
  lock: () => void
}

const index = (cards: Card[]): Record<string, Card> => Object.fromEntries(cards.map((c) => [c.id, c]))

function describe(e: unknown): string {
  if (e instanceof WrongKeyError) return 'Неверный пароль.'
  if (e instanceof Error && e.message === 'offline') return 'Нет сети, а материалы ещё не сохранены на устройстве. Откройте приложение онлайн один раз.'
  return e instanceof Error ? `Не удалось открыть материалы: ${e.message}` : 'Не удалось открыть материалы.'
}

export const useContent = create<ContentState>()((set) => ({
  status: 'idle',
  error: null,
  cards: [],
  byId: {},
  manifest: null,

  async init() {
    const hex = loadCachedKeyHex()
    if (!hex) {
      set({ status: 'locked' })
      return
    }
    set({ status: 'checking' })
    try {
      const u = await unlockBundle({ rawKeyHex: hex })
      set({ status: 'ready', error: null, cards: u.cards, byId: index(u.cards), manifest: u.manifest })
    } catch (e) {
      if (e instanceof WrongKeyError) clearCachedKey()
      set({ status: 'locked', error: e instanceof WrongKeyError ? 'Сохранённый ключ больше не подходит — введите пароль ещё раз.' : describe(e) })
    }
  },

  async unlock(passphrase, remember) {
    set({ status: 'unlocking', error: null })
    try {
      const u = await unlockBundle({ passphrase })
      if (remember) saveCachedKeyHex(u.rawKeyHex)
      else clearCachedKey()
      set({ status: 'ready', error: null, cards: u.cards, byId: index(u.cards), manifest: u.manifest })
      return true
    } catch (e) {
      set({ status: 'locked', error: describe(e) })
      return false
    }
  },

  lock() {
    clearCachedKey()
    set({ status: 'locked', error: null, cards: [], byId: {}, manifest: null })
  },
}))
