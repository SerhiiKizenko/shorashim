// Builds a tiny dummy bundle for the Playwright smoke test into public/data-test/: three vocabulary entries,
// one verb with a future grid (לכתוב, ordinary pa'al — general Hebrew, nothing from the book), one grammar
// topic, one exercise, one unit and one 1-second audio track synthesised here. The passphrase is public.
// Deterministic salt and IV so the files are stable in git.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BundleSchema, type BundleInput } from '../src/content/schema'
import { deriveKey, encryptFile, fromHex, syntheticIv } from '../src/crypto/format'
import { PUBLIC_TEST_DATA_DIR } from './lib/paths'

export const TEST_PASSPHRASE = 'test-passphrase'
const SALT_HEX = '73682d746573742d73616c742d303031' // "sh-test-salt-001"
const ITER = 20_000 // fast; the real bundle uses 210k

const f = (pointed: string, plain: string) => ({ pointed, plain })
const bundle: BundleInput = {
  version: 1,
  units: [{ unit: 1, letter: 'א', pages: [8, 17], vocabPage: 8, sections: [{ number: 1, titleHe: 'טקסט לדוגמה', page: 9 }] }],
  vocab: [
    { id: 'u01-v001', unit: 1, pos: 'noun', he: 'סֵפֶר ז', lemma: f('סֵפֶר', 'ספר'), gender: 'm', ru: 'книга', sources: [{ page: 8 }], reviewStatus: 'checked', flags: [] },
    { id: 'u01-v002', unit: 1, pos: 'verb', he: 'כּוֹתֵב — לִכְתּוֹב', lemma: f('לִכְתּוֹב', 'לכתוב'), present: f('כּוֹתֵב', 'כותב'), ru: 'писать', verbId: 'v-ktb-paal', sources: [{ page: 8 }], reviewStatus: 'checked', flags: [] },
    { id: 'u01-v003', unit: 1, pos: 'adverb', he: 'תָּמִיד', lemma: f('תָּמִיד', 'תמיד'), ru: 'всегда', sources: [{ page: 8 }], reviewStatus: 'draft', flags: [] },
  ],
  verbs: [
    {
      id: 'v-ktb-paal', unit: 1, infinitive: f('לִכְתּוֹב', 'לכתוב'), root: 'כ.ת.ב', binyan: 'paal', group: 'shlemim', paalType: 'efol', ru: 'писать', sources: [{ page: 8 }], reviewStatus: 'checked', flags: [],
      forms: {
        future: { ani: f('אֶכְתּוֹב', 'אכתוב'), ata: f('תִּכְתּוֹב', 'תכתוב'), at: f('תִּכְתְּבִי', 'תכתבי'), anachnu: f('נִכְתּוֹב', 'נכתוב'), atem: f('תִּכְתְּבוּ', 'תכתבו'), hu: f('יִכְתּוֹב', 'יכתוב'), hi: f('תִּכְתּוֹב', 'תכתוב'), hem: f('יִכְתְּבוּ', 'יכתבו') },
        past: { ani: f('כָּתַבְתִּי', 'כתבתי'), ata: f('כָּתַבְתָּ', 'כתבת'), at: f('כָּתַבְתְּ', 'כתבת'), anachnu: f('כָּתַבְנוּ', 'כתבנו'), atem: f('כְּתַבְתֶּם', 'כתבתם'), aten: f('כְּתַבְתֶּן', 'כתבתן'), hu: f('כָּתַב', 'כתב'), hi: f('כָּתְבָה', 'כתבה'), hem: f('כָּתְבוּ', 'כתבו') },
      },
      checkedAgainst: [{ page: 8, tense: 'future', cells: ['ani', 'ata', 'at', 'anachnu', 'atem', 'hu', 'hi', 'hem'] }],
    },
  ],
  grammar: [
    { id: 'u01-s1', unit: 1, section: 1, titleHe: 'זמן עתיד — דוגמה', titleEn: 'Future tense — test topic', pages: [8], explanationEn: 'A **test** explanation.\n\n- prefixes: א ת י נ', tables: [], examples: [{ he: 'אני אכתוב מכתב', en: 'I will write a letter' }], verbIds: ['v-ktb-paal'], exerciseIds: ['u01-ex1.1'], tense: 'future', binyan: 'paal', sources: [{ page: 8 }], reviewStatus: 'checked', flags: [] },
  ],
  exercises: [
    { id: 'u01-ex1.1', unit: 1, page: 9, number: '1.1', instructionHe: 'כתוב בעתיד', instructionEn: 'Rewrite in the future', kind: 'transform', gradable: true, sources: [{ page: 9 }], reviewStatus: 'checked', flags: [], items: [{ label: 'א', prompt: 'אני ___ מכתב (לכתוב)', hint: 'לכתוב', tense: 'future', answers: ['אכתוב'], keyPage: 188, flags: [] }, { label: 'ב', prompt: 'הם ___ מכתב (לכתוב)', hint: 'לכתוב', tense: 'future', answers: ['יכתבו'], keyPage: 188, flags: [] }] },
  ],
  texts: [{ id: 'u01-t1', unit: 1, titleHe: 'טקסט לדוגמה', pages: [9], paragraphs: ['שלום. זה טקסט לדוגמה.'], audioTrack: 1, sources: [{ page: 9 }], reviewStatus: 'checked', flags: [] }],
  proverbs: [],
  prepositions: [],
  audio: [{ track: 1, file: 'audio/01.enc', unit: 1, pages: [9], titleHe: 'טקסט לדוגמה', kind: 'text', seconds: 1 }],
}

/** 1 s of a 440 Hz tone, 8 kHz mono 16-bit PCM WAV — ~16 KB, plays in every browser. */
function makeWav(): Uint8Array {
  const rate = 8000
  const n = rate
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 12000), true)
  return new Uint8Array(buf)
}

const dir = PUBLIC_TEST_DATA_DIR
await mkdir(join(dir, 'audio'), { recursive: true })
const salt = fromHex(SALT_HEX)
const key = await deriveKey(TEST_PASSPHRASE, salt, ITER)
const plain = new TextEncoder().encode(JSON.stringify(BundleSchema.parse(bundle)))
const enc = await encryptFile(key, plain, salt, ITER, await syntheticIv(salt, plain))
await writeFile(join(dir, 'bundle.enc'), enc)
const wav = makeWav()
const encWav = await encryptFile(key, wav, salt, ITER, await syntheticIv(salt, wav))
await writeFile(join(dir, 'audio', '01.enc'), encWav)
await writeFile(join(dir, 'salt.json'), JSON.stringify({ version: 1, salt: SALT_HEX, iterations: ITER }, null, 2) + '\n')
await writeFile(
  join(dir, 'manifest.json'),
  JSON.stringify({ version: 1, builtAt: '2026-10-09T00:00:00.000Z', bundle: { file: 'bundle.enc', bytes: enc.length }, audio: [{ track: 1, file: 'audio/01.enc', bytes: encWav.length, type: 'audio/wav' }], counts: { u1: { total: 3, checked: 2 }, verbs: { total: 1, checked: 1 }, exercises: { total: 1, checked: 1 } } }, null, 2) + '\n',
)
console.log(`test bundle: ${bundle.vocab.length} vocab, 1 verb, 1 exercise, 1 WAV track → public/data-test/`)
