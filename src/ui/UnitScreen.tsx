import { Link, useParams } from 'react-router-dom'
import { POS, POS_LABELS, UNIT_LETTERS } from '../content/schema'
import { useContent } from '../store/content'
import { AudioPlayer } from './AudioPlayer'
import { Badge, Button, Card, Pages, Screen } from './components'
import { HebrewText } from './hebrew'

export function UnitScreen() {
  const unit = Number(useParams().unit)
  const bundle = useContent((s) => s.bundle)
  const meta = bundle.units.find((u) => u.unit === unit)
  const vocab = bundle.vocab.filter((v) => v.unit === unit)
  const grammar = bundle.grammar.filter((g) => g.unit === unit).sort((a, b) => a.section - b.section)
  const exercises = bundle.exercises.filter((e) => e.unit === unit)
  const texts = bundle.texts.filter((t) => t.unit === unit)
  const proverbs = bundle.proverbs.filter((p) => p.unit === unit)
  const tracks = bundle.audio.filter((a) => a.unit === unit)
  if (!meta) return <Screen title="Unit" back="/units"><p className="py-8 text-center text-ink-muted">No such unit.</p></Screen>

  return (
    <Screen title={`Unit ${unit}`} back="/units">
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex items-center justify-between">
          <HebrewText size="lg" className="font-bold">יחידה {UNIT_LETTERS[unit]}</HebrewText>
          <span className="text-sm text-ink-muted">pp. {meta.pages[0]}–{meta.pages[1]}</span>
        </div>

        {grammar.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Grammar</h2>
            {grammar.map((g) => (
              <Link key={g.id} to={`/grammar/${g.id}`} data-testid={`grammar-${g.id}`}>
                <Card className="flex items-center justify-between gap-3 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold">{g.section}. {g.titleEn}</span>
                    <Pages pages={g.pages} />
                  </div>
                  <HebrewText size="sm">{g.titleHe}</HebrewText>
                </Card>
              </Link>
            ))}
          </section>
        ) : null}

        {vocab.length ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold">Vocabulary · {vocab.length}</h2>
              <Link to={`/study/topic?unit=${unit}&kind=vocab`} className="text-sm font-semibold text-sage-strong">drill →</Link>
            </div>
            {POS.filter((p) => vocab.some((v) => v.pos === p)).map((p) => (
              <Card key={p} className="flex flex-col gap-2 py-4">
                <Badge>{POS_LABELS[p]} · {vocab.filter((v) => v.pos === p).length}</Badge>
                <ul className="flex flex-col divide-y divide-surface-2">
                  {vocab.filter((v) => v.pos === p).map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm">{v.ru}{v.reviewStatus === 'draft' ? <span className="text-xs text-ink-muted"> · draft</span> : null}</span>
                      <HebrewText size="md">{v.he}</HebrewText>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
            <p className="px-1 text-xs text-ink-muted">Vocabulary page: p. {meta.vocabPage}.</p>
          </section>
        ) : null}

        {exercises.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Exercises</h2>
            {exercises.map((e) => (
              <Link key={e.id} to={`/study/exercise?id=${e.id}`} data-testid={`exercise-${e.id}`}>
                <Card className="flex items-center justify-between gap-3 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold">{e.number} · {e.instructionEn}</span>
                    <span className="text-xs text-ink-muted">p. {e.page} · {e.items.length} items{e.gradable ? '' : ' · self-graded'}</span>
                  </div>
                  <Button variant="secondary" className="min-h-10 px-3 text-sm">Open</Button>
                </Card>
              </Link>
            ))}
          </section>
        ) : null}

        {texts.length || tracks.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Texts and recordings</h2>
            {tracks.map((t) => (
              <AudioPlayer key={t.track} track={t} text={texts.find((x) => x.audioTrack === t.track)} />
            ))}
            {texts.filter((t) => t.audioTrack === undefined).map((t) => (
              <Card key={t.id} className="py-4"><HebrewText size="md" className="font-semibold">{t.titleHe}</HebrewText> <Pages pages={t.pages} /></Card>
            ))}
          </section>
        ) : null}

        {proverbs.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">Proverbs</h2>
            <Card className="flex flex-col gap-2 py-4">
              {proverbs.map((p) => (
                <div key={p.id} className="flex flex-col items-end">
                  <HebrewText size="md">{p.he}</HebrewText>
                  {p.ru ? <span className="text-sm text-ink-muted">{p.ru}</span> : null}
                </div>
              ))}
            </Card>
          </section>
        ) : null}
      </div>
    </Screen>
  )
}
