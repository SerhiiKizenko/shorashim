// Audio tracks ship as one encrypted file each. On play the file is fetched (the service worker caches it after
// the first time), decrypted with the cached key and handed to <audio> as a Blob URL. Nothing is precached.
import { decryptFile, fromHex, importRawKey } from '../crypto/format'
import { fetchBytes } from './load'

const urls = new Map<string, string>()

export async function trackObjectUrl(file: string, type: string, rawKeyHex: string): Promise<string> {
  const hit = urls.get(file)
  if (hit) return hit
  const bytes = await fetchBytes(file)
  const key = await importRawKey(fromHex(rawKeyHex))
  const plain = await decryptFile(key, bytes)
  const copy = plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.byteLength) as ArrayBuffer
  const url = URL.createObjectURL(new Blob([copy], { type }))
  urls.set(file, url)
  return url
}

export function revokeTrackUrls(): void {
  for (const u of urls.values()) URL.revokeObjectURL(u)
  urls.clear()
}

/** A Hebrew voice, if the device has one (iOS: Settings → Accessibility → Spoken Content → Voices → Hebrew). */
export function hebrewVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('he')) ?? null
}

export function speakHebrew(text: string): boolean {
  const voice = hebrewVoice()
  if (!voice) return false
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang
  u.rate = 0.85
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
  return true
}

export const fmtTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
