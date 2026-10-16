// General Hebrew conjugation facts (any grammar book), not transcriptions of the workbook.
import { describe, expect, it } from 'vitest'
import { canGenerate, finalize, generatePlain, rootLetters } from './paradigm'

describe('root letters and final forms', () => {
  it('reads a dotted root and normalises final letters', () => {
    expect(rootLetters('ד.ב.ר')).toEqual(['ד', 'ב', 'ר'])
    expect(rootLetters('ש.ל.ם')).toEqual(['ש', 'ל', 'מ'])
    expect(finalize('שילמ')).toBe('שילם')
    expect(finalize('שילמתי')).toBe('שילמתי')
  })
})

describe("pi'el", () => {
  const dbr = generatePlain('piel', 'shlemim', 'ד.ב.ר')!
  it('past with the hirik-yod, present, future, imperative, infinitive, verbal noun', () => {
    expect(dbr.forms.past).toMatchObject({ ani: 'דיברתי', hu: 'דיבר', hi: 'דיברה', anachnu: 'דיברנו', atem: 'דיברתם', aten: 'דיברתן', hem: 'דיברו' })
    expect(dbr.forms.present).toEqual({ ms: 'מדבר', fs: 'מדברת', mp: 'מדברים', fp: 'מדברות' })
    expect(dbr.forms.future).toEqual({ ani: 'אדבר', ata: 'תדבר', at: 'תדברי', hu: 'ידבר', hi: 'תדבר', anachnu: 'נדבר', atem: 'תדברו', hem: 'ידברו' })
    expect(dbr.forms.imperative).toEqual({ ata: 'דבר', at: 'דברי', atem: 'דברו' })
    expect(dbr.infinitive).toBe('לדבר')
    expect(dbr.verbalNoun).toBe('דיבור')
    expect(dbr.variants['past.ani']).toEqual(['דברתי'])
  })
  it('final letters and assimilated suffixes', () => {
    const slm = generatePlain('piel', 'shlemim', 'ש.ל.מ')!
    expect(slm.forms.past?.hu).toBe('שילם')
    expect(slm.forms.future?.ani).toBe('אשלם')
    expect(slm.verbalNoun).toBe('תשלום') // the usual noun, not *שילום
    expect(generatePlain('piel', 'shlemim', 'נ.ג.נ')!.forms.past?.anachnu).toBe('ניגנו')
    expect(generatePlain('piel', 'gutturals', 'ש.ר.ת')!.forms.past?.ani).toBe('שירתי')
  })
  it('a consonantal yod as 2nd radical is doubled', () => {
    const til = generatePlain('piel', 'ayin-yod', 'ט.י.ל')!
    expect(til.forms.past?.hu).toBe('טייל')
    expect(til.forms.present?.ms).toBe('מטייל')
    expect(til.forms.future?.at).toBe('תטיילי')
    expect(til.verbalNoun).toBe('טיול')
  })
})

describe("hif'il", () => {
  it('הפסיק, with a final letter (המשיך) and a guttural 3rd radical (הצליח)', () => {
    const psq = generatePlain('hifil', 'shlemim', 'פ.ס.ק')!
    expect(psq.forms.past).toMatchObject({ ani: 'הפסקתי', hu: 'הפסיק', hi: 'הפסיקה', hem: 'הפסיקו' })
    expect(psq.forms.present).toEqual({ ms: 'מפסיק', fs: 'מפסיקה', mp: 'מפסיקים', fp: 'מפסיקות' })
    expect(psq.forms.future?.at).toBe('תפסיקי')
    expect(psq.forms.imperative).toEqual({ ata: 'הפסק', at: 'הפסיקי', atem: 'הפסיקו' })
    expect(psq.infinitive).toBe('להפסיק')
    expect(psq.verbalNoun).toBe('הפסקה')
    const msk = generatePlain('hifil', 'shlemim', 'מ.ש.כ')!
    expect(msk.forms.past?.hu).toBe('המשיך')
    expect(msk.forms.past?.ani).toBe('המשכתי')
    expect(msk.verbalNoun).toBe('המשך')
    expect(generatePlain('hifil', 'shlemim', 'צ.ל.ח')!.forms.present?.fs).toBe('מצליחה')
  })
})

describe("hitpa'el", () => {
  it('metathesis with a sibilant first radical', () => {
    expect(generatePlain('hitpael', 'shlemim', 'ס.כ.ל')!.forms.past?.hu).toBe('הסתכל')
    expect(generatePlain('hitpael', 'shlemim', 'ש.מ.ש')!.forms.present?.ms).toBe('משתמש')
    expect(generatePlain('hitpael', 'shlemim', 'צ.ל.מ')!.forms.past?.ani).toBe('הצטלמתי')
    expect(generatePlain('hitpael', 'shlemim', 'ז.ק.נ')!.forms.past).toMatchObject({ hu: 'הזדקן', anachnu: 'הזדקנו' })
    expect(generatePlain('hitpael', 'shlemim', 'ל.ב.ש')!.forms.future?.ani).toBe('אתלבש')
  })
  it('infinitive, imperative and verbal noun', () => {
    const skl = generatePlain('hitpael', 'shlemim', 'ס.כ.ל')!
    expect(skl.infinitive).toBe('להסתכל')
    expect(skl.forms.imperative).toEqual({ ata: 'הסתכל', at: 'הסתכלי', atem: 'הסתכלו' })
    expect(skl.verbalNoun).toBe('הסתכלות')
    expect(generatePlain('hitpael', 'shlemim', 'ש.מ.ש')!.verbalNoun).toBe('שימוש')
    expect(generatePlain('hitpael', 'ayin-yod', 'צ.י.נ')!.forms.past?.hu).toBe('הצטיין')
  })
  it('declines what it cannot do safely', () => {
    expect(canGenerate('hitpael', 'shlemim', 'ד.ב.ר')).toBe(false) // הידבר: the ת assimilates
    expect(canGenerate('piel', 'lamed-he', 'נ.ס.ה')).toBe(false)
    expect(canGenerate('piel', 'quad', 'ט.ל.פ.נ')).toBe(false)
    expect(generatePlain('paal', 'shlemim', 'כ.ת.ב')).toBeNull()
  })
})
