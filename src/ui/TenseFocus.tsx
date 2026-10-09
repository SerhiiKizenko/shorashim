// The tense picker (decision 13): a multi-select over the tenses that have content, saved per device.
// Progress is keyed per verb × tense, so toggling never loses anything.
import { useMemo } from 'react'
import { TENSE_LABELS, TENSES, type Tense } from '../content/schema'
import { tenseCounts } from '../engine/items'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { HebrewText } from './hebrew'

export function TenseFocus({ compact = false }: { compact?: boolean }) {
  const items = useContent((s) => s.items)
  const focus = useProgress((s) => s.settings.tenseFocus)
  const setTenseFocus = useProgress((s) => s.setTenseFocus)
  const counts = useMemo(() => tenseCounts(items), [items])
  const available = TENSES.filter((t) => counts[t])

  function toggle(t: Tense) {
    const next = focus.includes(t) ? focus.filter((x) => x !== t) : TENSES.filter((x) => x === t || focus.includes(x))
    setTenseFocus(next)
  }

  if (!available.length) return <p className="text-sm text-ink-muted">No verb paradigms in the materials yet.</p>
  return (
    <div data-testid="tense-focus" className="flex flex-col gap-2">
      {!compact ? <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tense focus</p> : null}
      <div className="flex flex-wrap gap-2">
        {available.map((t) => {
          const on = focus.includes(t)
          return (
            <button
              key={t}
              type="button"
              data-testid={`focus-chip-${t}`}
              aria-pressed={on}
              onClick={() => toggle(t)}
              className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${on ? 'bg-sage-strong text-on-accent' : 'bg-surface-2 text-ink-muted'}`}
            >
              {TENSE_LABELS[t].en} <HebrewText size="sm">{TENSE_LABELS[t].he}</HebrewText> <span className="opacity-70">· {counts[t]}</span>
            </button>
          )
        })}
      </div>
      {!compact ? <p className="text-xs text-ink-muted">{focus.length === 0 ? 'No tense selected: verb drills are off, vocabulary continues.' : focus.length === 1 ? 'One tense at a time. Add more to mix them in one session.' : 'Mixed: sessions interleave the selected tenses, and «Which form?» asks for the tense too.'}</p> : null}
    </div>
  )
}
