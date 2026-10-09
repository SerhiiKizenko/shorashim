// Validates the plaintext card bank before encryption. Exits 1 on errors. Run: pnpm validate
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { CardSchema, EXPECTED_COUNTS, UNSUPPORTED_MARK, type Block, type Card } from '../src/content/schema'
import { loadCards } from './lib/cards'
import { IMAGES_DIR } from './lib/paths'
import { fmtBytes } from './lib/run'

export const TEXT_BUDGET = 3 * 1024 * 1024
export const IMAGES_BUDGET = 40 * 1024 * 1024

export interface ValidationResult {
  errors: string[]
  warnings: string[]
  cards: Card[]
  stats: Record<Block, { total: number; checked: number; draft: number; stubs: number }>
}

export async function validateCards(raw: unknown[]): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const cards: Card[] = []
  for (const [i, r] of raw.entries()) {
    const p = CardSchema.safeParse(r)
    if (p.success) cards.push(p.data)
    else errors.push(`card #${i} (${(r as { id?: string })?.id ?? '?'}): ${p.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`)
  }

  const ids = new Set<string>()
  for (const c of cards) {
    if (ids.has(c.id)) errors.push(`${c.id}: duplicate id`)
    ids.add(c.id)
    if (c.sources.length === 0) errors.push(`${c.id}: no sources`)
    if (/\bTODO\b/.test(c.answer) || /\bTODO\b/.test(c.prompt)) errors.push(`${c.id}: contains TODO`)
    if (c.reviewStatus === 'checked') {
      if (c.sources.some((s) => s.page === null)) errors.push(`${c.id}: checked but a source has no page`)
      if (c.answer.includes(UNSUPPORTED_MARK) && !c.flags.includes('unsupported')) errors.push(`${c.id}: checked with unsupported mark but no 'unsupported' flag`)
      if (!c.examLine) warnings.push(`${c.id}: checked without «Как сказать на экзамене»`)
    }
  }

  // Coverage: every exam number present once per block (sub-cards share the number).
  const stats = {} as ValidationResult['stats']
  for (const block of [1, 2, 3, 4] as Block[]) {
    const mine = cards.filter((c) => c.block === block)
    const nums = new Set(mine.map((c) => c.examNumber))
    const missing: number[] = []
    for (let n = 1; n <= EXPECTED_COUNTS[block]; n++) if (!nums.has(n)) missing.push(n)
    if (missing.length) errors.push(`block ${block}: missing exam numbers ${missing.join(', ')}`)
    const extra = [...nums].filter((n) => n > EXPECTED_COUNTS[block])
    if (extra.length) errors.push(`block ${block}: unexpected exam numbers ${extra.join(', ')}`)
    const top = mine.filter((c) => !c.subNumber)
    const dup = top.map((c) => c.examNumber).filter((n, i, a) => a.indexOf(n) !== i)
    if (dup.length) errors.push(`block ${block}: duplicated top-level numbers ${[...new Set(dup)].join(', ')}`)
    stats[block] = {
      total: mine.length,
      checked: mine.filter((c) => c.reviewStatus === 'checked').length,
      draft: mine.filter((c) => c.reviewStatus === 'draft').length,
      stubs: mine.filter((c) => c.flags.includes('stub')).length,
    }
  }

  // Images referenced must exist; budgets.
  let imageBytes = 0
  const present = new Set(await readdir(IMAGES_DIR).catch(() => [] as string[]))
  for (const c of cards) for (const img of c.images) if (!present.has(img)) errors.push(`${c.id}: image ${img} not in content/images`)
  for (const f of present) imageBytes += (await stat(join(IMAGES_DIR, f))).size
  const textBytes = Buffer.byteLength(JSON.stringify(cards))
  if (textBytes > TEXT_BUDGET) errors.push(`text bundle ${fmtBytes(textBytes)} exceeds ${fmtBytes(TEXT_BUDGET)}`)
  if (imageBytes > IMAGES_BUDGET) errors.push(`images ${fmtBytes(imageBytes)} exceed ${fmtBytes(IMAGES_BUDGET)}`)

  return { errors, warnings, cards, stats }
}

export function printResult(r: ValidationResult): void {
  for (const block of [1, 2, 3, 4] as Block[]) {
    const s = r.stats[block]
    console.log(`block ${block}: ${s.total} cards (${s.checked} checked, ${s.draft} draft, ${s.stubs} stubs)`)
  }
  for (const w of r.warnings) console.log(`warn  ${w}`)
  for (const e of r.errors) console.log(`ERROR ${e}`)
  console.log(r.errors.length ? `validate: ${r.errors.length} error(s)` : 'validate: ok')
}

if (process.argv[1]?.endsWith('validate.ts')) {
  const r = await validateCards(await loadCards())
  printResult(r)
  process.exit(r.errors.length ? 1 : 0)
}
