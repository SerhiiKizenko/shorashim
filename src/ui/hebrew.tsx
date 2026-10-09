// Hebrew rendering and input primitives. Every Hebrew string sits in an element with lang="he" dir="rtl" (a <bdi>,
// so mixed English/Hebrew lines keep their order) and gets the Hebrew font at ≥ 1.25× body size: vowel points
// are small. Inputs switch off every automatic correction so the phone keyboard types exactly what is pressed.
import { forwardRef, type HTMLAttributes, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'

type Size = 'sm' | 'md' | 'lg' | 'xl'
const sizes: Record<Size, string> = { sm: 'text-[1.1rem]', md: 'text-[1.35rem]', lg: 'text-[1.75rem]', xl: 'text-[2.4rem]' }

export function HebrewText({ children, size = 'md', className = '', block = false, ...rest }: { children: ReactNode; size?: Size; className?: string; block?: boolean } & HTMLAttributes<HTMLElement>) {
  return (
    <bdi lang="he" dir="rtl" className={`font-hebrew ${sizes[size]} ${block ? 'block text-right' : ''} ${className}`} {...rest}>
      {children}
    </bdi>
  )
}

export type AnswerState = 'idle' | 'ok' | 'wrong'
const stateClass: Record<AnswerState, string> = {
  idle: 'border-surface-2 focus:border-sage-strong',
  ok: 'border-ok bg-ok/15',
  wrong: 'border-bad bg-bad/15',
}

export interface AnswerInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onSubmit' | 'size'> {
  state?: AnswerState
  onSubmit?: () => void
  size?: Size
}

/** A Hebrew answer field: RTL, no autocorrect, Enter submits. Niqqud is never required. */
export const AnswerInput = forwardRef<HTMLInputElement, AnswerInputProps>(function AnswerInput({ state = 'idle', onSubmit, size = 'md', className = '', onKeyDown, ...rest }, ref) {
  function keyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e)
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }
  return (
    <input
      ref={ref}
      type="text"
      lang="he"
      dir="rtl"
      inputMode="text"
      enterKeyHint="go"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      onKeyDown={keyDown}
      className={`font-hebrew ${sizes[size]} min-h-12 w-full rounded-2xl border-2 bg-surface px-4 py-2 text-right outline-none transition ${stateClass[state]} ${className}`}
      {...rest}
    />
  )
})

/** The pointed form shown on reveal, bigger so the points can be read. */
export function Pointed({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <HebrewText size="lg" className={`font-semibold ${className}`}>
      {children}
    </HebrewText>
  )
}
