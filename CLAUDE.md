# Shorashim — project facts for Claude sessions

A personal Hebrew trainer (PWA) for one learner (Serhii, the repo owner) working through «Шэат иврит, часть II»
(level Bet) with a teacher. Sessions are delivery sessions: `docs/worklog.md` has the state, `docs/decisions.md`
the why, `docs/MAPPING.md` the map of the book, `docs/CONTENT-RULES.md` the record and transcription rules.

**Target device: Chrome on Android, nothing else** (decided 2026-10-16; Safari/iPhone dropped). Android Chrome is
Blink, so desktop Chrome at phone width is the same engine; touch, the Gboard Hebrew keyboard, the share sheet and
the install flow are checked on the phone (G2). Help and Onboarding describe Chrome's ⋮ → «Add to Home screen».

**Public repo. Never commit:** the book's text or recordings in plaintext (`content/`, `sources/`, MP3s), the
passphrase (`.env.local`), or the kickoff prompt. Only ciphertext goes to `public/data/`. Never type the real
passphrase into any automation (Chrome MCP, Playwright): every drive uses the dummy bundle.

## Commands

```sh
pnpm dev / build / test / e2e        # app; test = vitest; e2e = Playwright `android` (Pixel 7, Chromium) + `iphone` (iPhone 13, WebKit)
pnpm e2e --project=android           # one project; browsers: `pnpm exec playwright install chromium webkit` after a Playwright bump
pnpm render --pages 54-55,8 --columns 8   # book pages → sources/pages/ (300 dpi; vocabulary column crops at 2×)
pnpm diff-pass 54 [--accept 1]       # compare the two transcription passes; write the resolved pNNN.json
pnpm import-book                     # sources/transcribed/pNNN.json → content/*.json (all draft) + content/import-report.md
pnpm find "להבטיח"                   # niqqud-insensitive search over the transcriptions
pnpm apply-verified content/verified/<batch>.ts   # merge a verification patch + validate
pnpm validate && pnpm encrypt [--tracks 1-12]     # → public/data/{bundle.enc, audio/NN.enc, manifest.json, salt.json}; commit + push deploys
pnpm test-bundle                     # dummy bundle for e2e → public/data-test (passphrase: test-passphrase); regenerate after editing the script
pnpm icons                           # PWA icons from public/icon.svg
```

`MATERIALS_DIR` and `TRAINER_PASSPHRASE` live in `.env.local`; never print either. The e2e web server is
`pnpm preview --port 4173` (reused if already running) serving `dist/`, so **`pnpm build` before `pnpm e2e`**.

## Layout

- `src/content/schema.ts` — the content model (zod), shared by scripts and app; `src/content/load.ts` fetch +
  decrypt (`?data=<dir>` picks the data directory for the tab; storage keys get a `:<dir>` suffix);
  `src/content/audio.ts` track decrypt → Blob URL, speech synthesis.
- `src/engine/answer.ts` — Hebrew answer normaliser and checker (pure, tested); `src/engine/scheduler.ts` —
  open-ended Leitner (pure, tested; the rules below); `src/engine/items.ts` — bundle → schedule items, tense focus.
- `src/store/progress.ts` (localStorage `sh.progress[:dir]`, backup/restore schema, tense focus, per-cell stats),
  `src/store/content.ts` (unlock, cached raw key `sh.rawKey[:dir]`).
- `src/ui/` — screens (`Home`, `Study` + `drills/`, `Verbs`, `Units`, `UnitScreen`, `GrammarTopic`, `Listen`,
  `Weak`, `Settings`, `Help`, `Onboarding`, `Lock`), `ParadigmGrid` (the teacher's grid), `hebrew.tsx` (`HebrewText`,
  `AnswerInput`), `components.tsx` (`Screen`, `Button`, `Card`, `GradeBar`).
- `src/main.tsx` — service-worker registration; a new build reloads the page only outside `#/study/…`.
- `vite.config.ts` — PWA: precache = shell + `data/bundle.enc` + `data/manifest.json` (+ the dummy bundle's two
  files); audio is runtime-cached on first play, never precached.
- `e2e/` — `smoke.spec.ts` + `drivers/trainer.driver.ts` (given / when / get; `TEST_IDS`, `DUMMY_ANSWERS`,
  `when.passCurrentCard()` answers any card, `get.progressOf(id)` reads the stored schedule entry).
