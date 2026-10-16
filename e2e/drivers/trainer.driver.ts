// given / when / get driver for the trainer (Riverside E2E convention). Runs against the dummy bundle in
// public/data-test (scripts/make-test-bundle.ts): public passphrase, nothing from the book.
import { expect, type Page } from '@playwright/test'

export const TEST_IDS = {
  lockPassphrase: 'lock-passphrase',
  lockRemember: 'lock-remember',
  lockSubmit: 'lock-submit',
  lockError: 'lock-error',
  onboardingStart: 'onboarding-start',
  homeStatus: 'home-status',
  homeToday: 'home-today',
  homeVerbs: 'home-verbs',
  homeListen: 'home-listen',
  homeSettings: 'home-settings',
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
  answerInput: 'answer-input',
  answerCheck: 'answer-check',
  exerciseNext: 'exercise-next',
  exerciseContinue: 'exercise-continue',
  gradeGood: 'grade-good',
  gradeAgain: 'grade-again',
  listenPlay: (track: number) => `listen-play-${track}`,
  audioEl: 'audio-el',
  settingsBackup: 'settings-backup',
  settingsRestoreInput: 'settings-restore-input',
  settingsRestoreConfirm: 'settings-restore-confirm',
  settingsRestoreYes: 'settings-restore-yes',
  settingsRestoreNo: 'settings-restore-no',
  settingsReset: 'settings-reset',
  settingsResetYes: 'settings-reset-yes',
  settingsMsg: 'settings-msg',
} as const

/** The dummy bundle's answers, keyed by what the card shows as its prompt (a Russian gloss, or an exercise line). */
export const DUMMY_ANSWERS: Record<string, string> = {
  книга: 'ספר',
  писать: 'לכתוב',
  всегда: 'תמיד',
  дом: 'בית',
  стол: 'שולחן',
  вода: 'מים',
  день: 'יום',
  город: 'עיר',
  сейчас: 'עכשיו',
  завтра: 'מחר',
  'учить, учиться': 'ללמוד',
  большой: 'גדול',
  'אני ___ מכתב (לכתוב)': 'אכתוב',
  'הם ___ מכתב (לכתוב)': 'יכתבו',
}

// לכתוב, future, in the teacher's column order: אני אתה את אנחנו אתם אתן הוא היא הם-הן (general Hebrew, not book content)
export const KTOV_FUTURE = ['אכתוב', 'תכתוב', 'תכתבי', 'נכתוב', 'תכתבו', 'תכתבו', 'יכתוב', 'תכתוב', 'יכתבו']

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
    /** Waits until the service worker controls the page and has the dummy manifest in its precache. */
    serviceWorkerReady: async () => {
      await this.page.waitForFunction(
        async () => {
          const reg = await navigator.serviceWorker.getRegistration()
          if (!reg?.active || !navigator.serviceWorker.controller) return false
          const hit = await caches.match(new URL('data-test/manifest.json', location.href).href, { ignoreSearch: true })
          return !!hit
        },
        undefined,
        { timeout: 20_000 },
      )
    },
    offline: async () => {
      await this.page.context().setOffline(true)
    },
    online: async () => {
      await this.page.context().setOffline(false)
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
    /** Answers whatever card is showing correctly (grid, exercise, typed word or reveal) and grades it Good. */
    passCurrentCard: async () => {
      await this.page.getByTestId(/^(study-prompt|study-finished)$/).first().waitFor()
      if (await this.byId(TEST_IDS.gridCell(0)).isVisible()) {
        await this.when.fillGrid(KTOV_FUTURE)
        await this.when.checkGrid()
        await this.when.continueAfterGrid()
        return
      }
      const isExercise = (await this.page.getByText(/^Exercise \d/).count()) > 0
      if (isExercise) {
        while (!(await this.byId(TEST_IDS.exerciseContinue).isVisible())) {
          await this.when.answerTyped()
          await this.byId(TEST_IDS.exerciseNext).click()
        }
        await this.byId(TEST_IDS.exerciseContinue).click()
        return
      }
      if (await this.byId(TEST_IDS.answerInput).isVisible()) {
        await this.when.answerTyped()
        await this.when.gradeGood()
        return
      }
      await this.when.revealAnswer()
      await this.when.gradeGood()
    },
    /** Types the right answer for the current typed prompt and checks it. */
    answerTyped: async () => {
      const prompt = (await this.get.prompt().textContent())?.trim() ?? ''
      const answer = DUMMY_ANSWERS[prompt]
      if (!answer) throw new Error(`no dummy answer for prompt «${prompt}»`)
      await this.byId(TEST_IDS.answerInput).fill(answer)
      await this.byId(TEST_IDS.answerCheck).click()
      await expect(this.get.answer()).toContainText('Correct')
    },
    openListen: async () => {
      await this.byId(TEST_IDS.homeListen).click()
    },
    playTrack: async (track: number) => {
      await this.byId(TEST_IDS.listenPlay(track)).click()
    },
    openSettings: async () => {
      await this.byId(TEST_IDS.homeSettings).click()
    },
    backup: async () => {
      await this.byId(TEST_IDS.settingsBackup).click()
    },
    restoreFromFile: async (path: string) => {
      await this.byId(TEST_IDS.settingsRestoreInput).setInputFiles(path)
    },
    confirmRestore: async () => {
      await this.byId(TEST_IDS.settingsRestoreYes).click()
    },
    cancelRestore: async () => {
      await this.byId(TEST_IDS.settingsRestoreNo).click()
    },
    resetProgress: async () => {
      await this.byId(TEST_IDS.settingsReset).click()
      await this.byId(TEST_IDS.settingsResetYes).click()
    },
  }

  get = {
    lockError: () => this.byId(TEST_IDS.lockError),
    onboardingStart: () => this.byId(TEST_IDS.onboardingStart),
    homeStatus: () => this.byId(TEST_IDS.homeStatus),
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
    restoreConfirm: () => this.byId(TEST_IDS.settingsRestoreConfirm),
    settingsMsg: () => this.byId(TEST_IDS.settingsMsg),
    /** The persisted schedule entry of one item (`vocab:<id>`, `grid:<verb>:<tense>` …), read from localStorage. */
    progressOf: (itemId: string) =>
      this.page.evaluate((id) => {
        const raw = localStorage.getItem('sh.progress:data-test')
        return raw ? ((JSON.parse(raw) as { state: { progress: Record<string, unknown> } }).state.progress[id] ?? null) : null
      }, itemId),
  }
}
