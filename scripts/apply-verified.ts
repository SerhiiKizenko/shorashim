// Applies a verification patch — a TS module exporting Partial<Card>[] keyed by id — onto content/cards,
// then validates. Patches live in content/verified/*.ts (gitignored plaintext). Usage: pnpm apply-verified content/verified/g1.ts
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Block, CardInput } from '../src/content/schema'
import { loadCards, saveCards } from './lib/cards'
import { printResult, validateCards } from './validate'

export type Patch = Partial<CardInput> & { id: string }

const file = process.argv[2]
if (!file) {
  console.error('usage: pnpm apply-verified <patch.ts>')
  process.exit(2)
}
const mod = (await import(pathToFileURL(resolve(file)).href)) as { default: Patch[] }
const cards = await loadCards()
const byId = new Map(cards.map((c) => [c.id, c]))
let applied = 0
for (const p of mod.default) {
  const c = byId.get(p.id)
  if (!c) {
    console.error(`unknown card id ${p.id}`)
    process.exit(1)
  }
  const { muscle, ...rest } = p
  Object.assign(c, rest)
  if (muscle) {
    const mmt = muscle.mmt || c.muscle?.mmt ? { ...(c.muscle?.mmt ?? {}), ...(muscle.mmt ?? {}) } : undefined
    c.muscle = { ...(c.muscle ?? {}), ...muscle, ...(mmt ? { mmt } : {}) }
  }
  applied++
}
for (const block of [1, 2, 3, 4] as Block[]) await saveCards(block, cards.filter((c) => c.block === block))
const r = await validateCards(cards)
printResult(r)
console.log(`applied ${applied} patch(es) from ${file}`)
process.exit(r.errors.length ? 1 : 0)