- `scripts/` — pipeline (Node/tsx); `scripts/lib/paths.ts` holds every path; `scripts/lib/transcription.ts` the
  per-page transcription record; `scripts/lib/piel-future.ts` the p.54 pattern as data;
  `scripts/make-test-bundle.ts` the dummy bundle (12 everyday words, לכתוב future + past, 1 exercise, 1 WAV track;
  general Hebrew, nothing from the book).
- `content/` (gitignored) — `{vocab,verbs,grammar,exercises,texts,proverbs,prepositions,units,audio}.json`,
  `verified/*.ts`, `inventory.json`, `import-report.md`. `sources/` (gitignored) — `pages/`, `transcribed/`.

## Scheduler rules (short form; full in docs/decisions.md)

- Boxes 1–7, intervals 0 / 1 / 3 / 7 / 14 / 30 / 60 days; nothing leaves the rotation. Item ids `vocab:<id>`,
  `grid:<verbId>:<tense>`, `ex:<id>`, `prep:<id>`; the tense focus only filters, progress is never touched.
- **Only the first answer to an item in a session is persisted** (`shouldPersistGrade`): the forced re-passes after
  «Again» are rehearsal; a fresh «Again» on a re-pass is a lapse and is recorded.
- **New items per calendar day** (`newAllowance`): the limit minus items first seen today in any mode; «More new»
  is an explicit override.
- «Again» → box 1, due today (stays in «Today» until answered right in a later session). «Hard» keeps the box but
  never returns the same day (box 1 → tomorrow). «Good» → one box up.
- **Weak = failed and not yet recovered** (`isWeak`): box 1, or box 2 after a lapse. Used by Weak spots, the Verbs
  status dot and the Units bar alike.
- Grid and exercise grades come from first-try mistakes: none → Good, one or two → Hard, more or «Finish anyway» → Again.
- Restore validates the file and asks before replacing; a cancelled share sheet saves nothing.

## Testing in Chrome (MCP)

- Build + preview, open `http://localhost:4173/shorashim/?data=data-test#/`, unlock with `test-passphrase`. Real
  progress is untouched even on the live site (`?data=data-test` scopes every storage key).
- The Mac Chrome window will not go below 500 px wide: hold the page at 390 px with an injected style
  (`html,body{width:390px}`); `resize_window` only helps with height.
- Read state with `JSON.parse(localStorage['sh.progress:data-test'])`. Drive buttons through `data-testid`s.
- Avoid native dialogs: stub `navigator.canShare`/`share` and `HTMLAnchorElement.prototype.click` for Backup; feed
  Restore through a `DataTransfer` on the hidden file input + a `change` event.
- `navigate` to the same URL with only a different hash is a same-document navigation (the in-memory store
  survives); add a query param to force a real reload.

## Rules (short form; full in docs/CONTENT-RULES.md)

- Every record cites ≥ 1 PDF page (= printed page). Hebrew forms store `pointed` as printed and `plain` as typed.
- Two-pass transcription; `?` + `unreadable` for anything unclear; nothing invented. Paradigm cells that
  follow the book's pattern but are not printed carry `generated` until checked (G3).
- `checked` only after a page-level check; `pnpm validate` enforces it and gates `pnpm encrypt`.
- Secrets check before every commit: `git diff --cached --name-only | grep -E '^content/|^sources/|\.env|\.mp3'`.
- Every app change: `pnpm typecheck && pnpm test`, then `pnpm build && pnpm e2e`; new flows get a given/when/get
  step in the driver and a scenario in `e2e/smoke.spec.ts`, never raw `page.getByTestId` in the spec.

## Gates

G1 — pp.54–55 + p.8 transcribed: Serhii reviews 20 entries, the pi'el screen, the לדבר / לספר grids.
G2 — the deployed app in Chrome on the Android phone: passphrase, ⋮ → Add to Home screen, airplane mode,
share-sheet backup → Drive or Files, restore, Gboard Hebrew in a grid, audio, a deploy while a drill is open.
The exact Chrome and Gboard menu labels in Help are `[assumption]` until confirmed there.
G3 — before generating paradigms for every verb: five verbs across binyanim, cell by cell against the book.
Ask, never assume: what the class covers next; whether English glosses are wanted.

## Deploy

GitHub Pages from `main` via `.github/workflows/deploy.yml` (test → build → deploy).
Live: https://serhiikizenko.github.io/shorashim/ . Every push deploys — say so when pushing, and push only on
Serhii's go-ahead. The phone picks the new build up by itself; a drill in progress finishes first.
