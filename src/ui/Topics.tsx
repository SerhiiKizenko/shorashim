import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BLOCK_TITLES, clusterRank, type Block } from '../content/schema'
import { clusterStats, type SchedCard } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Card, Screen } from './components'

export function StatBar({ s }: { s: { total: number; unseen: number; weak: number; learning: number; learned: number } }) {
  const w = (n: number) => `${(100 * n) / Math.max(1, s.total)}%`
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="bg-ok" style={{ width: w(s.learned) }} />
      <div className="bg-sage" style={{ width: w(s.learning) }} />
      <div className="bg-bad" style={{ width: w(s.weak) }} />
    </div>
  )
}

export function Topics() {
  const cards = useContent((s) => s.cards)
  const progress = useProgress((s) => s.progress)
  const rows = useMemo(() => {
    const sched: SchedCard[] = cards.map((c) => ({ id: c.id, block: c.block, cluster: c.cluster, examNumber: c.examNumber }))
    const titles = new Map<string, string>()
    for (const c of cards) titles.set(`${c.block}:${c.cluster}`, c.clusterTitle)
    return clusterStats(sched, progress)
      .map((s) => ({ ...s, title: titles.get(`${s.block}:${s.cluster}`) ?? s.cluster }))
      .sort((a, b) => a.block - b.block || clusterRank(a.cluster) - clusterRank(b.cluster) || a.cluster.localeCompare(b.cluster))
  }, [cards, progress])

  return (
    <Screen title="Блок / тема" back="/">
      <div className="flex flex-col gap-5 pt-2">
        {([1, 2, 3, 4] as Block[]).map((block) => (
          <section key={block} className="flex flex-col gap-2">
            <Link to={`/study/topic?block=${block}`} className="flex items-center justify-between px-1">
              <h2 className="font-bold">Блок {block} · {BLOCK_TITLES[block]}</h2>
              <span className="text-sm text-sage-strong">весь блок →</span>
            </Link>
            {rows
              .filter((r) => r.block === block)
              .map((r) => (
                <Link key={r.cluster} to={`/study/topic?block=${block}&cluster=${encodeURIComponent(r.cluster)}`}>
                  <Card className="flex flex-col gap-2 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{r.title}</span>
                      <span className="shrink-0 text-sm text-ink-muted">{r.total - r.unseen}/{r.total}</span>
                    </div>
                    <StatBar s={r} />
                  </Card>
                </Link>
              ))}
          </section>
        ))}
        <p className="text-center text-xs text-ink-muted">Полоска: усвоено · в работе · слабые</p>
      </div>
    </Screen>
  )
}
