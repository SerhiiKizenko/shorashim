import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { clusterStats, type SchedCard } from '../engine/scheduler'
import { useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { Button, Card, Screen } from './components'
import { StatBar } from './Topics'

export function Weak() {
  const cards = useContent((s) => s.cards)
  const progress = useProgress((s) => s.progress)
  const rows = useMemo(() => {
    const sched: SchedCard[] = cards.map((c) => ({ id: c.id, block: c.block, cluster: c.cluster, examNumber: c.examNumber }))
    const titles = new Map<string, string>()
    for (const c of cards) titles.set(`${c.block}:${c.cluster}`, c.clusterTitle)
    return clusterStats(sched, progress)
      .map((s) => ({ ...s, title: titles.get(`${s.block}:${s.cluster}`) ?? s.cluster, share: s.weak / Math.max(1, s.total - s.unseen) }))
      .filter((s) => s.unseen < s.total)
      .sort((a, b) => b.share - a.share || b.weak - a.weak)
  }, [cards, progress])
  const weakTotal = rows.reduce((n, r) => n + r.weak, 0)

  return (
    <Screen title="Слабые места" back="/" footer={weakTotal ? <Link to="/study/weak" className="block"><Button className="w-full">Повторить слабые ({weakTotal})</Button></Link> : undefined}>
      <div className="flex flex-col gap-2 pt-2">
        {rows.length === 0 ? <p className="py-8 text-center text-ink-muted">Пока нет пройденных карточек.</p> : null}
        {rows.map((r) => (
          <Link key={`${r.block}:${r.cluster}`} to={`/study/topic?block=${r.block}&cluster=${encodeURIComponent(r.cluster)}`}>
            <Card className="flex flex-col gap-2 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Блок {r.block} · {r.title}</span>
                <span className="shrink-0 text-sm text-bad">{r.weak} слаб.</span>
              </div>
              <StatBar s={r} />
            </Card>
          </Link>
        ))}
      </div>
    </Screen>
  )
}
