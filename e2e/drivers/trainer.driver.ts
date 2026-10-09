// given / when / get driver for the trainer (Riverside E2E convention). Runs against the dummy bundle in
// public/data-test (scripts/make-test-bundle.ts): public passphrase, nothing from the book.
import { expect, type Page } from '@playwright/test'

export const TEST_IDS = {
  lockPassphrase: 'lock-passphrase',
  lockRemember: 'lock-remember',
  lockSubmit: 'lock-submit',
  lockError: 'lock-error',
  onboardingStart: 'onboarding-start',
  homeToday: 'home-today',
  homeVerbs: 'home-verbs',
  homeListen: 'home-listen',
  tenseFocus: 'tense-focus',
  focusChip: (tense: string) => `focus-chip-${tense}`,
  verbGrid: (verbId: string, tense: string) => `verb-grid-${verbId}-${tense}`,
  gridCell: (i: number) => `grid-cell-${i}`,
  gridFeedback: (i: number) => `grid-feedback-${i}`,
  gridCheck: 'grid-check',
  gridResult: 'grid-result',
  gridContinue: 'grid-continue',
  studyPrompt: 'study-prompt',
  studyReveal: 'study-reveal',
  studyAnswer: 'study-answer',
  studyRemaining: 'study-remaining',
  studyFinished: 'study-finished',
  gradeGood: 'grade-good',
  gradeAgain: 'grade-again',
  listenPlay: (track: number) => `listen-play-${track}`,
  audioEl: 'audio-el',
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
    goHome: async () => {
      await this.page.goto('?data=data-test#/')
    },
    startToday: async () => {
      await this.byId(TEST_IDS.homeToday).click()
    },
    openVerbs: async () => {
      await this.byId(TEST_IDS.homeVerbs).click()
    },
    openGrid: async (verbId: string, tense: string) => {
      await this.byId(TEST_IDS.verbGrid(verbId, tense)).click()
    },
    /** Types Hebrew into the grid cells, in the teacher's column order. */
    fillGrid: async (answers: string[]) => {
      for (const [i, a] of answers.entries()) await this.byId(TEST_IDS.gridCell(i)).fill(a)
    },
    fillGridCell: async (i: number, answer: string) => {
      await this.byId(TEST_IDS.gridCell(i)).fill(answer)
    },
    checkGrid: async () => {
      await this.byId(TEST_IDS.gridCheck).click()
    },
    continueAfterGrid: async () => {
      await this.byId(TEST_IDS.gridContinue).click()
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
    openListen: async () => {
      await this.byId(TEST_IDS.homeListen).click()
    },
    playTrack: async (track: number) => {
      await this.byId(TEST_IDS.listenPlay(track)).click()
    },
  }

  get = {
    lockError: () => this.byId(TEST_IDS.lockError),
    onboardingStart: () => this.byId(TEST_IDS.onboardingStart),
    homeToday: () => this.byId(TEST_IDS.homeToday),
    focusChip: (tense: string) => this.byId(TEST_IDS.focusChip(tense)),
    gridCell: (i: number) => this.byId(TEST_IDS.gridCell(i)),
    gridFeedback: (i: number) => this.byId(TEST_IDS.gridFeedback(i)),
    gridResult: () => this.byId(TEST_IDS.gridResult),
    prompt: () => this.byId(TEST_IDS.studyPrompt),
    answer: () => this.byId(TEST_IDS.studyAnswer),
    remaining: () => this.byId(TEST_IDS.studyRemaining),
    finished: () => this.byId(TEST_IDS.studyFinished),
    audio: () => this.byId(TEST_IDS.audioEl),
  }
}
