// A hand-written page in Pealim's markup shape, filled with general Hebrew (לכתוב, pa'al) — no Pealim text in the repo.
import { describe, expect, it } from 'vitest'
import { TENSE_CELLS } from '../../src/content/schema'
import { parsePealim, pealimEntry } from './pealim'

const cell = (id: string, pointed: string, chaser?: string, aux?: string) =>
  `<td class="conj-td"><div class="popover-host" id="${id}"><div><div><span class="audio-play" data-audio="https://audio.example/${id}.mp3">&#128266;</span> <span class="menukad">${pointed}</span>${chaser ? `<span class="chaser"> ~ ${chaser}</span>` : ''}</div><div class="transcription">x</div></div><div class="meaning">m</div>` +
  (aux ? `<div class="aux-forms hidden">In modern language, the masculine form is generally used:<div><span><span><span class="audio-play" data-audio="https://audio.example/aux-${id}.mp3">&#128266;</span> <span class="menukad">${aux}</span></span></span></div></div>` : '') +
  `</div></td>`

const ACTIVE: [string, string, string?, string?][] = [
  ['AP-ms', 'כּוֹתֵב'], ['AP-fs', 'כּוֹתֶבֶת'], ['AP-mp', 'כּוֹתְבִים'], ['AP-fp', 'כּוֹתְבוֹת'],
  ['PERF-1s', 'כָּתַבְתִּי'], ['PERF-1p', 'כָּתַבְנוּ'], ['PERF-2ms', 'כָּתַבְתָּ'], ['PERF-2fs', 'כָּתַבְתְּ'], ['PERF-2mp', 'כְּתַבְתֶּם'], ['PERF-2fp', 'כְּתַבְתֶּן'], ['PERF-3ms', 'כָּתַב'], ['PERF-3fs', 'כָּתְבָה'], ['PERF-3p', 'כָּתְבוּ'],
  ['IMPF-1s', 'אֶכְתֹּב', 'אכתוב'], ['IMPF-1p', 'נִכְתֹּב', 'נכתוב'], ['IMPF-2ms', 'תִּכְתֹּב', 'תכתוב'], ['IMPF-2fs', 'תִּכְתְּבִי'], ['IMPF-2mp', 'תִּכְתְּבוּ'], ['IMPF-2fp', 'תִּכְתֹּבְנָה', 'תכתובנה', 'תִּכְתְּבוּ'],
  ['IMPF-3ms', 'יִכְתֹּב', 'יכתוב'], ['IMPF-3fs', 'תִּכְתֹּב', 'תכתוב'], ['IMPF-3mp', 'יִכְתְּבוּ'], ['IMPF-3fp', 'תִּכְתֹּבְנָה', 'תכתובנה', 'יִכְתְּבוּ'],
  ['IMP-2ms', 'כְּתֹב!&rlm;', 'כתוב!&rlm;'], ['IMP-2fs', 'כִּתְבִי!&rlm;'], ['IMP-2mp', 'כִּתְבוּ!&rlm;'], ['IMP-2fp', 'כְּתֹבְנָה!&rlm;', 'כתובנה!&rlm;', 'כִּתְבוּ!&rlm;'],
  ['INF-L', 'לִכְתֹּב', 'לכתוב'],
]

function page(opts: { drop?: string; noAudio?: string; special?: boolean; binyan?: string } = {}): string {
  const cells = ACTIVE.filter(([id]) => id !== opts.drop).map(([id, p, c, a]) => {
    const html = cell(id, p, c, a)
    return id === opts.noAudio ? html.replace(/data-audio="[^"]*"/, '') : html
  })
  return (
    `<html><head><title>לכתוב – to write – Hebrew conjugation tables</title>` +
    `<meta content="Verb – ${opts.binyan ?? 'PA&apos;AL'} | Root: כ - ת - ב | Infinitive: &amp;#128266; לִכְתֹּב" name="description"></head><body>` +
    `<p>${opts.special ? 'This root has special conjugation properties.' : 'This root does not have any special conjugation properties.'}</p>` +
    // a passive table first: a careless match on «PERF-1s» would read it
    `<table>${cell('passive-PERF-1s', 'נִכְתַּבְתִּי')}${cell('passive-AP-ms', 'נִכְתָּב')}</table>` +
    `<table class="conjugation-table">${cells.join('')}</table></body></html>`
  )
}

describe('parsePealim', () => {
  const v = parsePealim(page())

  it('reads the binyan, root, group, meaning and infinitive', () => {
    expect(v).toMatchObject({ binyan: 'paal', root: 'כ.ת.ב', group: 'shlemim', meaning: 'to write', infinitive: { pointed: 'לִכְתֹּב', plain: 'לכתוב' } })
  })

  it('fills every cell of the trainer\'s grid, plain only where Pealim prints a different spelling', () => {
    for (const [tense, cells] of Object.entries(TENSE_CELLS)) expect(Object.keys(v.forms[tense as keyof typeof TENSE_CELLS]).sort()).toEqual([...cells].sort())
    expect(v.forms.future.ani).toEqual({ pointed: 'אֶכְתֹּב', plain: 'אכתוב' })
    expect(v.forms.past.ani).toEqual({ pointed: 'כָּתַבְתִּי' })
    expect(v.forms.present.ms).toEqual({ pointed: 'כּוֹתֵב' })
  })

  it('skips the passive table', () => {
    expect(v.forms.past.ani.pointed).toBe('כָּתַבְתִּי')
    expect(Object.values(v.clips).some((u) => u.includes('passive'))).toBe(false)
  })

  it('keeps the ־נָה forms apart and ignores the aux forms inside a cell', () => {
    expect(v.naForms).toEqual({ future: { pointed: 'תִּכְתֹּבְנָה', plain: 'תכתובנה' }, imperative: { pointed: 'כְּתֹבְנָה', plain: 'כתובנה' } })
    expect(v.forms.future.atem.pointed).toBe('תִּכְתְּבוּ')
    expect(v.clips['na.future']).toBe('https://audio.example/IMPF-2fp.mp3')
    expect(Object.values(v.clips).some((u) => u.includes('aux-'))).toBe(false)
  })

  it('drops the «!» and the direction mark from the imperative', () => {
    expect(v.forms.imperative.ata).toEqual({ pointed: 'כְּתֹב', plain: 'כתוב' })
    expect(v.forms.imperative.at).toEqual({ pointed: 'כִּתְבִי' })
  })

  it('has one clip per cell, the infinitive and the two ־נָה forms', () => {
    expect(Object.keys(v.clips)).toHaveLength(24 + 1 + 2)
    expect(v.clips['past.ani']).toBe('https://audio.example/PERF-1s.mp3')
    expect(v.clips.infinitive).toBe('https://audio.example/INF-L.mp3')
  })

  it('refuses a page it cannot read completely', () => {
    expect(() => parsePealim(page({ drop: 'IMPF-3ms' }))).toThrow(/IMPF-3ms not found/)
    expect(() => parsePealim(page({ noAudio: 'PERF-2fs' }))).toThrow(/PERF-2fs has no recording/)
    expect(() => parsePealim(page({ special: true }))).toThrow(/special conjugation/)
    expect(() => parsePealim(page({ binyan: 'NOUN' }))).toThrow(/unknown binyan/)
  })
})

describe('pealimEntry', () => {
  it('reads the entry number from the URL', () => {
    expect(pealimEntry('https://www.pealim.com/dict/2-ledaber/')).toBe(2)
    expect(pealimEntry('https://www.pealim.com/ru/dict/1993-lehargish/')).toBe(1993)
    expect(() => pealimEntry('https://example.com/x')).toThrow()
  })
})
