import { create } from 'zustand'
import { revokeTrackUrls } from '../content/audio'
import { unlockBundle, type Manifest } from '../content/load'
import { BundleSchema, EMPTY_BUNDLE, type Bundle, type Exercise, type GrammarTopic, type PrepositionParadigm, type Verb, type VocabEntry } from '../content/schema'
import { WrongKeyError } from '../crypto/format'
import { clearCachedKey, loadCachedKeyHex, saveCachedKeyHex } from '../crypto/keyCache'
import { itemsFromBundle } from '../engine/items'
import type { SchedItem } from '../engine/scheduler'

export type ContentStatus = 'idle' | 'checking' | 'locked' | 'unlocking' | 'ready'

interface Derived {
  bundle: Bundle
  items: SchedItem[]
  vocabById: Record<string, VocabEntry>
  verbById: Record<string, Verb>
  grammarById: Record<string, GrammarTopic>
  exerciseById: Record<string, Exercise>
  prepById: Record<string, PrepositionParadigm>
}
interface ContentState extends Derived {
  status: ContentStatus
  error: string | null
  manifest: Manifest | null
  /** raw AES key for this session (also needed when «remember» is off, to decrypt audio) */
  rawKeyHex: string | null
  /** On start: try the cached key, else show the lock screen. */
  init: () => Promise<void>
  unlock: (passphrase: string, remember: boolean) => Promise<boolean>
  lock: () => void
}

const byId = <T extends { id: string }>(xs: T[]): Record<string, T> => Object.fromEntries(xs.map((x) => [x.id, x]))
function derive(bundle: Bundle): Derived {
  return { bundle, items: itemsFromBundle(bundle), vocabById: byId(bundle.vocab), verbById: byId(bundle.verbs), grammarById: byId(bundle.grammar), exerciseById: byId(bundle.exercises), prepById: byId(bundle.prepositions) }
}
const empty = derive(BundleSchema.parse(EMPTY_BUNDLE))

function describe(e: unknown): string {
  if (e instanceof WrongKeyError) return 'Wrong passphrase.'
  if (e instanceof Error && e.message === 'offline') return 'You are offline and the materials are not saved on this device yet. Open the app online once.'
  return e instanceof Error ? `Could not open the materials: ${e.message}` : 'Could not open the materials.'
}

export const useContent = create<ContentState>()((set) => ({
  status: 'idle',
  error: null,
  manifest: null,
  rawKeyHex: null,
  ...empty,

  async init() {
    const hex = loadCachedKeyHex()
    if (!hex) {
      set({ status: 'locked' })
      return
    }
    set({ status: 'checking' })
    try {
      const u = await unlockBundle({ rawKeyHex: hex })
      set({ status: 'ready', error: null, manifest: u.manifest, rawKeyHex: u.rawKeyHex, ...derive(u.bundle) })
    } catch (e) {
      if (e instanceof WrongKeyError) clearCachedKey()
      set({ status: 'locked', error: e instanceof WrongKeyError ? 'The saved key no longer fits — enter the passphrase again.' : describe(e) })
    }
  },

  async unlock(passphrase, remember) {
    set({ status: 'unlocking', error: null })
    try {
      const u = await unlockBundle({ passphrase })
      if (remember) saveCachedKeyHex(u.rawKeyHex)
      else clearCachedKey()
      set({ status: 'ready', error: null, manifest: u.manifest, rawKeyHex: u.rawKeyHex, ...derive(u.bundle) })
      return true
    } catch (e) {
      set({ status: 'locked', error: describe(e) })
      return false
    }
  },

  lock() {
    clearCachedKey()
    revokeTrackUrls()
    set({ status: 'locked', error: null, manifest: null, rawKeyHex: null, ...empty })
  },
}))
