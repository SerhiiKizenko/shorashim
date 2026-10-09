import { describe, expect, it } from 'vitest'
import { pielFuture } from './piel-future'

const plain = (cells: Record<string, { plain: string }>) => Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, v.plain]))
const pointed = (cells: Record<string, { pointed: string }>) => Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, v.pointed.normalize('NFC')]))

describe('pielFuture (the p.54 pattern as data)', () => {
  it('reproduces the book table for לספר (p.54) and the teacher’s sheet for לדבר', () => {
    expect(pointed(pielFuture({ pointed: 'לְסַפֵּר', plain: 'לספר' }))).toEqual({
      ani: 'אֲסַפֵּר', ata: 'תְּסַפֵּר', at: 'תְּסַפְּרִי', anachnu: 'נְסַפֵּר', atem: 'תְּסַפְּרוּ', hu: 'יְסַפֵּר', hi: 'תְּסַפֵּר', hem: 'יְסַפְּרוּ',
    })
    expect(plain(pielFuture({ pointed: 'לְדַבֵּר', plain: 'לדבר' }))).toEqual({
      ani: 'אדבר', ata: 'תדבר', at: 'תדברי', anachnu: 'נדבר', atem: 'תדברו', hu: 'ידבר', hi: 'תדבר', hem: 'ידברו',
    })
  })
  it('turns a final letter medial before a suffix (לטלפן → תטלפני, לשלם → ישלמו)', () => {
    expect(plain(pielFuture({ pointed: 'לְטַלְפֵּן', plain: 'לטלפן' }))).toMatchObject({ ani: 'אטלפן', at: 'תטלפני', hem: 'יטלפנו' })
    expect(pointed(pielFuture({ pointed: 'לְטַלְפֵּן', plain: 'לטלפן' })).at).toBe('תְּטַלְפְּנִי')
    expect(plain(pielFuture({ pointed: 'לְשַׁלֵּם', plain: 'לשלם' })).hem).toBe('ישלמו')
  })
  it('keeps the ktiv male double yod of לטייל and a kamatz before ר (לשרת)', () => {
    expect(plain(pielFuture({ pointed: 'לְטַיֵּל', plain: 'לטייל' })).at).toBe('תטיילי')
    expect(pointed(pielFuture({ pointed: 'לְשָׁרֵת', plain: 'לשרת' })).ani).toBe('אֲשָׁרֵת')
  })
  it('works on an unpointed infinitive (cells come out unpointed too)', () => {
    expect(pielFuture({ pointed: 'לבשל', plain: 'לבשל' }).at).toEqual({ pointed: 'תבשלי', plain: 'תבשלי' })
  })
})
