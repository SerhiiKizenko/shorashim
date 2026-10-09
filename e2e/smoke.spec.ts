import { expect, test } from '@playwright/test'
import { TrainerDriver } from './drivers/trainer.driver'

const PASSPHRASE = 'test-passphrase' // dummy bundle in public/data-test, see scripts/make-test-bundle.ts

test.describe('smoke (iPhone)', () => {
  test('wrong passphrase is rejected', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock('wrong-passphrase')
    await expect(t.get.lockError()).toContainText('Неверный пароль')
  })

  test('unlock → onboarding → today → reveal → grade → topic requeue → stays unlocked after reload', async ({ page }) => {
    const t = new TrainerDriver(page)
    await t.given.openedWithTestBundle()
    await t.when.unlock(PASSPHRASE, true)
    await expect(t.get.onboardingStart()).toBeVisible()
    await t.when.finishOnboarding()
    await expect(t.get.homeDays()).toContainText('Экзамен через')
    // The call-to-action card must keep its accent background (a bg-* collision once made it white on white).
    await expect(t.get.homeToday().locator('> div')).toHaveCSS('background-color', 'rgb(110, 154, 128)')

    // «Сегодня»: 7 dummy cards, 14 days → quota of 1 new card, so one grade finishes the session.
    await t.when.startToday()
    await expect(t.get.prompt()).toContainText('Тестовый')
    await t.when.revealAnswer()
    await expect(t.get.answer()).toContainText('Тестовый ответ')
    await t.when.gradeGood()
    await expect(t.get.finished()).toBeVisible()
    // «Ещё N новых» continues with unseen cards beyond the quota.
    await page.getByTestId('study-more-new').click()
    await expect(t.get.prompt()).toContainText('Тестовый')
    await expect(t.get.remaining()).toContainText('осталось 6')

    // «Блок / тема»: a failed card is requeued, so the session continues with another prompt.
    await t.when.openTopic(1)
    await expect(t.get.prompt()).toContainText('Тестовый вопрос')
    const first = await t.get.prompt().textContent()
    await t.when.revealAnswer()
    await t.when.gradeAgain()
    await expect(t.get.prompt()).not.toHaveText(first ?? '')
    await expect(t.get.remaining()).toContainText('осталось')

    // The cached key must survive a reload: no lock screen, straight back into the study screen.
    await t.given.reloaded()
    await expect(t.get.prompt()).toContainText('Тестовый вопрос')
  })
})
