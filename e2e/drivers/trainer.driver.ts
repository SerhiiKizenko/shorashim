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
  gradeHard: 'grade-hard',
  gradeAgain: 'grade-again',
  choiceOption: (i: number) => `choice-option-${i}`,
  studyHint: 'study-hint',
  studyHintText: 'study-hint-text',
  answerClass: 'answer-class',
  cellCard: 'cell-card',
  practiceNext: 'practice-next',
  studyProgress: 'study-progress',
  homeForecast: 'home-forecast',
  homeWeek: 'home-week',
  homeAnswered: 'home-answered',
  homeAnchor: 'home-anchor',
  homeWeak: 'home-weak',
  onboardingAnchor: 'onboarding-anchor',
  verbsBuild: 'verbs-build',
  weakLeeches: 'weak-leeches',
  weakMistake: (c: string) => `weak-mistake-${c}`,
  homeUnits: 'home-units',
  unitsWorkbook: 'units-workbook',
  workbookTopic: (id: string) => `unit-${id}`,
  topicStudy: 'topic-study',
  topicExercise: (id: string) => `topic-exercise-${id}`,
  identifyTense: (t: string) => `identify-tense-${t}`,
  exerciseSummary: 'exercise-summary',
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
  gridDrill: 'grid-drill',
  homeModel: 'home-model',
  verbsModel: 'verbs-model',
  modelTense: (tense: string) => `model-tense-${tense}`,
  modelVerb: (verbId: string) => `model-verb-${verbId}`,
  tableDrill: (tense: string) => `table-drill-${tense}`,
  naForm: (tense: string) => `na-${tense}`,
  formAudioButton: (clip: string) => `form-audio-${clip}`,
  formAudio: 'form-audio',
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

/** The dummy bundle's glosses, keyed by the Hebrew a 4-choice card shows (its letters only, see lettersOnly). */
export const DUMMY_GLOSSES: Record<string, string> = {
  'ספר ז': 'книга',
  'כותב לכתוב': 'писать',
  'תמיד': 'всегда',
  'בית ז': 'дом',
  'שלחן ז': 'стол',
  'מים זר': 'вода',
  'יום ז': 'день',
  'עיר נ': 'город',
  'עכשו': 'сейчас',
  'מחר': 'завтра',
  'לומד ללמוד': 'учить, учиться',
  'גדול': 'большой',
}
/** The dummy workbook's «sort into the table» forms: the tense and one right cell. */
export const DUMMY_PLACES: Record<string, [string, string]> = { כתבתי: ['past', 'ani'], תכתוב: ['future', 'hi'], כותבים: ['present', 'mp'] }

/** Hebrew letters and single spaces only: drops vowel points, dashes and gershayim, so keys need no niqqud. */
export const lettersOnly = (s: string): string => s.replace(/[^\u05D0-\u05EA ]/g, '').replace(/\s+/g, ' ').trim()

