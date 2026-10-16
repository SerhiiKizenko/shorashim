import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { KTOV_FUTURE, TrainerDriver } from './drivers/trainer.driver'

const PASSPHRASE = 'test-passphrase' // dummy bundle in public/data-test, see scripts/make-test-bundle.ts

/** Local calendar date, the same way the app computes «today» (src/engine/scheduler.ts toDateString). */
function localDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
    // used one of today's ten new slots. «Today» therefore holds 9 new items, vocabulary first (word → meaning).
    expect(await t.get.progressOf('grid:v-ktb-paal:future')).toMatchObject({ box: 1, lastGrade: 'hard', due: localDate(1) })
    await t.when.goHome()
    await expect(t.get.homeStatus()).toHaveText('0 due · 9 new')
    await t.when.startToday()
    await expect(t.get.remaining()).toContainText('9 left')
    await expect(t.get.prompt()).toContainText('סֵפֶר')
    await t.when.revealAnswer()
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

    // Card 1 is ספר (word → meaning). Failing it records the lapse at once: box 1, due today.
    await expect(t.get.prompt()).toContainText('סֵפֶר')
    await t.when.revealAnswer()
    await t.when.gradeAgain()
    expect(await t.get.progressOf('vocab:u01-v001')).toMatchObject({ box: 1, lapses: 1, reps: 1, due: localDate() })

    // It comes back after 4–6 other cards, now in the typed direction (meaning → Hebrew).
    let between = 0
    while (!((await t.get.prompt().textContent())?.includes('книга'))) {
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
    await expect(t.get.prompt()).toContainText('книга')
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
})
