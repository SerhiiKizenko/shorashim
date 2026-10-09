import { expect, test } from '@playwright/test'
import { TrainerDriver } from './drivers/trainer.driver'

const PASSPHRASE = 'test-passphrase' // dummy bundle in public/data-test, see scripts/make-test-bundle.ts

// לכתוב, future, in the teacher's column order: אני אתה את אנחנו אתם אתן הוא היא הם-הן (general Hebrew, not book content)
const KTOV_FUTURE = ['אכתוב', 'תכתוב', 'תכתבי', 'נכתוב', 'תכתבו', 'תכתבו', 'יכתוב', 'תכתוב', 'יכתבו']

test.describe('smoke (iPhone)', () => {
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

    // «Today»: the grid had a mistake (graded Hard → box 1, due today), so it comes back first; a clean pass
    // sends it on, then the new items follow in book order, vocabulary first (word → meaning).
    await t.when.goHome()
    await t.when.startToday()
    await expect(t.get.prompt()).toContainText('לִכְתּוֹב')
    await t.when.fillGrid(KTOV_FUTURE)
    await t.when.checkGrid()
    await expect(t.get.gridResult()).toContainText('All cells right')
    await t.when.continueAfterGrid()
    await expect(t.get.prompt()).toContainText('סֵפֶר')
    await t.when.revealAnswer()
    await expect(t.get.answer()).toContainText('книга')
    await t.when.gradeGood()
    await expect(t.get.remaining()).toContainText('left')

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
})
