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
- **2026-10-09 — A dagesh inside a bold, solid prefix letter is undecidable from the scan.** The p.54 table prints the
  prefix ת in bold; neither pass could see a dot inside it. The standard dagesh lene (תְּ) is recorded, the
  ambiguity noted on the record, and the teacher is asked at G1. The checker ignores points, so drills are unaffected.
- **2026-10-09 — Root group is about conjugation, not letters.** A root whose *last* letter is ר (ד.ב.ר, ב.ק.ר, ס.ד.ר)
  stays `shlemim`: a final radical never takes the pi'el dagesh. `gutturals` is for a 2nd radical in א ה ח ע ר
  (ש.ח.ק, ש.ר.ת), where the pointing changes.
- **2026-10-09 — A misprint in the answer key is recorded as printed and flagged `conflict`.** p.192 prints «נטלפן»
  for 2.1 ז («הן טילפנו» → the future is יטלפנו). The item lists the expected form first (shown on reveal) and the
  printed one second (still accepted), with the note; the teacher confirms at G1.
- **2026-10-09 — Dot-sized marks are below the scan's resolution.** A pixel-level second read of p.8 showed that
  dagesh, shin/sin dots, shva and holam dots survive the 300-dpi scan only sporadically. For those marks the standard
  orthography is recorded and the page note says so; letter-level and bar-shaped vowel differences are settled at
  600 dpi (p.8: לִכְעֹס without vav, «יותר מכול» with vav). Serhii or the teacher checks the physical book at G1.
- **2026-10-16 — The target browser is Chrome on Android; Safari/iPhone is dropped.** Chrome on Android is Blink, so
  the Mac Chrome MCP at phone width is the same engine; Playwright runs a Pixel 7 (Chromium) project first and keeps
  the iPhone 13 (WebKit) project as a second engine. Help and Onboarding describe Chrome's ⋮ → «Add to Home screen»
  and Gboard; the installed app shares Chrome's storage, so Backup/Restore is for a new phone, not for the install.
- **2026-10-16 — The schedule learns from the first answer to an item in a session only.** The two forced re-passes
  after «Again» are rehearsal (learning steps), not evidence for a longer interval; a fresh «Again» on a re-pass is a
  real lapse and is recorded. Before this rule a word failed once ended the same session in box 3, due in 3 days
  (`shouldPersistGrade` in `src/engine/scheduler.ts`; proved with the dummy bundle in Chrome and in e2e).
- **2026-10-16 — «New items per day» is counted per calendar day.** `newAllowance` subtracts the items first seen
  today, whatever mode introduced them; reopening «Today» brings only what is due. «More new» stays an explicit override.
- **2026-10-16 — «Hard» never comes back the same day.** It keeps the box; a box-1 item (interval 0) is due tomorrow.
  «Again» keeps due = today, so a failed word stays in «Today» until it is answered right in a later session.
- **2026-10-16 — Weak = failed and not yet recovered:** box 1, or box 2 reached after a lapse (`isWeak`). A new item
  answered Good once is young, not weak. Used by the Weak screen, the Verbs status dot and the Units bar alike.
- **2026-10-16 — `data/manifest.json` is precached with the bundle** (and the dummy bundle's two files, so the offline
  e2e test can run). The loader reads the manifest first; offline starts failed while it was network-only. Bundle and
  manifest now update together with the service worker.
- **2026-10-16 — A new build reloads the page only outside a drill.** `registerSW` gets `onNeedReload`; while the hash
  is `#/study/…` the reload waits for the next navigation away. The auto-update itself stays on.
- **2026-10-16 — Restore asks first.** The file is validated, then a card shows its date, item and review counts next
  to the device's count; «Replace» applies it. A cancelled share sheet saves nothing (no download behind it).
- **2026-10-16 — Leitner stays; FSRS is deferred.** The research found total spacing matters more than the ladder's
  shape; FSRS's gain is per-item adaptivity, which needs a review history. The review log starts now, so the switch
  stays possible.
