// Builds a tiny dummy bundle for the Playwright smoke test into public/data-test/. The passphrase and
// the content are public dummies — nothing from the course. Deterministic salt so the files are stable.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Bundle, CardInput } from '../src/content/schema'
import { deriveKey, encryptFile, fromHex, syntheticIv } from '../src/crypto/format'
import { ROOT } from './lib/paths'

export const TEST_PASSPHRASE = 'test-passphrase'
const SALT_HEX = '6d6d2d746573742d73616c742d303031' // "mm-test-salt-001"
const ITER = 20_000 // fast; the real bundle uses 210k

const card = (id: string, block: 1 | 2 | 3 | 4, cluster: string, clusterTitle: string, n: number, prompt: string): CardInput => ({
  id, block, cluster, clusterTitle, examNumber: n, type: 'recall', prompt,
  answer: `Тестовый ответ ${n}.\n\n- пункт один\n- пункт **два**`,
  examLine: `Так говорю на экзамене про ${n}.`, facts: [], images: [], sources: [{ file: 'test.pdf', page: n }], latin: [], tags: [], reviewStatus: 'checked', flags: [],
})
const cards: CardInput[] = [
  card('b1-q001', 1, 'A', 'Тема A', 1, 'Тестовый вопрос 1 (A)'),
  card('b1-q002', 1, 'A', 'Тема A', 2, 'Тестовый вопрос 2 (A)'),
  card('b1-q014', 1, 'B', 'Тема B', 14, 'Тестовый вопрос 14 (B)'),
  card('b1-q070', 1, 'G', 'Тема G', 70, 'Тестовый вопрос 70 (G)'),
  card('b2-m01', 2, 'shoulder', 'Плечевой пояс', 1, 'Тестовая мышца 1'),
  card('b3-m01', 3, 'pelvis', 'Таз', 1, 'Тестовый тест 1'),
  card('b4-s01', 4, 'vd', 'Навыки', 1, 'Тестовый навык 1'),
]

const dir = join(ROOT, 'public', 'data-test')
await mkdir(dir, { recursive: true })
const salt = fromHex(SALT_HEX)
const key = await deriveKey(TEST_PASSPHRASE, salt, ITER)
const bundle: Bundle = { version: 1, cards: cards as Bundle['cards'] }
const plain = new TextEncoder().encode(JSON.stringify(bundle))
const enc = await encryptFile(key, plain, salt, ITER, await syntheticIv(salt, plain))
await writeFile(join(dir, 'bundle.enc'), enc)
await writeFile(join(dir, 'salt.json'), JSON.stringify({ version: 1, salt: SALT_HEX, iterations: ITER }, null, 2) + '\n')
await writeFile(join(dir, 'manifest.json'), JSON.stringify({ version: 1, builtAt: '2026-10-09T00:00:00.000Z', bundle: { file: 'bundle.enc', bytes: enc.length }, images: [], counts: { 1: { total: 4, checked: 4 }, 2: { total: 1, checked: 1 }, 3: { total: 1, checked: 1 }, 4: { total: 1, checked: 1 } } }, null, 2) + '\n')
console.log(`test bundle: ${cards.length} dummy cards → public/data-test/`)