// לכתוב, future, in the teacher's column order: אני אתה את אנחנו אתם אתן הוא היא הם-הן (general Hebrew, not book content)
export const KTOV_FUTURE = ['אכתוב', 'תכתוב', 'תכתבי', 'נכתוב', 'תכתבו', 'תכתבו', 'יכתוב', 'תכתוב', 'יכתבו']
/** לכתוב typed into a whole grid, per tense, in the grid's row order (GRID_COLUMNS). */
export const KTOV_GRID: Record<string, string[]> = {
  future: KTOV_FUTURE,
  past: ['כתבתי', 'כתבת', 'כתבת', 'כתבנו', 'כתבתם', 'כתבתן', 'כתב', 'כתבה', 'כתבו'],
  present: ['כותב', 'כותבת', 'כותבים', 'כותבות'],
  imperative: ['כתוב', 'כתבי', 'כתבו'],
}
/** לכתוב by tense and the pronoun a single-cell card shows. */
export const KTOV_CELLS: Record<string, Record<string, string>> = {
  future: { אני: 'אכתוב', אתה: 'תכתוב', את: 'תכתבי', אנחנו: 'נכתוב', אתם: 'תכתבו', הוא: 'יכתוב', היא: 'תכתוב', 'הם-הן': 'יכתבו' },
  present: { 'אני / אתה / הוא': 'כותב', 'אני / את / היא': 'כותבת', 'אנחנו / אתם / הם': 'כותבים', 'אנחנו / אתן / הן': 'כותבות' },
  past: { אני: 'כתבתי', אתה: 'כתבת', את: 'כתבת', אנחנו: 'כתבנו', אתם: 'כתבתם', אתן: 'כתבתן', הוא: 'כתב', היא: 'כתבה', 'הם-הן': 'כתבו' },
}

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
    /** Waits until the service worker is activated, controls the page, has nothing newer installing, and holds the
     * dummy manifest in its precache. Polled with expect.poll: waitForFunction does not await an async predicate (the
     * returned Promise counts as truthy), so the earlier check passed at once and only a fast install hid it. */
    serviceWorkerReady: async () => {
      await expect
        .poll(
          () =>
            this.page.evaluate(async () => {
              const reg = await navigator.serviceWorker.getRegistration()
              if (reg?.active?.state !== 'activated' || reg.installing || !navigator.serviceWorker.controller) return false
              return !!(await caches.match(new URL('data-test/manifest.json', location.href).href, { ignoreSearch: true }))
            }),
          { timeout: 20_000 },
        )
        .toBe(true)
    },
    /** Writes the stored progress state before the app loads (once per tab: a reload keeps what the app saved since).
     * Missing settings are filled from the defaults by the store's merge. */
    progress: async (state: Record<string, unknown>) => {
      await this.page.addInitScript((s) => {
        if (sessionStorage.getItem('sh.e2e-seeded')) return
        localStorage.setItem('sh.progress:data-test', JSON.stringify({ state: s, version: 1 }))
        sessionStorage.setItem('sh.e2e-seeded', '1')
      }, state)
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
    setAnchor: async (text: string) => {
      await this.byId(TEST_IDS.onboardingAnchor).fill(text)
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
    gradeHard: async () => {
      await this.byId(TEST_IDS.gradeHard).click()
    },
    gradeAgain: async () => {
      await this.byId(TEST_IDS.gradeAgain).click()
    },
    /** 4-choice card: picks the option with this gloss. */
    chooseOption: async (gloss: string) => {
      await this.page.getByTestId(/^choice-option-\d+$/).filter({ hasText: new RegExp(`^${gloss}$`) }).click()
    },
    /** 4-choice card: picks the right gloss for the Hebrew shown. */
    chooseRightOption: async () => {
      const shown = lettersOnly((await this.get.prompt().textContent()) ?? '')
      const gloss = DUMMY_GLOSSES[shown]
      if (!gloss) throw new Error(`no dummy gloss for «${shown}»`)
      await this.when.chooseOption(gloss)
    },
    /** 4-choice card: picks any wrong option. */
    chooseWrongOption: async () => {
      const gloss = DUMMY_GLOSSES[lettersOnly((await this.get.prompt().textContent()) ?? '')]
      await this.page.getByTestId(/^choice-option-\d+$/).filter({ hasNotText: new RegExp(`^${gloss}$`) }).first().click()
    },
    next: async () => {
      await this.byId(TEST_IDS.exerciseNext).click()
    },
    continueExercise: async () => {
      await this.byId(TEST_IDS.exerciseContinue).click()
    },
    hint: async () => {
      await this.byId(TEST_IDS.studyHint).click()
    },
    /** Types any text into the answer field and checks it. */
    typeAndCheck: async (text: string) => {
      await this.byId(TEST_IDS.answerInput).fill(text)
      await this.byId(TEST_IDS.answerCheck).click()
    },
    /** Single-cell card (one form, from root, mixed cells): types the right form for the pronoun and tense shown. */
    answerCell: async () => {
      const card = this.byId(TEST_IDS.cellCard)
      const tense = (await card.getAttribute('data-tense')) ?? ''
      const label = (await card.getAttribute('data-label')) ?? ''
      const answer = KTOV_CELLS[tense]?.[label]
      if (!answer) throw new Error(`no dummy form for ${tense} «${label}»`)
      await this.when.typeAndCheck(answer)
      await expect(this.get.answer()).toContainText('Correct')
    },
    openUnits: async () => {
      await this.byId(TEST_IDS.homeUnits).click()
    },
    openWorkbookTopic: async (id: string) => {
      await this.byId(TEST_IDS.workbookTopic(id)).click()
    },
    studyTopic: async () => {
      await this.byId(TEST_IDS.topicStudy).click()
    },
    openTopicExercise: async (id: string) => {
      await this.byId(TEST_IDS.topicExercise(id)).click()
    },
    /** «Sort into the table»: picks a tense, then the person column whose cell is `cell`. */
    placeForm: async (tense: string, cell: string) => {
      await this.byId(TEST_IDS.identifyTense(tense)).click()
      await this.page.locator(`[data-testid^="identify-person-"][data-cell="${cell}"]`).first().click()
    },
    /** «Sort into the table»: places the form shown where it belongs. */
    placeRight: async () => {
      const shown = ((await this.get.prompt().textContent()) ?? '').trim()
      const place = DUMMY_PLACES[shown]
      if (!place) throw new Error(`no dummy place for «${shown}»`)
      await this.when.placeForm(place[0], place[1])
    },
    openWeak: async () => {
      await this.byId(TEST_IDS.homeWeak).click()
    },
    openBuild: async () => {
      await this.byId(TEST_IDS.verbsBuild).click()
    },
    /** Answers whatever card is showing correctly (grid, single cell, exercise, 4-choice or typed word) and grades it
     * Good. */
    passCurrentCard: async () => {
      await this.page.getByTestId(/^(study-prompt|study-finished)$/).first().waitFor()
      if (await this.byId(TEST_IDS.gridCell(0)).isVisible()) {
        const tense = (await this.byId(TEST_IDS.gridDrill).getAttribute('data-tense')) ?? 'future'
        await this.when.fillGrid(KTOV_GRID[tense] ?? KTOV_FUTURE)
        await this.when.checkGrid()
        await this.when.continueAfterGrid()
        return
      }
      if (await this.byId(TEST_IDS.cellCard).isVisible()) {
        await this.when.answerCell()
        await this.byId(TEST_IDS.practiceNext).click()
        return
      }
      const isExercise = (await this.page.getByText(/^Exercise \d/).count()) > 0
      if (isExercise) {
        while (!(await this.byId(TEST_IDS.exerciseContinue).isVisible())) {
          if (await this.byId(TEST_IDS.identifyTense('past')).isVisible()) await this.when.placeRight()
          else await this.when.answerTyped()
          await this.byId(TEST_IDS.exerciseNext).click()
        }
        await this.byId(TEST_IDS.exerciseContinue).click()
        return
      }
      if (await this.byId(TEST_IDS.choiceOption(0)).isVisible()) {
        await this.when.chooseRightOption()
        await this.when.gradeGood()
        return
      }
      await this.when.answerTyped()
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
    openModelVerbs: async () => {
      await this.byId(TEST_IDS.homeModel).click()
    },
    /** «Model verbs»: one tense across the model verbs. */
    startModelTense: async (tense: string) => {
      await this.byId(TEST_IDS.modelTense(tense)).click()
    },
    openModelVerb: async (verbId: string) => {
      await this.byId(TEST_IDS.modelVerb(verbId)).click()
    },
    /** A form's speaker button (`past.ani`, `infinitive`, `na.future` …): fetches, decrypts and plays its clip. */
    playForm: async (clip: string) => {
      await this.byId(TEST_IDS.formAudioButton(clip)).first().click()
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
    /** The shared hidden <audio> that plays a form's recording (its src is a blob: URL once a clip is decrypted). */
    formAudio: () => this.byId(TEST_IDS.formAudio),
    formAudioButton: (clip: string) => this.byId(TEST_IDS.formAudioButton(clip)),
    gridDrill: () => this.byId(TEST_IDS.gridDrill),
    modelTense: (tense: string) => this.byId(TEST_IDS.modelTense(tense)),
    modelVerb: (verbId: string) => this.byId(TEST_IDS.modelVerb(verbId)),
    naForm: (tense: string) => this.byId(TEST_IDS.naForm(tense)),
    restoreConfirm: () => this.byId(TEST_IDS.settingsRestoreConfirm),
    settingsMsg: () => this.byId(TEST_IDS.settingsMsg),
    gradeButton: (g: 'again' | 'hard' | 'good') => this.byId(g === 'again' ? TEST_IDS.gradeAgain : g === 'hard' ? TEST_IDS.gradeHard : TEST_IDS.gradeGood),
    hintText: () => this.byId(TEST_IDS.studyHintText),
    answerClass: () => this.byId(TEST_IDS.answerClass),
    sessionBar: () => this.byId(TEST_IDS.studyProgress),
    week: () => this.byId(TEST_IDS.homeWeek),
    answered: () => this.byId(TEST_IDS.homeAnswered),
    anchor: () => this.byId(TEST_IDS.homeAnchor),
    leeches: () => this.byId(TEST_IDS.weakLeeches),
    mistake: (c: string) => this.byId(TEST_IDS.weakMistake(c)),
    workbookSection: () => this.byId(TEST_IDS.unitsWorkbook),
    exerciseSummary: () => this.byId(TEST_IDS.exerciseSummary),
    /** The due counts behind the forecast bars on Home (index 0 = today, overdue included). */
    forecast: async () => ((await this.byId(TEST_IDS.homeForecast).getAttribute('data-counts')) ?? '').split(',').map(Number),
    /** The stored state, read from localStorage: the review log. */
    reviews: () =>
      this.page.evaluate(() => {
        const raw = localStorage.getItem('sh.progress:data-test')
        return raw ? ((JSON.parse(raw) as { state: { reviews?: unknown[] } }).state.reviews ?? []) : []
      }),
    /** The persisted schedule entry of one item (`vocab:<id>`, `grid:<verb>:<tense>` …), read from localStorage. */
    progressOf: (itemId: string) =>
      this.page.evaluate((id) => {
        const raw = localStorage.getItem('sh.progress:data-test')
        return raw ? ((JSON.parse(raw) as { state: { progress: Record<string, unknown> } }).state.progress[id] ?? null) : null
      }, itemId),
  }
}
