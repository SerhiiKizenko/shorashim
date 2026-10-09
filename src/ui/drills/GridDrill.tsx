import { BINYAN_LABELS, GRID_COLUMNS, TENSE_LABELS, type Tense, type Verb } from '../../content/schema'
import type { Grade } from '../../engine/scheduler'
import { useProgress } from '../../store/progress'
import { Badge, Card, DraftNote, Pages } from '../components'
import { HebrewText, Pointed } from '../hebrew'
import { ParadigmGrid, type GridOutcome } from '../ParadigmGrid'

/** First-try mistakes decide the grade: none → good, one or two → hard, more (or gave up) → again. */
export const gradeFromOutcome = (o: GridOutcome): Grade => (o.gaveUp || o.firstTryWrong.length > 2 ? 'again' : o.firstTryWrong.length ? 'hard' : 'good')

export function GridDrill({ verb, tense, today, onDone }: { verb: Verb; tense: Tense; today: string; onDone: (g: Grade) => void }) {
  const recordCell = useProgress((s) => s.recordCell)
  const cells = verb.forms[tense] ?? {}
  const printed = new Set(verb.checkedAgainst.filter((c) => c.tense === tense).flatMap((c) => c.cells))
  const unprinted = Object.keys(cells).filter((c) => !printed.has(c))
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="lavender">{BINYAN_LABELS[verb.binyan].en}</Badge>
        <Badge tone="mist">{TENSE_LABELS[tense].en}</Badge>
        <Pages pages={verb.sources.map((s) => s.page)} />
      </div>
      <Card>
        <ParadigmGrid
          heading={
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col items-end">
                <span className="text-xs uppercase tracking-wide text-ink-muted">infinitive · שם הפועל</span>
                <HebrewText size="xl" className="font-bold" data-testid="study-prompt">{verb.infinitive.pointed}</HebrewText>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs uppercase tracking-wide text-ink-muted">root · שורש</span>
                <Pointed>{verb.root}</Pointed>
              </div>
            </div>
          }
          columns={GRID_COLUMNS[tense]}
          cells={cells}
          onCell={(cell, ok) => recordCell(`${verb.id}:${tense}:${cell}`, ok, today)}
          onFinished={(o) => onDone(gradeFromOutcome(o))}
        />
      </Card>
      <DraftNote status={verb.reviewStatus} flags={unprinted.length ? verb.flags : verb.flags.filter((f) => f !== 'generated')} />
    </div>
  )
}
