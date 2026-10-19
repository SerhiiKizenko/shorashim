// A model verb's full table, read-only: every tense in the grid's own rows (the teacher's column order), each form
// pointed with its everyday spelling and its recording. The ־נָה forms sit greyed under future and imperative: they are
// for reading only — the grid, like modern Hebrew, uses the masculine form for אתן / הן.
import { Link, useParams } from 'react-router-dom'
import { BINYAN_LABELS, clipKey, GRID_COLUMNS, TENSE_LABELS, TENSES, type HebrewForm, type Tense, type Verb } from '../content/schema'
import { useContent } from '../store/content'
import { Card, Screen, Sources } from './components'
import { FormAudio } from './FormAudio'
import { HebrewText } from './hebrew'

const NA_LABEL: Partial<Record<Tense, string>> = { future: 'אתן / הן', imperative: 'אתן' }
/** «אני / אתה / הוא» in a narrow column: a no-break space ties each slash to the word before it, so a line may end
 * with «/» but never start with one */
const pronouns = (label: string) => label.replace(/ \//g, '\u00a0/')

function FormCell({ form }: { form: HebrewForm }) {
  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-end gap-x-2">
      <HebrewText size="lg" className="font-semibold">{form.pointed}</HebrewText>
      <HebrewText size="sm" className="text-ink-muted">({form.plain})</HebrewText>
    </span>
  )
}

function TenseTable({ verb, tense }: { verb: Verb; tense: Tense }) {
  const cells = verb.forms[tense]!
  const na = verb.naForms?.[tense as 'future' | 'imperative']
  return (
    <section data-testid={`table-${tense}`} className="flex flex-col gap-2">
      <h2 className="flex items-baseline justify-between gap-2 px-1">
        <span className="font-bold">{TENSE_LABELS[tense].en} <HebrewText size="sm" className="font-normal text-ink-muted">{TENSE_LABELS[tense].he}</HebrewText></span>
        <Link to={`/study/model?tense=${tense}`} data-testid={`table-drill-${tense}`} className="text-sm font-semibold text-sage-strong">drill the four →</Link>
      </h2>
      <Card className="flex flex-col gap-1 py-3">
        {GRID_COLUMNS[tense].map((col, i) =>
          cells[col.cell] ? (
            <div key={i} className="flex min-h-11 items-center gap-3">
              <span className="w-24 shrink-0 text-right">
                <HebrewText size="sm" className="font-semibold text-ink-muted">{pronouns(col.label)}</HebrewText>
              </span>
              <FormCell form={cells[col.cell]!} />
              <FormAudio verb={verb} clip={clipKey(tense, col.cell)} />
            </div>
          ) : null,
        )}
        {na ? (
          <div data-testid={`na-${tense}`} className="mt-1 flex flex-col gap-1 border-t border-surface-2 pt-2 opacity-60">
            <div className="flex min-h-11 items-center gap-3">
              <span className="w-24 shrink-0 text-right">
                <HebrewText size="sm" className="font-semibold">{pronouns(NA_LABEL[tense] ?? '')}</HebrewText>
              </span>
              <FormCell form={na} />
              <FormAudio verb={verb} clip={`na.${tense}`} />
            </div>
            <p className="text-xs">Formal ־נָה form, for reading. In modern Hebrew the masculine form above is used — the grid asks for that one.</p>
          </div>
        ) : null}
      </Card>
    </section>
  )
}

export function VerbTable() {
  const { verbId = '' } = useParams()
  const verb = useContent((s) => s.verbById[verbId])
  if (!verb)
    return (
      <Screen title="Model verbs" back="/model">
        <p className="py-6 text-center text-ink-muted">This verb is not in the materials.</p>
      </Screen>
    )
  return (
    <Screen title={verb.infinitive.plain} back="/model">
      <div className="flex flex-col gap-4 pt-2">
        <Card data-testid="table-head" className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-semibold">{BINYAN_LABELS[verb.binyan].en} <HebrewText size="sm" className="font-normal text-ink-muted">{BINYAN_LABELS[verb.binyan].he}</HebrewText></span>
            <span className="text-sm text-ink-muted">{verb.en ?? verb.ru ?? ''}</span>
            <Sources sources={verb.sources} />
          </div>
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-end">
              <HebrewText size="xl" className="font-bold">{verb.infinitive.pointed}</HebrewText>
              <HebrewText size="sm" className="text-ink-muted">{verb.root}</HebrewText>
            </div>
            <FormAudio verb={verb} clip="infinitive" />
          </div>
        </Card>
        {TENSES.filter((t) => Object.keys(verb.forms[t] ?? {}).length).map((t) => (
          <TenseTable key={t} verb={verb} tense={t} />
        ))}
      </div>
    </Screen>
  )
}
