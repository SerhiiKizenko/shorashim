import { ChevronLeft } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BLOCK_TITLES, type Block } from '../content/schema'

export function Screen({ title, back, right, children, footer }: { title?: string; back?: string; right?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {(title || back) && (
        <header className="safe-top safe-x sticky top-0 z-10 flex items-center gap-2 bg-bg/90 pb-2 backdrop-blur">
          {back ? (
            <Link to={back} aria-label="Назад" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-muted active:bg-surface-2">
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
  return (
    <button
      type="button"
      className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-base font-semibold transition disabled:opacity-40 ${variants[variant]} ${className}`}
      {...rest}
    />
  )
}

const blockColor: Record<Block, string> = { 1: 'bg-lavender', 2: 'bg-sand', 3: 'bg-rose', 4: 'bg-mist' }

export function BlockBadge({ block, label }: { block: Block; label?: string }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-ink ${blockColor[block]}`}>
      <span className="shrink-0">Блок {block} · {BLOCK_TITLES[block]}</span>
      {label ? <span className="truncate opacity-80">· {label}</span> : null}
    </span>
  )
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

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  // A caller that sets its own bg-* must win; two bg utilities on one element resolve by stylesheet order, not by props.
  const bg = /\bbg-/.test(className) ? '' : 'bg-surface'
  return (
    <div className={`rounded-3xl ${bg} p-5 shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  )
}

export const plural = (n: number, one: string, few: string, many: string): string => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