- **2026-10-16 — Due dates are fuzzed and load-balanced** with Anki's published bands (no fuzz under 2.5 days, else
  ± 1 day + 15 % / 10 % / 5 % of the interval's parts in 2.5–7 / 7–20 / 20+ days), onto the day with the fewest items
  due; ties at random. Reimplemented from the numbers (Anki's code is AGPL). `applyGrade` stays exact without a
  spread, so the ladder tests are unchanged.
- **2026-10-16 — Catch-up above «Reviews per day» (default 100).** Steady state at 10 new a day is about 50 reviews.
  Above the budget: oldest first, capped, no new items, no mixed cells. «More new» stays an override.
- **2026-10-16 — A vocabulary card asks by its box at the start of the session:** new or box 1 → 4-choice (Hebrew →
  meaning), box ≥ 2 → typed (meaning → Hebrew). A choice can lift a word to box 2 only. Replaces the `reps % 2`
  alternation. A hinted correct answer allows only «Hard».
- **2026-10-16 — Mistakes are classified, not just marked wrong:** final letter, vowel letter (an inserted or missing
  ו/י — a swapped ו↔י is an ending), one letter, beginning, ending, other. Recorded with the review whenever the typed
  answer was wrong.
- **2026-10-16 — Mixed cells never grade a grid.** They interleave single forms from grids in box ≥ 2 that are not
  due and not reviewed today; results go to cell stats only, like «One form».
- **2026-10-16 — No streak in the UI:** seven dots for a rolling week (not Monday-based: the Israeli week starts on
  Sunday). `stats.streak` stays in the backup. No points, badges or leagues.
- **2026-10-16 — New stored fields get defaults instead of a backup version bump.** A v1 backup restores unchanged;
  `mergePersisted` fills settings added after a state was stored.
- **2026-10-16 — Both transcription passes of the workbook are fresh subagents** with the same brief; the session
  only resolves. The two readings stay independent, and the brief (CONTENT-RULES §workbook) is the one place the
  conventions live.
- **2026-10-16 — Partial pointing is recorded as printed when the omission is systematic** (p.49: the shva under פ is
  absent in 19 cells while the present prints it; p.41: four dots both readers miss although the same marks show
  elsewhere). The «standard orthography for dot-sized marks» rule stays for marks the scan loses sporadically.
- **2026-10-16 — Workbook answers are derived, not typed in:** the transcriber records the verb, tense and person
  cells of each blank; the importer takes the verb's cell (printed first, generated second, flagged). A printed
  example answer wins. A blank after a printed ל expects the rest of the infinitive.
- **2026-10-16 — Plain-only generation for pi'el / hif'il / hitpa'el,** `pointed` = `plain` for generated cells;
  weak roots get nothing. The importer compares the pattern with every printed cell on every import (G3 in code).
- **2026-10-16 — Russian glosses for workbook verbs come from general usage** (`glosses.json`), each word card
  flagged `unsupported` until the teacher confirms.
- **2026-10-19 — Pealim is a third source (`book: "pealim"`, page = the entry number, shown «pealim.com/dict/N»).**
  `pnpm pealim <url…>` copies the active table (the passive table is skipped), Pealim's ktiv male and one recording per
  form. A personal-study copy: pages and MP3s stay in `MATERIALS_DIR/pealim/`; only ciphertext ships.
- **2026-10-19 — Model verbs: לדבר (pi'el), להרגיש (hif'il), להתלבש (hitpa'el), להיכנס (nif'al)** — the teacher's
  method: one verb per binyan in every tense, known by heart. Chosen by Serhii: the existing grid, one tense per grid
  (16 grids, scheduled like any other), a section session runs one tense across the four verbs in binyan order.
- **2026-10-19 — ־נָה forms are for reading only (`naForms`).** The teacher's grid merges אתן / הן with אתם / הם, and
  Pealim notes that modern Hebrew uses the masculine form; they are never a cell or an accepted answer.
- **2026-10-19 — Pealim's complete pointing replaces a page's partial pointing when the letters agree** (Serhii: text and
  recording should match). לדבר: 24 of 24 cells agree with workbook p.40, 19 take Pealim's points. A derived infinitive
  that Pealim prints clears `generated`. Workbook prints stay out of both rules (their pointing is partial by design).
- **2026-10-19 — The model verbs carry Pealim's English gloss (`en`)** — Serhii: «better to stick to English». The book's
  Russian stays wherever the book prints one.
