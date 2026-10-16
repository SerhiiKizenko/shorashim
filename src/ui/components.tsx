import { BOOKS, MAIN_BOOK, pageLabel, type BookId } from '../content/schema'
import { ChevronLeft } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Grade } from '../engine/scheduler'

export function Screen({ title, back, right, children, footer }: { title?: string; back?: string; right?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {(title || back) && (
        <header className="safe-top safe-x sticky top-0 z-10 flex items-center gap-2 bg-bg/90 pb-2 backdrop-blur">
          {back ? (
            <Link to={back} aria-label="Back" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-muted active:bg-surface-2">
              <ChevronLeft />
            </Link>
          ) : null}
          <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
          {right}
        </header>
      )}
      <main className={`safe-x flex-1 ${title || back ? '' : 'safe-top'} ${footer ? 'pb-4' : 'safe-bottom'}`}>{children}</main>
      {footer ? <footer className="safe-x safe-bottom sticky bottom-0 bg-bg/95 pt-2 backdrop-blur">{footer}</footer> : null}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'ok' | 'warn' | 'bad'
const variants: Record<Variant, string> = {
  primary: 'bg-sage-strong text-on-accent active:opacity-80',
  secondary: 'bg-surface-2 text-ink active:opacity-80',
  ghost: 'bg-transparent text-ink-muted active:bg-surface-2',
  ok: 'bg-ok text-on-accent active:opacity-80',
  warn: 'bg-warn text-ink active:opacity-80',
  bad: 'bg-bad text-on-accent active:opacity-80',
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-base font-semibold transition disabled:opacity-40 ${variants[variant]} ${className}`} {...rest} />
}

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  // A caller that sets its own bg-* must win; two bg utilities on one element resolve by stylesheet order, not by props.
  const bg = /\bbg-/.test(className) ? '' : 'bg-surface'
  return (
    <div className={`rounded-3xl ${bg} p-5 shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  )
}

type Tone = 'sand' | 'lavender' | 'rose' | 'mist' | 'sage'
const tones: Record<Tone, string> = { sand: 'bg-sand', lavender: 'bg-lavender', rose: 'bg-rose', mist: 'bg-mist', sage: 'bg-sage' }
export function Badge({ children, tone = 'sand', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-ink ${tones[tone]} ${className}`}>{children}</span>
}

export function ProgressRing({ value, size = 96, label, sub }: { value: number; size?: number; label: string; sub?: string }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-surface-2)" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-sage-strong)" strokeWidth={10} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-lg font-bold leading-none">{label}</div>
        {sub ? <div className="mt-1 text-[11px] text-ink-muted">{sub}</div> : null}
      </div>
    </div>
  )
}

/** The three self-grade buttons; `allow` greys out the ones that make no sense after a typed answer. */
export function GradeBar({ onGrade, allow = ['again', 'hard', 'good'] }: { onGrade: (g: Grade) => void; allow?: Grade[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button data-testid="grade-again" variant="bad" disabled={!allow.includes('again')} onClick={() => onGrade('again')}>Again</Button>
      <Button data-testid="grade-hard" variant="warn" disabled={!allow.includes('hard')} onClick={() => onGrade('hard')}>Hard</Button>
      <Button data-testid="grade-good" variant="ok" disabled={!allow.includes('good')} onClick={() => onGrade('good')}>Good</Button>
    </div>
  )
}

export function DraftNote({ status, flags = [] }: { status: 'draft' | 'checked'; flags?: string[] }) {
  if (status === 'checked' && !flags.length) return null
  return (
    <p className="rounded-2xl bg-warn/25 px-4 py-2 text-sm">
      {status === 'draft' ? 'Draft — not yet checked against the book. ' : ''}
      {flags.includes('generated') ? 'Some cells follow the book’s pattern but are not printed in the book. ' : ''}
      {flags.includes('unreadable') ? 'A spot on the page could not be read (marked "?"). ' : ''}
    </p>
  )
}

/** «p. 54» / «pp. 54, 55» for the main book, «Workbook p. 40» for any other. */
export const Pages = ({ pages, book = MAIN_BOOK }: { pages: number[]; book?: BookId }) => (
  <span className="text-xs text-ink-muted">
    {book === MAIN_BOOK ? '' : `${BOOKS[book].short} `}
    {pages.length === 1 ? `p. ${pages[0]}` : `pp. ${pages.join(', ')}`}
  </span>
)
/** Every page a record cites, each with its book: «p. 54 · Workbook p. 40». */
export const Sources = ({ sources }: { sources: { book: BookId; page: number }[] }) => <span className="text-xs text-ink-muted">{[...new Set(sources.map((s) => pageLabel(s.book, s.page)))].join(' · ')}</span>

export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

/** Due counts for the next days as small bars (index 0 = today, overdue included). `data-counts` holds the numbers. */
export function Forecast({ counts, testId }: { counts: number[]; testId?: string }) {
  const max = Math.max(1, ...counts)
  const week = counts.slice(1, 8).reduce((a, b) => a + b, 0)
  return (
    <div data-testid={testId} data-counts={counts.join(',')} className="flex flex-col gap-1">
      <div className="flex h-10 items-end gap-1" aria-hidden>
        {counts.map((n, i) => (
          <div key={i} className={`flex-1 rounded-t-sm ${n === 0 ? 'bg-surface-2' : i === 0 ? 'bg-sage-strong' : 'bg-sage'}`} style={{ height: n ? `${Math.max(12, (100 * n) / max)}%` : '3px' }} />
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        Coming up: {week} due in the next 7 days{counts.length > 8 ? `, ${counts.slice(8).reduce((a, b) => a + b, 0)} the week after` : ''}.
      </p>
    </div>
  )
}

/** Seven dots, oldest first: the days with at least one answer. There is no streak to lose. */
export function WeekStrip({ days, testId }: { days: boolean[]; testId?: string }) {
  const n = days.filter(Boolean).length
  return (
    <div data-testid={testId} className="flex items-center gap-2 text-sm text-ink-muted">
      <span className="flex gap-1" aria-hidden>
        {days.map((d, i) => (
          <span key={i} className={`inline-block h-2.5 w-2.5 rounded-full ${d ? 'bg-sage-strong' : 'bg-surface-2'} ${i === days.length - 1 ? 'ring-1 ring-sage-strong ring-offset-1 ring-offset-surface' : ''}`} />
        ))}
      </span>
      <span>{n} of {days.length} days</span>
    </div>
  )
}

/** A thin bar for the session: what is done today against what today holds. */
export function SessionBar({ done, total }: { done: number; total: number }) {
  const v = total ? Math.min(1, done / total) : 0
  return (
    <div data-testid="study-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-sage-strong transition-[width]" style={{ width: `${100 * v}%` }} />
    </div>
  )
}
