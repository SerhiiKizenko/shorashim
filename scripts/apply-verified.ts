// Applies a verification patch — a TS module exporting partial records keyed by id — onto content/*.json,
// then validates. Patches live in content/verified/*.ts (gitignored plaintext). Verb `forms` merge per tense
// and per cell, so one patch can fix one cell. Usage: pnpm apply-verified content/verified/g1.ts
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { COLLECTIONS } from '../src/content/schema'
import { collectionOf, loadContent, saveContentFile } from './lib/content'
import { printResult, validateContent } from './validate'

export type Patch = { id: string } & Record<string, unknown>

const file = process.argv[2]
if (!file) {
  console.error('usage: pnpm apply-verified <patch.ts>')
  process.exit(2)
}
const mod = (await import(pathToFileURL(resolve(file)).href)) as { default: Patch[] }
const content = await loadContent()
let applied = 0
for (const p of mod.default) {
  const col = collectionOf(p.id)
  const list = col ? (content[col] as Record<string, unknown>[]) : undefined
  const rec = list?.find((r) => r.id === p.id)
  if (!rec) {
    console.error(`unknown id ${p.id}`)
    process.exit(1)
  }
  const { forms, ...rest } = p as Patch & { forms?: Record<string, Record<string, unknown>> }
  Object.assign(rec, rest)
  if (forms) {
    const target = ((rec.forms as Record<string, Record<string, unknown>> | undefined) ??= {})
    for (const [tense, cells] of Object.entries(forms)) target[tense] = { ...(target[tense] ?? {}), ...cells }
  }
  applied++
}
for (const col of COLLECTIONS) await saveContentFile(col, content[col] as unknown[])
const r = validateContent(content)
printResult(r)
console.log(`applied ${applied} patch(es) from ${file}`)
process.exit(r.errors.length ? 1 : 0)
