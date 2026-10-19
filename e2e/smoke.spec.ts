import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { KTOV_FUTURE, KTOV_GRID, TrainerDriver } from './drivers/trainer.driver'

const PASSPHRASE = 'test-passphrase' // dummy bundle in public/data-test, see scripts/make-test-bundle.ts

/** Local calendar date, the same way the app computes «today» (src/engine/scheduler.ts toDateString). */
function localDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A stored schedule entry for given.progress: an item learned weeks ago, last seen 20 days ago. */
const seeded = (box: number, due: string, extra: Record<string, unknown> = {}) => ({ box, due, introduced: localDate(-30), lastReviewed: localDate(-20), lastGrade: 'good', reps: 3, lapses: 0, ...extra })

test.describe('smoke (phone)', () => {
  test('wrong passphrase is rejected', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock('wrong-passphrase')
    await expect(t.get.lockError()).toContainText('Wrong passphrase')
  })

  test('unlock → onboarding → Future focus → grid typed in Hebrew → today → audio → stays unlocked after reload', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await expect(t.get.onboardingStart()).toBeVisible()
    await t.when.finishOnboarding()

    // Decision 13: the tense focus defaults to Future only; the past exists in the dummy bundle but is off.
    await expect(t.get.focusChip('future')).toHaveAttribute('aria-pressed', 'true')
    await expect(t.get.focusChip('past')).toHaveAttribute('aria-pressed', 'false')
    // The call-to-action card must keep its accent background (a bg-* collision once made it white on white).
    await expect(t.get.homeToday().locator('> div')).toHaveCSS('background-color', 'rgb(110, 154, 128)')

    // Paradigm grid: type Hebrew into every cell, one of them wrong; the wrong cell shows the pointed form,
    // and fixing it finishes the grid.
    await t.when.openVerbs()
    await t.when.openGrid('v-ktb-paal', 'future')
    await expect(t.get.prompt()).toContainText('לִכְתּוֹב')
    const withMistake = [...KTOV_FUTURE]
    withMistake[2] = 'תכתבו' // אתם's form typed for את
    await t.when.fillGrid(withMistake)
    await t.when.checkGrid()
    await expect(t.get.gridResult()).toContainText('1 cell is wrong')
    await expect(t.get.gridFeedback(2)).toContainText('תִּכְתְּבִי')
    await t.when.fillGridCell(2, 'תכתבי')
    await t.when.checkGrid()
    await expect(t.get.gridResult()).toContainText('All right now')
    await t.when.continueAfterGrid()
    await expect(t.get.finished()).toBeVisible()

    // One first-try mistake → Hard: the grid stays in box 1 but rests until tomorrow (never the same day), and it
    // used one of today's ten new slots. «Today» therefore holds 9 new items, vocabulary first: a new word is a
    // 4-choice (Hebrew shown, pick the meaning).
    expect(await t.get.progressOf('grid:v-ktb-paal:future')).toMatchObject({ box: 1, lastGrade: 'hard', due: localDate(1) })
    await t.when.goHome()
    await expect(t.get.homeStatus()).toHaveText('0 due · 9 new')
    await t.when.startToday()
    await expect(t.get.remaining()).toContainText('9 left')
    await expect(t.get.prompt()).toContainText('סֵפֶר')
    await t.when.chooseOption('книга')
    await expect(t.get.answer()).toContainText('книга')
    await t.when.gradeGood()
    await expect(t.get.remaining()).toContainText('8 left')

    // Listen: the track decrypts to a Blob URL on play.
    await t.when.goHome()
    await t.when.openListen()
    await t.when.playTrack(1)
    await expect(t.get.audio()).toHaveAttribute('src', /^blob:/)

    // The cached key must survive a reload: no lock screen, straight back in.
    await t.when.goHome()
    await t.given.reloaded()
    await expect(t.get.homeToday()).toBeVisible()
  })

  test('a word graded Again returns after 4–6 cards, passes twice, and still waits in box 1; Today adds no new items twice a day', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await t.when.finishOnboarding()
    await expect(t.get.homeStatus()).toHaveText('Start with «Today»')
    await t.when.startToday()
    await expect(t.get.remaining()).toContainText('10 left')

    // Card 1 is ספר, new, so a 4-choice. A wrong pick leaves only «Again», and the lapse is recorded at once: box 1,
    // due today.
    await expect(t.get.prompt()).toContainText('סֵפֶר')
    await t.when.chooseWrongOption()
    await expect(t.get.gradeButton('good')).toBeDisabled()
    await t.when.gradeAgain()
    expect(await t.get.progressOf('vocab:u01-v001')).toMatchObject({ box: 1, lapses: 1, reps: 1, due: localDate() })

    // It comes back after 4–6 other cards, asked the way it was first asked in this session (still a choice).
    let between = 0
    while (!((await t.get.prompt().textContent())?.includes('סֵפֶר'))) {
      await t.when.passCurrentCard()
      between++
    }
    expect(between).toBeGreaterThanOrEqual(4)
    expect(between).toBeLessThanOrEqual(6)

    // First re-pass: rehearsal only — the schedule entry does not move (the old code promoted it to box 2, then 3).
    await t.when.passCurrentCard()
    expect(await t.get.progressOf('vocab:u01-v001')).toMatchObject({ box: 1, lapses: 1, reps: 1, due: localDate() })

    // Second re-pass and the rest of the queue; the session ends with the word still due today.
    while (!(await t.get.finished().isVisible())) await t.when.passCurrentCard()
    await expect(t.get.finished()).toContainText('Items completed: 10')
    expect(await t.get.progressOf('vocab:u01-v001')).toMatchObject({ box: 1, lapses: 1, due: localDate() })

    // Ten new items were introduced today, so reopening «Today» brings only the due word — no second batch.
    await t.when.goHome()
    await expect(t.get.homeStatus()).toHaveText('1 due · 0 new')
    await t.when.startToday()
    await expect(t.get.remaining()).toContainText('1 left')
    await expect(t.get.prompt()).toContainText('סֵפֶר') // still box 1 → still a choice
    await t.when.passCurrentCard()
    await expect(t.get.finished()).toBeVisible()
    // Now it is a real review: first answer of this session → one box up, due tomorrow.
    expect(await t.get.progressOf('vocab:u01-v001')).toMatchObject({ box: 2, lapses: 1, due: localDate(1) })
    await t.when.goHome()
    await expect(t.get.homeStatus()).toHaveText('0 due · 0 new')
  })

  test('backup downloads a JSON file; restore shows what the file holds, asks, and brings the progress back', async ({ page }) => {
    const t = new TrainerDriver(page)
    // No Web Share in the test browser → the download fallback runs (the share path is checked by hand on the phone).
    await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }))
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await t.when.finishOnboarding()
    await t.when.startToday()
    await t.when.passCurrentCard() // ספר → box 2
    await t.when.goHome()
    await expect(t.get.homeStatus()).toHaveText('0 due · 9 new')

    await t.when.openSettings()
    const [download] = await Promise.all([page.waitForEvent('download'), t.when.backup()])
    expect(download.suggestedFilename()).toMatch(/^shorashim-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const path = (await download.path())!
    const file = JSON.parse(readFileSync(path, 'utf8')) as { app: string; progress: Record<string, unknown> }
    expect(file.app).toBe('shorashim')
    expect(Object.keys(file.progress)).toEqual(['vocab:u01-v001'])
    await expect(t.get.settingsMsg()).toContainText('saved')

    // Reset wipes the device; the backup file brings it back — after a confirmation that names the counts.
    await t.when.resetProgress()
    await t.when.goHome()
    await expect(t.get.homeStatus()).toHaveText('Start with «Today»')
    await t.when.openSettings()
    await t.when.restoreFromFile(path)
    await expect(t.get.restoreConfirm()).toContainText('1 items, 1 reviews. This device has 0 items.')
    await t.when.confirmRestore()
    await expect(t.get.settingsMsg()).toContainText('Restored 1 items')
    // The same file can be picked again straight away (the picker is cleared after every read).
    await t.when.restoreFromFile(path)
    await expect(t.get.restoreConfirm()).toContainText('This device has 1 items.')
    await t.when.cancelRestore()
    await expect(t.get.restoreConfirm()).toBeHidden()
    await t.when.goHome()
    await expect(t.get.homeStatus()).toHaveText('0 due · 9 new')
  })

  test('opens offline once the service worker has cached the shell, the manifest and the bundle', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await t.when.finishOnboarding()
    await expect(t.get.homeToday()).toBeVisible()
    await t.given.serviceWorkerReady()
    await t.given.offline()
    try {
      await t.given.reloaded()
      await expect(t.get.homeToday()).toBeVisible()
    } finally {
      await t.given.online()
    }
  })

  // ------------------------------------------------------------ scheduler hygiene (fuzz, forecast, catch-up, leeches)
  test('after a break: catch-up takes the oldest first and pauses new items; a review lands in its fuzz window; the forecast and «Ask the teacher» show', async ({ page }) => {
    const t = new TrainerDriver(page)
    const progress: Record<string, unknown> = {}
    for (let i = 1; i <= 12; i++) progress[`vocab:u01-v${String(i).padStart(3, '0')}`] = seeded(3, localDate(i <= 6 ? -6 : -2))
    progress['vocab:u01-v012'] = seeded(3, localDate(-2), { lapses: 9 })
    progress['grid:v-ktb-paal:future'] = seeded(3, localDate(2))
    progress['ex:u01-ex1.1'] = seeded(3, localDate(3))
    await t.given.progress({ progress, settings: { onboarded: true, reviewsPerDay: 5 } })
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)

    // Twelve words overdue, a budget of five: catch-up. The bars hold today (overdue folded in), then +2 and +3.
    await expect(t.get.homeStatus()).toHaveText('5 of 12 due · new paused')
    expect((await t.get.forecast()).slice(0, 4)).toEqual([12, 0, 1, 1])
    await t.when.startToday()
    await expect(t.get.remaining()).toContainText('5 left')
    // The oldest (six days overdue) come first; ספר is box 3, so it is typed (meaning → Hebrew).
    await expect(t.get.prompt()).toContainText('книга')
    await t.when.passCurrentCard()

    // Good from box 3 → box 4 (7 days), spread into Anki's window of 5–9 days.
    const p = (await t.get.progressOf('vocab:u01-v001')) as { box: number; due: string }
    expect(p.box).toBe(4)
    expect(p.due >= localDate(5) && p.due <= localDate(9)).toBe(true)

    // A word failed nine times is listed for the teacher.
    await t.when.goHome()
    await t.when.openWeak()
    await expect(t.get.leeches()).toContainText('9× failed')
    await expect(t.get.leeches()).toContainText('большой')
  })

  // ------------------------------------------------------------ the vocabulary card (direction, hints, mistake kinds)
  test('a known word is typed: hints give the root, then half the word; a wrong answer names its kind of mistake and is logged; the re-pass stays typed and a hinted answer allows only Hard', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.progress({ progress: { 'vocab:u01-v002': seeded(2, localDate()) }, settings: { onboarded: true, newPerDay: 0, mixedCells: 0 } })
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await t.when.startToday()
    await expect(t.get.remaining()).toContainText('1 left')
    await expect(t.get.prompt()).toHaveText('писать')

    await t.when.hint()
    await expect(t.get.hintText()).toContainText('כ.ת.ב')
    await t.when.hint()
    await expect(t.get.hintText()).toContainText('לכת')

    // לכתב for לכתוב: the holam vav is missing — a vowel-letter slip, still wrong.
    await t.when.typeAndCheck('לכתב')
    await expect(t.get.answerClass()).toHaveAttribute('data-class', 'vowel-letter')
    await expect(t.get.gradeButton('hard')).toBeDisabled()
    await t.when.gradeAgain()
    expect(await t.get.progressOf('vocab:u01-v002')).toMatchObject({ box: 1, lapses: 1 })
    expect((await t.get.reviews()).at(-1)).toEqual(['vocab:u01-v002', localDate(), 'again', 'vowel-letter'])

    // The re-pass keeps the typed direction (the session started with the word in box 2). One hint → only Hard.
    await expect(t.get.prompt()).toHaveText('писать')
    await t.when.hint()
    await t.when.answerTyped()
    await expect(t.get.gradeButton('good')).toBeDisabled()
    await t.when.gradeHard()
    while (!(await t.get.finished().isVisible())) await t.when.passCurrentCard()
    // Re-passes are rehearsal: the schedule still holds the lapse.
    expect(await t.get.progressOf('vocab:u01-v002')).toMatchObject({ box: 1, lapses: 1 })

    await t.when.goHome()
    await t.when.openWeak()
    await expect(t.get.mistake('vowel-letter')).toContainText('1')
  })

  // ------------------------------------------------------------ verbs (build from root, mixed cells)
  test('mixed cells follow «Today» for a rested grid and leave its schedule alone; «From root» shows only root, binyan and tense', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.progress({ progress: { 'grid:v-ktb-paal:future': seeded(3, localDate(4), { lastReviewed: localDate(-3) }) }, settings: { onboarded: true, newPerDay: 0, mixedCells: 3 } })
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await expect(t.get.homeToday()).toContainText('3 cells')
    await t.when.startToday()
    await expect(t.get.remaining()).toContainText('3 cells left')
    while (!(await t.get.finished().isVisible())) await t.when.passCurrentCard()
    await expect(t.get.finished()).toContainText('Mixed cells: 3 of 3 right')
    expect(await t.get.progressOf('grid:v-ktb-paal:future')).toMatchObject({ box: 3, due: localDate(4) })

    await t.when.goHome()
    await t.when.openVerbs()
    await t.when.openBuild()
    await expect(t.get.prompt()).toHaveText('כ.ת.ב')
    await t.when.answerCell()
  })

  // ------------------------------------------------------------ habit (anchor, week dots, session bar)
  test('the anchor from onboarding sits above «Today»; the week dots and today’s count fill as you answer; the session bar starts from what today already holds', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await t.when.setAnchor('morning coffee')
    await t.when.finishOnboarding()
    await expect(t.get.anchor()).toHaveText('After morning coffee → Today')
    await expect(t.get.week()).toContainText('0 of 7 days')

    await t.when.startToday()
    await expect(t.get.sessionBar()).toHaveAttribute('aria-valuenow', '0')
    await t.when.passCurrentCard()
    await expect(t.get.sessionBar()).toHaveAttribute('aria-valuenow', '1')

    await t.when.goHome()
    await expect(t.get.week()).toContainText('1 of 7 days')
    await expect(t.get.answered()).toContainText('1 answered today')
    // A second session today starts its bar at the one answer already given: 1 of 1 + 9.
    await t.when.startToday()
    await expect(t.get.sessionBar()).toHaveAttribute('aria-valuenow', '1')
    await expect(t.get.sessionBar()).toHaveAttribute('aria-valuemax', '10')
  })

  // ------------------------------------------------------------ the teacher's workbook (second book)
  test('the workbook has its own section; a topic opens its «sort into the table» exercise in full and grades it; «Study this topic» takes its words, grids and exercises', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await t.when.finishOnboarding()
    await t.when.openUnits()
    await expect(t.get.workbookSection()).toContainText('Workbook')
    await t.when.openWorkbookTopic('wb-s1')
    await t.when.openTopicExercise('wb-ex1.1')

    // Opened on its own, the exercise shows all three items, past and present too (the focus is Future only), and
    // no tense badge gives the answer away.
    await expect(t.get.prompt()).toHaveText('כתבתי')
    await expect(page.getByText('Past', { exact: true })).toBeHidden()
    await t.when.placeForm('future', 'ani') // wrong tense
    await expect(t.get.answer()).toContainText('Not this cell')
    await expect(t.get.answer()).toContainText('Past')
    await t.when.next()
    await expect(t.get.prompt()).toHaveText('תכתוב')
    await t.when.placeForm('future', 'ata') // אתה and היא share the form: either is right
    await expect(t.get.answer()).toContainText('Correct')
    await t.when.next()
    await t.when.placeRight()
    await t.when.next()
    await expect(t.get.exerciseSummary()).toContainText('2 of 3 right')
    await t.when.continueExercise()
    expect(await t.get.progressOf('ex:wb-ex1.1')).toMatchObject({ box: 1, lastGrade: 'hard' })

    // The topic as one unit of study: its verb's word card and future grid (the exercise is already seen).
    await page.goBack()
    await t.when.studyTopic()
    await expect(t.get.remaining()).toContainText('3 left')
  })

  // ------------------------------------------------------------ model verbs (one per binyan, every tense)
  test('model verbs: a tense session runs whatever the focus; the recording plays only after Check and the grade is kept; the table shows ־נָה apart and plays offline', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await t.when.finishOnboarding() // the focus is Future only
    await t.when.openModelVerbs()
    await expect(t.get.modelVerb('v-ktb-paal')).toContainText('to write')
    await expect(t.get.modelTense('past')).toContainText('0 due · 1 new')

    // Past, although the focus is Future: one grid per model verb (the dummy has one)
    await t.when.startModelTense('past')
    await expect(t.get.remaining()).toContainText('1 left')
    await expect(t.get.gridDrill()).toHaveAttribute('data-tense', 'past')
    await expect(t.get.formAudioButton('past.ani')).toHaveCount(0) // the recording would give the answer away
    await t.when.fillGrid(KTOV_GRID.past!)
    await t.when.checkGrid()
    await t.when.playForm('past.ani')
    await expect(t.get.formAudio()).toHaveAttribute('src', /^blob:/)
    await t.when.continueAfterGrid()
    await expect(t.get.finished()).toBeVisible()
    expect(await t.get.progressOf('grid:v-ktb-paal:past')).toMatchObject({ box: 2, lastGrade: 'good' })

    // The table: every tense, ־נָה under future and imperative only, each form playable
    await t.when.goHome()
    await t.when.openModelVerbs()
    await expect(t.get.modelTense('past')).toContainText('0 due · 0 new')
    await t.when.openModelVerb('v-ktb-paal')
    await expect(t.get.naForm('future')).toContainText('תכתובנה')
    await expect(t.get.naForm('imperative')).toContainText('כתובנה')
    await expect(t.get.naForm('past')).toHaveCount(0)

    // The recordings are precached with the bundle: after an offline reload a clip still decrypts and plays
    await t.given.serviceWorkerReady()
    await t.given.offline()
    await t.given.reloaded()
    await t.when.playForm('infinitive')
    await expect(t.get.formAudio()).toHaveAttribute('src', /^blob:/)
    await t.given.online()
  })
})
