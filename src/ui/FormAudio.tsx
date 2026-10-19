// One form's recording (the model verbs' clips from Pealim): a speaker button. The first tap fetches and decrypts the
// clip (trackObjectUrl keeps its Blob URL), then one shared hidden <audio> plays it, so a new tap stops the last one.
// The clips are precached with the bundle, so they play offline too.
import { Volume2 } from 'lucide-react'
import { useState } from 'react'
import { trackObjectUrl } from '../content/audio'
import type { Verb } from '../content/schema'
import { useContent } from '../store/content'

function sharedAudio(): HTMLAudioElement {
  let el = document.querySelector<HTMLAudioElement>('audio[data-testid="form-audio"]')
  if (!el) {
    el = document.createElement('audio')
    el.dataset.testid = 'form-audio'
    el.hidden = true
    document.body.appendChild(el)
  }
  return el
}

export function FormAudio({ verb, clip, className = '' }: { verb: Verb; clip: string; className?: string }) {
  const rawKeyHex = useContent((s) => s.rawKeyHex)
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  const file = verb.audio?.clips[clip]
  if (!verb.audio || !file) return null
  const type = verb.audio.type

  async function play() {
    if (!rawKeyHex || !file) return setState('error')
    setState('busy')
    try {
      const el = sharedAudio()
      el.src = await trackObjectUrl(file, type, rawKeyHex)
      setState('idle')
      // a refused play (a browser that blocks it) leaves the clip loaded; the next tap tries again
      await el.play().catch(() => undefined)
    } catch {
      setState('error')
    }
  }

  return (
    <button
      type="button"
      data-testid={`form-audio-${clip}`}
      aria-label={state === 'error' ? 'Recording not available offline yet' : 'Play the recording'}
      title={state === 'error' ? 'Could not load the recording' : undefined}
      disabled={state === 'busy'}
      onClick={() => void play()}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-surface-2 ${state === 'error' ? 'text-bad' : 'text-sage-strong'} ${className}`}
    >
      <Volume2 size={20} />
    </button>
  )
}
