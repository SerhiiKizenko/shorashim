# Decisions

Kickoff decisions (fork, hosting, progress, language, Hebrew rendering, typed answers, scheduler, content as
data, order, audio, speech, tense focus) are recorded in `docs/MAPPING.md` and the session-2 kickoff; the
entries below are what this session added or made concrete.

- **2026-10-09 — Repo `shorashim`, app «Shorashim», short name «Shorashim».** Alternatives offered: Ivrit Bet,
  Atid. Chosen by Serhii. Palette reused from muscle-memory; only the icon (a ש of three rooted stems) is new.
- **2026-10-09 — Leitner boxes 1–7 with intervals 0 / 1 / 3 / 7 / 14 / 30 / 60 days.** Box 7 is «mastered» but
  still returns every 60 days; nothing leaves the rotation. New items per day is a setting (default 10) —
  there is no exam date.
- **2026-10-09 — One schedule item per vocabulary entry, per verb × tense grid, per exercise, per preposition
  paradigm.** Ids `vocab:<id>`, `grid:<verbId>:<tense>`, `ex:<id>`, `prep:<id>`. The tense focus filters items;
  progress is keyed by item id, so toggling a tense never touches it (unit-tested in `items.test.ts` and
  `progress.test.ts`).
- **2026-10-09 — Answers are normalised with NFKC, not NFC.** NFKC also unfolds the Hebrew presentation forms
  (U+FB1D–FB4F) that pasted PDF text carries; for keyboard input the two are identical. Then maqaf → "-",
  marks U+0591–U+05C7 stripped, whitespace collapsed, edge punctuation trimmed (`src/engine/answer.ts`).
- **2026-10-09 — Flag `generated`.** A paradigm cell produced by the pipeline from the book's own pattern
  (p.54 for pi'el) and not yet seen printed. The verb record carries the flag and `checkedAgainst` lists the
  printed cells; the UI says so under the grid. Cleared only by checking against a printed form (G3).
- **2026-10-09 — The pi'el verb list on p.54 is unpointed.** The transcription records the standard pi'el
  pointing of each infinitive with the `generated` flag and a note; the teacher confirms at G1.
- **2026-10-09 — Grid and exercise grades are derived from first-try mistakes:** none → Good, one or two →
  Hard, more or «Finish anyway» → Again. Wrong cells are retried inside the drill before it ends.
- **2026-10-09 — `manifest.json` lists audio files and sizes only.** Track titles (book text) live inside the
  encrypted bundle. Tracks are precached never, runtime-cached (CacheFirst) after the first play.
- **2026-10-09 — The file magic stays `MMEM`.** The format and its tests are shared with muscle-memory;
  renaming it would only break that sharing.
- **2026-10-09 — The dummy bundle uses לכתוב (ordinary pa'al).** General Hebrew, nothing from the book, so the
  public repo holds no book content even in test data.
- **2026-10-09 — Storage keys `sh.*`, backup `app: 'shorashim'`,** scoped by data directory as before.
- **2026-10-09 — Pages cited are PDF pages,** which equal the printed book pages (verified on p.15 in session 1).
