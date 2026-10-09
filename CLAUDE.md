# Shorashim — project facts for Claude sessions

A personal Hebrew trainer (PWA) for one learner (Serhii, the repo owner) working through «Шэат иврит, часть II»
(level Bet) with a teacher. Sessions are delivery sessions: `docs/worklog.md` has the state, `docs/decisions.md`
the why, `docs/MAPPING.md` the map of the book, `docs/CONTENT-RULES.md` the record and transcription rules.

**Public repo. Never commit:** the book's text or recordings in plaintext (`content/`, `sources/`, MP3s), the
passphrase (`.env.local`), or the kickoff prompt. Only ciphertext goes to `public/data/`.

## Commands

```sh
pnpm dev / build / test / e2e        # app; e2e = Playwright WebKit iPhone 13 against `pnpm preview` with the dummy bundle
pnpm render --pages 54-55,8 --columns 8   # book pages → sources/pages/ (300 dpi; vocabulary column crops at 2×)
pnpm diff-pass 54 [--accept 1]       # compare the two transcription passes; write the resolved pNNN.json
pnpm import-book                     # sources/transcribed/pNNN.json → content/*.json (all draft) + content/import-report.md
pnpm find "להבטיח"                   # niqqud-insensitive search over the transcriptions
pnpm apply-verified content/verified/<batch>.ts   # merge a verification patch + validate
pnpm validate && pnpm encrypt [--tracks 1-12]     # → public/data/{bundle.enc, audio/NN.enc, manifest.json, salt.json}; commit + push deploys
pnpm test-bundle                     # dummy bundle for e2e → public/data-test (passphrase: test-passphrase)
pnpm icons                           # PWA icons from public/icon.svg
```

`MATERIALS_DIR` and `TRAINER_PASSPHRASE` live in `.env.local`; never print either.

## Layout

- `src/content/schema.ts` — the content model (zod), shared by scripts and app; `src/content/load.ts` fetch +
  decrypt; `src/content/audio.ts` track decrypt → Blob URL, speech synthesis.
- `src/engine/answer.ts` — Hebrew answer normaliser and checker (pure, tested); `src/engine/scheduler.ts` —
  open-ended Leitner (pure, tested); `src/engine/items.ts` — bundle → schedule items, tense focus.
- `src/store/progress.ts` (localStorage, backup/restore, tense focus, per-cell stats), `src/store/content.ts`.
- `src/ui/` — screens (`Home`, `Study` + `drills/`, `Verbs`, `Units`, `UnitScreen`, `GrammarTopic`, `Listen`,
  `Weak`, `Settings`, `Help`), `ParadigmGrid` (the teacher's grid), `hebrew.tsx` (`HebrewText`, `AnswerInput`).
- `scripts/` — pipeline (Node/tsx); `scripts/lib/paths.ts` holds every path; `scripts/lib/transcription.ts` the
  per-page transcription record; `scripts/lib/piel-future.ts` the p.54 pattern as data.
- `content/` (gitignored) — `{vocab,verbs,grammar,exercises,texts,proverbs,prepositions,units,audio}.json`,
  `verified/*.ts`, `inventory.json`, `import-report.md`. `sources/` (gitignored) — `pages/`, `transcribed/`.

## Rules (short form; full in docs/CONTENT-RULES.md)

- Every record cites ≥ 1 PDF page (= printed page). Hebrew forms store `pointed` as printed and `plain` as typed.
- Two-pass transcription; `?` + `unreadable` for anything unclear; nothing invented. Paradigm cells that
  follow the book's pattern but are not printed carry `generated` until checked (G3).
- `checked` only after a page-level check; `pnpm validate` enforces it and gates `pnpm encrypt`.
- Secrets check before every commit: `git diff --cached --name-only | grep -E '^content/|^sources/|\.env|\.mp3'`.

## Gates

G1 — pp.54–55 + p.8 transcribed: Serhii reviews 20 entries, the pi'el screen, the לדבר / לספר grids.
G2 — the deployed app on the iPhone: passphrase, Home Screen, offline, Hebrew typing in a grid, audio.
G3 — before generating paradigms for every verb: five verbs across binyanim, cell by cell against the book.
Ask, never assume: what the class covers next; whether English glosses are wanted.

## Deploy

GitHub Pages from `main` via `.github/workflows/deploy.yml` (test → build → deploy).
Live: https://serhiikizenko.github.io/shorashim/ . Every push deploys — say so when pushing.
