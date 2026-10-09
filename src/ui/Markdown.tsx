import { Fragment, type ReactNode } from 'react'

/** Tiny renderer for the card markdown: paragraphs, "- " bullets, "1. " lists, **bold**. */
export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((b, i) => (
        <Block key={i} text={b} />
      ))}
    </div>
  )
}

type Kind = 'ul' | 'ol' | 'p'
const kindOf = (l: string): Kind => (/^\s*[-•]\s+/.test(l) ? 'ul' : /^\s*\d+[.)]\s+/.test(l) ? 'ol' : 'p')
const strip = (l: string) => l.replace(/^\s*[-•]\s+/, '').replace(/^\s*\d+[.)]\s+/, '')

function Block({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim())
  const groups: { kind: Kind; lines: string[] }[] = []
  for (const l of lines) {
    const kind = kindOf(l)
    const last = groups[groups.length - 1]
    if (last && last.kind === kind) last.lines.push(l)
    else groups.push({ kind, lines: [l] })
  }
  return (
    <>
      {groups.map((g, i) => {
        if (g.kind === 'ul')
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {g.lines.map((l, j) => (
                <li key={j}>{inline(strip(l))}</li>
              ))}
            </ul>
          )
        if (g.kind === 'ol')
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {g.lines.map((l, j) => (
                <li key={j}>{inline(strip(l))}</li>
              ))}
            </ol>
          )
        return (
          <p key={i}>
            {g.lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </>
  )
}

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}
