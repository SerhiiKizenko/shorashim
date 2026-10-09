// One track: a play button that decrypts on first use, then the native <audio> controls (they work in iOS
// Safari, including the lock screen). The text, when present, can be shown or hidden under the player.
import { Play } from 'lucide-react'
import { useState } from 'react'
import { fmtTime, trackObjectUrl } from '../content/audio'
import type { AudioTrack, Text } from '../content/schema'
import { useContent } from '../store/content'
import { Button, Card } from './components'
import { HebrewText } from './hebrew'

export function AudioPlayer({ track, text }: { track: AudioTrack; text?: Text }) {
  const manifest = useContent((s) => s.manifest)
  const rawKeyHex = useContent((s) => s.rawKeyHex)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showText, setShowText] = useState(false)
  const entry = manifest?.audio.find((a) => a.track === track.track)

  async function load() {
    if (!entry || !rawKeyHex) {
      setError(entry ? 'The key is not available — unlock again.' : 'This recording is not in the current build.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      setUrl(await trackObjectUrl(entry.file, entry.type, rawKeyHex))
    } catch (e) {
      setError(e instanceof Error && e.message === 'offline' ? 'Offline, and this track was not played on this device yet.' : 'Could not load the recording.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card data-testid={`listen-track-${track.track}`} className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-ink-muted">Track {String(track.track).padStart(2, '0')} · {track.pages.length ? `p. ${track.pages.join('–')}` : ''} · {fmtTime(track.seconds)}</span>
          <span className="text-xs text-ink-muted">{track.kind}{entry ? ` · ${(entry.bytes / 1024 / 1024).toFixed(1)} MB` : ''}</span>
        </div>
        {track.titleHe ? <HebrewText size="md" className="font-semibold">{track.titleHe}</HebrewText> : null}
      </div>
      {url ? (
        <audio data-testid="audio-el" src={url} controls autoPlay preload="auto" className="w-full" />
      ) : (
        <Button data-testid={`listen-play-${track.track}`} variant="secondary" disabled={busy || !entry} onClick={load}>
          <Play size={18} /> {busy ? 'Decrypting…' : 'Play'}
        </Button>
      )}
      {error ? <p className="rounded-2xl bg-bad/15 px-3 py-2 text-sm">{error}</p> : null}
      {text ? (
        <>
          <Button variant="ghost" className="min-h-10" onClick={() => setShowText(!showText)}>{showText ? 'Hide text' : 'Show text'}</Button>
          {showText ? (
            <div className="flex flex-col gap-2">
              {text.paragraphs.map((p, i) => (
                <HebrewText key={i} size="md" block className="leading-relaxed">{p}</HebrewText>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  )
}
