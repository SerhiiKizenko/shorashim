// given / when / get driver for the trainer (Riverside E2E convention).
import { expect, type Page } from '@playwright/test'

export const TEST_IDS = {
  lockPassphrase: 'lock-passphrase',
  lockRemember: 'lock-remember',
  lockSubmit: 'lock-submit',
  lockError: 'lock-error',
  onboardingStart: 'onboarding-start',
  homeDays: 'home-days',
  homeToday: 'home-today',
  studyPrompt: 'study-prompt',
  studyReveal: 'study-reveal',
  studyAnswer: 'study-answer',
  studyRemaining: 'study-remaining',
  studyFinished: 'study-finished',
  gradeGood: 'grade-good',
  gradeAgain: 'grade-again',
} as const

export class TrainerDriver {
  constructor(private readonly page: Page) {}
  private byId = (id: string) => this.page.getByTestId(id)

  given = {
    openedWithTestBundle: async () => {
      await this.page.goto('?data=data-test#/')
      await expect(this.byId(TEST_IDS.lockPassphrase)).toBeVisible()
    },
    reloaded: async () => {
      await this.page.reload()
    },
  }

  when = {
    unlock: async (passphrase: string, remember = true) => {
      await this.byId(TEST_IDS.lockPassphrase).fill(passphrase)
      await this.byId(TEST_IDS.lockRemember).setChecked(remember)
      await this.byId(TEST_IDS.lockSubmit).click()
    },
    finishOnboarding: async () => {
      await this.byId(TEST_IDS.onboardingStart).click()
    },
    startToday: async () => {
      await this.byId(TEST_IDS.homeToday).click()
    },
    openTopic: async (block: number) => {
      await this.page.goto(`?data=data-test#/study/topic?block=${block}`)
    },
    revealAnswer: async () => {
      await this.byId(TEST_IDS.studyReveal).click()
    },
    gradeGood: async () => {
      await this.byId(TEST_IDS.gradeGood).click()
    },
    gradeAgain: async () => {
      await this.byId(TEST_IDS.gradeAgain).click()
    },
  }

  get = {
    lockError: () => this.byId(TEST_IDS.lockError),
    homeDays: () => this.byId(TEST_IDS.homeDays),
    homeToday: () => this.byId(TEST_IDS.homeToday),
    prompt: () => this.byId(TEST_IDS.studyPrompt),
    answer: () => this.byId(TEST_IDS.studyAnswer),
    remaining: () => this.byId(TEST_IDS.studyRemaining),
    finished: () => this.byId(TEST_IDS.studyFinished),
    onboardingStart: () => this.byId(TEST_IDS.onboardingStart),
  }
}
