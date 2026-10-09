import { useContent } from '../store/content'
import { AudioPlayer } from './AudioPlayer'
import { Screen } from './components'

export function Listen() {
  const bundle = useContent((s) => s.bundle)
  const manifest = useContent((s) => s.manifest)
  const available = new Set(manifest?.audio.map((a) => a.track) ?? [])
  const tracks = bundle.audio.filter((t) => available.has(t.track))
  const units = [...new Set(tracks.map((t) => t.unit))]
  return (
    <Screen title="Listen" back="/">
      <div className="flex flex-col gap-4 pt-2">
        {tracks.length === 0 ? <p className="py-8 text-center text-ink-muted">No recordings in this build yet.</p> : null}
        {units.map((u) => (
          <section key={u ?? 'intro'} className="flex flex-col gap-2">
            <h2 className="px-1 font-bold">{u ? `Unit ${u}` : 'Introduction'}</h2>
            {tracks.filter((t) => t.unit === u).map((t) => (
              <AudioPlayer key={t.track} track={t} text={bundle.texts.find((x) => x.audioTrack === t.track)} />
            ))}
          </section>
        ))}
        <p className="text-center text-xs text-ink-muted">A track is downloaded on first play and then kept on the device.</p>
      </div>
    </Screen>
  )
}
