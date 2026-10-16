// Checks one transcription file before the diff: the schema, and the workbook conventions the importer relies on
// (docs/CONTENT-RULES.md). Run: pnpm check-pass sources/transcribed/workbook/p040.pass1.json [more files]
import { readFile } from 'node:fs/promises'
import { TENSE_CELLS, type Tense } from '../src/content/schema'
import { stripMarks } from './lib/content'
import { TranscriptionSchema } from './lib/transcription'

let bad = 0
for (const file of process.argv.slice(2)) {
  const problems: string[] = []
  const parsed = TranscriptionSchema.safeParse(JSON.parse(await readFile(file, 'utf8')))
  if (!parsed.success) {
    for (const i of parsed.error.issues) problems.push(`schema: ${i.path.join('.')} ${i.message}`)
  } else {
    const t = parsed.data
    const infinitives = new Set(t.verbs.map((v) => v.infinitive.plain ?? stripMarks(v.infinitive.pointed)))
    for (const v of t.verbs)
      for (const [tense, cells] of Object.entries(v.forms ?? {}))
        for (const c of Object.keys(cells ?? {})) if (!(TENSE_CELLS[tense as Tense] as readonly string[]).includes(c)) problems.push(`verb ${v.root}: ${tense}.${c} is not a cell`)
    for (const e of t.exercises) {
      const labels = new Set<string>()
      for (const it of e.items) {
        const where = `${e.number} ${it.label}`
        if (labels.has(it.label)) problems.push(`${where}: duplicate label`)
        labels.add(it.label)
        if (it.verb && !infinitives.has(it.verb)) problems.push(`${where}: verb ${it.verb} has no verbs[] entry on this page`)
        // main-book answers come from the answer key pages; workbook answers are derived from the paradigms
        if (t.book === 'workbook') {
          if (!it.verb && !it.answers) problems.push(`${where}: no verb and no printed answer — the importer cannot derive one`)
          if (it.ask && (it.tense || it.cells)) problems.push(`${where}: ask ${it.ask} takes no tense or cells`)
          if (!it.ask && !it.answers && (!it.tense || !it.cells?.length)) problems.push(`${where}: a tense blank needs tense and cells`)
        }
        if (it.tense && it.cells) for (const c of it.cells) if (!(TENSE_CELLS[it.tense] as readonly string[]).includes(c)) problems.push(`${where}: ${c} is not a ${it.tense} cell`)
      }
    }
    const items = t.exercises.reduce((n, e) => n + e.items.length, 0)
    console.log(`${file}: ${t.book} p.${t.page} · ${t.grammar.length} topic · ${t.verbs.length} verbs · ${t.exercises.length} exercises, ${items} items · ${t.proverbs.length} proverbs`)
  }
  for (const p of problems) console.log(`  ${p}`)
  if (problems.length) bad++
}
process.exit(bad ? 1 : 0)
