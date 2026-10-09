# Content rules

## Records (`src/content/schema.ts`)

- Every record: `id`, `unit`, `sources: [{page}]` (≥ 1; PDF page = printed page), `reviewStatus`
  (`draft` | `checked`), `flags`, `notes?`. Hebrew strings are NFC.
- Every Hebrew form is `{pointed, plain, variants?}`: `pointed` exactly as the book prints it; `plain` the
  everyday spelling (ktiv male) a learner types. `plain` is **not** the pointed form stripped (דִּבֵּר → people
  type דיבר). Answers match `plain`, the stripped `pointed`, and `variants`.
- Vocabulary (`u01-v002`): `pos`, `he` as printed («מַבְטִיחַ — לְהַבְטִיחַ ל-»), `lemma`, `present?`, `ru` = the book's
  gloss verbatim, `gender?`, `plural?`, `government?`, `verbId?`. No English glosses in v1.
- Verb (`v-dbr-piel`): `infinitive`, `root`, `binyan`, `group`, `forms{future, past, present, imperative}` with
  the cells of `TENSE_CELLS` (future has no ־נָה forms: אתן = אתם, הן = הם — the book's convention, p.54),
  `checkedAgainst[{page, tense, cells}]` = cells the book itself prints.
- Grammar topic (`u04-s2`): the book's Russian in `explanationRu` as printed; `explanationEn` a faithful
  rendering; the teacher's method in `teacherNote`, shown labelled.
- Exercise (`u04-ex2.1`): items with `prompt` as printed («___» for a blank), `hint` (the infinitive under
  the blank), `tense` when the exercise mixes tenses, `answers[]` from the key with `keyPage`.

## Status and flags

- `draft` — transcribed, not yet checked against the page. The app shows «Draft».
- `checked` — every string verified against a cited page; `pnpm validate` refuses `checked` records with
  `?`, with the `unreadable` flag, or (verbs) with a missing cell.
- `unreadable` — a spot the render did not settle; the text holds `?`. Never guess; re-render at a higher zoom.
- `conflict` — two passes or two pages disagree; `notes` says which won and why (the book's own table beats
  a generated cell; the answer key beats an inferred answer).
- `unsupported` — not in the book (kept only when the teacher asked for it; say where it came from).
- `generated` — a paradigm cell produced from the book's pattern by `scripts/lib/piel-future.ts`, not yet seen
  printed. Stays until checked against a printed form.

## Transcription (two passes, MAPPING §6)

1. `pnpm render --pages 54-55 --columns 8` → `sources/pages/pNNN.png` (300 dpi) and, for vocabulary pages,
   `pNNN-c1..3.png` (column crops at 2×, c1 = the right column).
2. Pass 1: read the renders, write `sources/transcribed/pNNN.pass1.json` (schema in
   `scripts/lib/transcription.ts`: `raw` = the page text in reading order, then typed records). Points exactly
   as printed; `plain` only where ktiv male differs from the stripped pointed form; `?` + `unreadable` for
   anything unclear; nothing invented.
3. Pass 2: a fresh reader (a subagent with no memory of pass 1: repo files only, no MCP tools, never
   commits) writes `pNNN.pass2.json` from the same renders.
4. `pnpm diff-pass NNN` prints every difference. Resolve each by re-reading the spot at a higher zoom
   (`magick -crop … -resize 300%`), fix the pass that was wrong, then `pnpm diff-pass NNN --accept 1` writes
   `pNNN.json`. Only `pNNN.json` files are imported.
5. `pnpm import-book` → `content/*.json` (all `draft`) + `content/import-report.md`: counts per unit and part of
   speech, generated cells, missing answers, derived plain spellings. **Counts come from this report.**
6. `pnpm find "להבטיח"` searches the transcriptions niqqud-insensitively (prints `p.N field: text`).

## Verification batches

`content/verified/<batch>.ts` exports partial records by id; `pnpm apply-verified content/verified/<batch>.ts`
merges them (verb `forms` merge per cell) and validates. `pnpm validate` must be green before `pnpm encrypt`.

## Budgets and hygiene

- Text bundle ≤ 3 MB (validated). Audio ≈ 40 MB in all, one encrypted file per track, never precached.
- Never commit `content/`, `sources/`, `.env.local`, MP3s, the kickoff. Before each commit:
  `git diff --cached --name-only | grep -E '^content/|^sources/|\.env|\.mp3'` must print nothing
  (`src/content/` is code and is committed).
