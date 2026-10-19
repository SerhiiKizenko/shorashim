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
- `conflict` — two passes or two pages disagree, or the book contradicts itself (a key misprint); `notes` says
  which won and why (the book's own table beats a generated cell; a printed key beats an inferred answer; a
  grammatically impossible key line is kept as printed with the expected form listed first).
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

## Pealim (`book: "pealim"`)

Model verbs come from Pealim: `pnpm pealim https://www.pealim.com/dict/2-ledaber/ …` (`scripts/lib/pealim.ts`). Nothing is
typed by hand: the page's active table is read by cell id (`AP-*` present, `PERF-*` past, `IMPF-*` future, `IMP-*`
imperative, `INF-L`), `pointed` = Pealim's vowelled form, `plain` = the ktiv male Pealim prints next to it (the stripped
form when it prints none), «!» and direction marks dropped. Future and imperative ־נָה (`IMPF-2fp`/`3fp`, `IMP-2fp`) go to
`naForms`; the passive table and the «aux forms» (colloquial stress) are skipped. A page whose root has special
conjugation properties, or that lacks a cell or a recording, stops the command. Records: `unit: null`, `page` = the entry
number, `kind: "reference"`, `model: true`, `audio` = the clip keys on disk, `en` = Pealim's gloss. On import a printed
cell of another page still wins on letters (a different `plain` is a `conflict`); Pealim only adds its points.

## The teacher's verb workbook (`book: "workbook"`)

Homework arrives as CamScanner PDFs of pages from the teacher's verb workbook (title unknown). `pnpm intake <pdf…>`
copies each PDF into `MATERIALS_DIR/teacher/intake/` (idempotent by md5) and renders it to `sources/intake/<md5:8>/`;
`pnpm intake --assign <md5:8> 1=workbook:40 …` places the renders as `sources/pages/workbook/pNNN.png` (a page of the
main book is re-rendered from the book PDF instead). `pnpm intake --status` shows how far each page has got.

Page records: `book: "workbook"`, `unit: null`, `page` = the printed page number. Transcription files go to
`sources/transcribed/workbook/pNNN.pass{1,2}.json`; `pnpm check-pass <file>` validates one before the diff;
`pnpm diff-pass workbook NNN [--accept 1]` resolves.

- **Topics.** A page titled «בניין … » with a paradigm table is a topic: one `grammar` entry, `section` = the page
  number, `titleHe` as printed, `explanationEn` a faithful English rendering of what the page states (the root /
  infinitive / verbal-noun line, «שימו לב» rules), `tables` = the paradigm table (and any other printed table) with
  `columns` and each row's cells in the printed right-to-left order, `""` for an empty cell, points as printed;
  `binyan` set, `tense` omitted; `verbs` = the plain infinitives of the verbs whose forms the tables print.
- **Verbs.** One `verbs[]` entry for every verb on the page: the table's verbs and every verb an exercise asks for
  or shows. `infinitive.pointed` as printed (an unpointed print stays unpointed); if the page prints no infinitive,
  the standard one, unpointed, flag `generated`, note «infinitive derived from the root». `root` as printed with
  dots, or derived and noted. `group` as in the main book (`shlemim`; a consonantal י as 2nd radical in pi'el →
  `ayin-yod`; 2nd radical א ה ח ע ר → `gutturals`; four radicals → `quad`). `forms` = only the cells the page prints
  in a table position: the paradigm table, and the seeded cell of a complete-the-table row. Cell keys: past
  `ani ata at hu hi anachnu atem aten hem`; present `ms fs mp fp`; future `ani ata at hu hi anachnu atem hem`
  (אתם/אתן is one row → `atem`; הם/הן → `hem`); imperative `ata at atem` (drop the «!»). A slash cell
  («דִּבַּרְתֶּם/תֶּן») gives both `atem` and `aten`. `verbalNoun` when printed in a known place (the «שם הפעולה:» line or
  the שם הפעולה column of a row). Do not add Russian glosses: they are added after the two passes in
  `sources/transcribed/workbook/glosses.json` (`{ "<plain infinitive>": "<Russian>" }`, general usage), and every word
  card made from them is flagged `unsupported` (the workbook prints none).
- **A table that mixes verbs** (p.60: past of צ.ל.ם, present of ש.מ.ש, future of ס.כ.ל) is split by verb: every
  printed cell goes to the verb it belongs to, with a note.
- **Exercise numbers** (the workbook prints none): `<topic page>.<n>`, n counting the exercises in printed order from
  the topic page on (p.40 → 40.1; p.41 → 40.2, 40.3; p.50 → 49.2, 49.3; p.61 → 60.1, 60.2; p.62 → 60.3, 60.4). The
  page that prints the exercise stays its `page`.
- **Items**, one per answer blank and per tense column. Labels: a sentence with tense columns → `«n» · עבר`
  (the column header as printed: עבר / הווה / עתיד / שם הפועל / שם הפעולה); several blanks → `«n».«k»` (k in reading
  order), plus ` · «column»` when columns apply; a complete-the-table cell → `«pronoun as printed» · «column»`
  for every empty cell of the row; a sort-into-the-table form → `«n»`, its position in the printed list; an
  unnumbered example → `דוגמה`. `prompt`: the sentence exactly as printed, each blank `___`, the parenthesised cue
  left in place; a table cell → `«pronoun» ___`; a list form (sort, or «write the infinitive and the verbal noun»)
  → the form as printed. `hint`: the printed cue for this blank (the infinitive or root in parentheses without the
  parentheses, the bold verb, or the row's printed form). `tense` for tense blanks. `verb`: the plain infinitive the
  blank is about — always, also for a sort item. `cells`: the person cell(s) the subject needs (past/future keys
  above; present `ms fs mp fp`; a subject of unknown gender such as אני or אנחנו → both, e.g. `["ms","fs"]`); for a
  sort item, every person the form fits (future תְּדַבֵּר → `["ata","hi"]`). `ask: "infinitive"` / `"verbalNoun"` for
  a שם הפועל / שם הפעולה blank (no tense, no cells). `answers` only when the page itself prints the answer (a worked
  example, also in a handwriting font) — exactly as printed. The learner's own handwriting is not content: ignore
  it and say so in `notes`.
- **Kinds**: sentence → `conjugate-in-context`; complete-the-table → `fill`; sort-into-the-table → `identify`; a list of
  forms → `transform`. All are `gradable: true`: the importer derives every answer from the verb's paradigm (printed
  cells first, generated cells flagged `generated`), so a wrong `verb`, `tense` or `cells` makes a wrong answer.
- **Sayings** in a box (e.g. «כל ההתחלות קשות») → `proverbs[]`, points as printed.
