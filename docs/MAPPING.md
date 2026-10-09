# Mapping — «Шэат иврит, часть II» → Hebrew trainer

Session 1, 2026-10-09. Materials: `MATERIALS_DIR` (see `.env.local`) = `Sheat-Ivrit-Bet.pdf`, `audio/` (44 MP3),
`teacher/` (photos of the teacher's sheets, added by Serhii). Machine-readable facts: `content/inventory.json`.
All page numbers are **PDF pages**; PDF page = printed book page (p.15 prints «15»).

## 1. The material

| Item | Facts |
|---|---|
| Book | «Шэат иврит» II (שעת עברית ב), © 1991 Центр «Шефа»; for adult Russian speakers who know ~800 words → ~2000 (preface p.7). 200 pages, 13 units. |
| Scan | `djvutopdf`, **no text layer** (`pdftotext` → 0 words), one 300-dpi JPEG per page. |
| OCR | `tesseract -l heb+rus` on p.8 is unusable: אוולי for אורלי, גניין for בניין, columns interleaved. **Transcribe with Claude vision** (rendered pages / column crops). |
| Spelling | Texts mostly unpointed (ktiv male); word lists and grammar tables fully pointed (preface p.7). |
| Front matter | cover 1, credits 2, TOC 3–5, Hebrew intro 6, Russian preface 7. |
| Back matter | **מפתח הוראות** (exercise instructions translated to Russian) 186–187; **תשובות** (answer key, by unit + exercise number) 188–200. |
| Audio | 44 MP3 (track 00 = 4 s intro + 43), 5342 s ≈ 89 min, 64 kbps, ~40 MB. Filenames carry unit («Раздел Алеф…») and book page («(с.9)»). Filenames are NFD on disk — normalise to NFC before parsing or comparing. |

## 2. Backbone — units, sections, pages (TOC pp.3–5, read at 250 dpi)

Each unit opens with **one vocabulary page** (confirmed visually for all 13). Section numbers are the book's;
exercises are numbered `<section>.<n>` inside a unit (e.g. unit 4, ex. 2.1 = p.55), and the answer key uses the
same numbers. Page numbers from the TOC — verify each heading on its page (the TOC is unpointed and a few digits
were hard to read; marked ?).

| Unit | Vocab | Sections (page) | Audio tracks |
|---|---|---|---|
| 1 א | 8 | 1 text «אורלי והקולנוע» 9 · 2 אחר/עוד 12 · 3 השורש 12 · 4 hif'il — present + infinitive 15 · 5 «איתי» inflected 16 | 01 (p.9), 02 עם/איתי (p.16), 03 proverbs (p.17) |
| 2 ב | 18 | 1 text «זאב! זאב!» 19 · 2 hif'il — past 22 · 3 נמאס לי / רון מספר 24 · 4 האיש הירוק — adjectives 26 · 5 יותר מ־/פחות מ־ 28 · 6 היה + present (habitual past) / ערב שבת בבית אבא 30 · 7 review: inflected prepositions 32 | 04–07 (pp.19, 24, 26, 30), 08 proverbs (p.33) |
| 3 ג | 34 | 1 text «מסביב לשעון» 35 · 2 סמיכות 38 · 3 יש ל־/היה ל־ 41 · 4 אצל/ב־, «אצלי» inflected 44 · 5 מפני ש־/לכן/גם זה משהו 46 | 09 (p.35), 10 (pp.46–47) |
| 4 ד | 50 | 1 text «מי אוהב לעמוד בתור?» 51 · **2 pi'el — future 54** · 3 conditionals אם + future + future 56 · 4 future time expressions 57 · 5 relative clauses 58 · 6 extra reading «אי אפשר בלי עברית» 61 · 7 inflected prepositions 62 | 11 (p.51), 12 (p.61) |
| 5 ה | 64 | 1 text «מחקר על הפסקת עישון» 65 · 2 מפני ש־/בגלל 66 · 3 text «המעשן» 68 · 4 copula (האוגד) 70 · 5 relative clauses (cont.) 72 · **6 pa'al ע״ו/ע״י — future** / חופשה באילת 73 · 7 ע״ו/ע״י — imperative 75 | 13 (p.65), 14 (p.68), 15 (p.74) |
| 6 ו | 76 | 1 text «ביקור במוזיאון» 77 · **2 pa'al — future (אפעול/אפעל) 80** · 3 pa'al — אפעול 81 · 4 speech acts: request or reproach — «אולי» + future 83 · 5 text «המונה ליזה שלי» 84 · 6 «אל» inflected 86 | 16 (p.77), 17 (p.84), 18 אל (p.86) |
| 7 ז | 88 | 1 text «נמל יפו» 89 · **2 pa'al — future ("a" type, אפעל) 92** · 3 סמיכות + ה הידיעה 93 · 4 «על» inflected 95 · 5 «עליי» + infinitive (= must) 96 · 6 קודם/אחר־כך 97 · 7 נמצא, נמצאת 98 · 8 connectives + verbs (review) 99 | 19 (p.89), 20 על (p.95) |
| 8 ח | 100 | 1 text «סלע אנדרומדה» 102 · 2 אפעול/אפעל review / יש עתיד באילת 103 · 3 speech acts — instructions in the future 105 · **4 hif'il — future 106** · 5 ואילו 108 · 6 connectives (review) 108 · 7 «מן/מ־» inflected 110 | 21 (pp.102–103), 22 (pp.103–104), 23 מן (p.110), 24 proverbs (p.111) |
| 9 ט | 112 | 1 newspaper ads «דרושים» 113 · 2 בעל + noun 115 · 3 CV (קורות חיים) 116 · 4 text «משורר, פילוסוף ומתמטיקאי» 117 · **5 pa'al פ״י — future 119** · 6 «אין» inflected (אינני, אינך) 121 | 25 (p.117), 26 אינני (p.121) |
| 10 י | 122 | 1 body parts / כואב ל־ 123 · 2 text «דבורה הטבעונית» 125 · 3 במשך 128 · 4 ארץ זבת חלב ודבש 128 · 5 לא…, אלא… 129 · **6 pa'al ל״ה — future** / כך כתוב במפת הכוכבים 131 · 7 אני רוצה ש + future 134 | 27 (p.125), 28 (p.128), 29 (p.132), 30 proverbs (p.135) |
| 11 יא | 136 | 1 text «המלחמה על העברית» 137 · **2 hitpa'el — all tenses** / כרטיס ביקור 142 · 3 אסור, מותר… + infinitive 147 · 4 «לפני», «אחרי» inflected 150 · 5 חזרה לאידיש 152 | 31 (pp.137–138), 32 לפני/אחרי (p.150), 33 (p.152), 34 proverbs (p.153) |
| 12 יב | 154 | 1 text «ראשית האלפבית» 155 · 2 verbal noun (שם פעולה) / העלייה של בוריס לישראל 159 · **3 nif'al (1) 163** · 4 סיפורה של אות 165 · 5 hitpa'el (2) — metathesis (שיכול אותיות) 166? | 35 (pp.155–156), 36 (p.161), 37 (p.165), 38 «איך להישאר צעיר» (p.167), 39 proverbs (p.169) |
| 13 יג | 170 | 1 text «מערות המסתור» 171 · **2 nif'al — passive** / אתר החרמון נפתח מחדש 176 · 3 the verb — summary exercises 179 · 4 «לשיר זה כמו להיות ירדן» / נעמי שמר 182 | 40 (pp.171–172), 41 (p.178), 42 song (p.182), 43 saying (p.185) |

Unit page ranges (for the per-page transcription queue): u1 8–17, u2 18–33, u3 34–49, u4 50–63, u5 64–75,
u6 76–87, u7 88–99, u8 100–111, u9 112–121, u10 122–135, u11 136–153, u12 154–169, u13 170–185.

### Counts

- 13 units · 13 vocabulary pages · 79 TOC sections (5+7+5+7+7+6+8+7+6+7+5+5+4) · 13 answer-key pages · 43 audio tracks + intro.
- Vocabulary entries: p.8 has ≈ 39 (14 verbs, 15 nouns, 6 adverbs, 2 phrases, 1 conjunction, 1 adjective); later
  pages are visibly denser. **Estimate 600–1000; the exact count comes from transcription — count, don't trust.**
- p.54 lists 16 pi'el verbs: לספר לדבר לקבל לבקר לבקש לטייל לסדר לעשן לטלפן לשלם לשחק לנגן לשרת ללמד לבשל לצלצל.

## 3. Future tense — the first track

Book order of the future-tense sections: pi'el (u4 p.54) → pa'al ע״ו/ע״י (u5 p.73, imperative p.75) → pa'al
אפעול/אפעל (u6 pp.80–81) → pa'al "a"-type אפעל (u7 p.92) → review (u8 p.103) → hif'il (u8 p.106) → pa'al פ״י
(u9 p.119) → pa'al ל״ה (u10 p.131) → hitpa'el, all tenses (u11 p.142) → nif'al (u12 p.163, u13 p.176). Related:
conditionals with the future (u4 p.56), time expressions (u4 p.57), «אולי» + future (u6 p.83), instructions in the
future (u8 p.105), אני רוצה ש + future (u10 p.134).

**p.54 (verified on the page)**: heading «בניין פיעל — זמן עתיד» / «Порода פיעל — будущее время». The TOC prints
the heading unpointed, so it is easy to misread as פעל. Russian explanation: the future is formed by adding
prefixes (and some suffixes) to the root; one prefix per person; the highlighted letters are א, ת, י, נ at the start
and ו, י at the end. Then a □□□ pattern table with the paradigm of לספר (root ס.פ.ר):
אֲסַפֵּר (אני) · תְּסַפֵּר (אתה) · תְּסַפְּרִי (את) · יְסַפֵּר (הוא) · תְּסַפֵּר (היא) · נְסַפֵּר (אנחנו) · תְּסַפְּרוּ (אתם-אתן) ·
יְסַפְּרוּ (הם/הן). **Book convention: no ־נָה forms** (אתן = אתם, הן = הם).
**p.55**: ex. 2.1 «כתוב את המשפטים האלה בעתיד» (rewrite in the future, 10 items); ex. 2.2 «כתוב את הפועל בצורה
ובזמן המתאימים: עבר, הווה, עתיד או שם הפועל» (the right form and tense, infinitive given under the blank).

### The teacher's sheets (photos sent 2026-10-09; my reading — confirm at G1)

**Method sheet** — pi'el future of לְדַבֵּר, as a person × number table (singular «ед. ч. ♂/♀», plural «мн.»):

| Person | Singular | Plural |
|---|---|---|
| 1st — «говорящий» | אני אֲדַבֵּר | אנחנו נְדַבֵּר |
| 2nd — «слушающий, присутствующий» | אתה תְּדַבֵּר · את תְּדַבְּרִי | אתם / אתן תְּדַבְּרוּ |
| 3rd — «отсутствующий в разговоре» | הוא יְדַבֵּר · היא תְּדַבֵּר | הם / הן יְדַבְּרוּ |

- Prefixes highlighted yellow (א ת י נ), suffixes orange (־ִי, ־וּ).
- Mnemonic: the prefix letter is boxed inside the pronoun: **א**ני → א, **א**תה/**א**ת/**א**תם/**א**תן → ת
  (the ת of the pronoun), **א**נחנו → נ.
- Rule (circled): the prefix takes **shva in every form except אני**. אני takes hataf-patah (אֲ).
- Method: **cut the infinitive's ל (or לה) and put the prefix in its place**: לְ|דַבֵּר → ־דַבֵּר → תְּדַבֵּר.
  The same root across binyanim, written at the bottom: לִלְבּוֹשׁ (pa'al), לְהַלְבִּישׁ → תַּלְבִּישׁ (hif'il),
  לְהִתְלַבֵּשׁ (hitpa'el).

**Task grid** — a blank table to fill in for a list of verbs. Columns (right to left): שם הפועל (инфинитив) |
שורש (корень) | אני | אתה | את | אנחנו | אתם | אתן | הוא | היא | הם-הן. Example row: לדבר / ד.ב.ר / … / יְדַבְּרוּ.
About nine rows. **The grid is for the future tense** (confirmed by Serhii 2026-10-09; its cursive header looked
like «זמן עבר» to me, which was wrong). The grid drill component still works for any tense.

## 4. Content model (for `src/content/schema.ts`)

Shared: `id`, `unit`, `sources: [{page}]` (≥ 1), `reviewStatus: draft | checked`, `flags: (unsupported | conflict
| unreadable)[]`, `notes?`. Hebrew strings are NFC. Every Hebrew form stores **`pointed`** (as printed, if printed)
and **`plain`** (ktiv male, as an Israeli adult writes it). `plain` is **not** the pointed form with the marks
stripped: stripping דִּבֵּר gives דבר, but people type דיבר. Answers match `plain`, the stripped `pointed`, and any
listed `variants`.

- **VocabEntry** `u04-v017`: `pos` (verb | noun | adjective | adverb | conjunction | preposition | phrase),
  `he` (as printed, e.g. «מַבְטִיחַ — לְהַבְטִיחַ ל-»), `lemma` (infinitive for verbs, singular for nouns),
  `present?` (verbs: the printed 3ms present), `ru` (the book's gloss), `en?` (added later, marked),
  `gender?` (ז → m, נ → f), `plural?` (ר marks plural-only or a printed plural), `government?` (ל־, את, על …),
  `verbId?`.
- **Verb** `v-dbr-piel`: `infinitive`, `root` (ד.ב.ר), `binyan` (paal | piel | hifil | hitpael | nifal | pual |
  hufal), `group` (shlemim | ayin-vav | ayin-yod | pe-yod | pe-nun | lamed-he | lamed-alef | gutturals | quad;
  pa'al future type efol | efal), `ru`, `government?`, `firstUnit`, and `forms` in the teacher's order:
  `past` {ani, ata, at, anachnu, atem, aten, hu, hi, hem}, `present` {ms, fs, mp, fp}, `future` {ani, ata, at,
  anachnu, atem (= aten), hu, hi, hem (= hen)}, `imperative` {ata, at, atem}. Each cell is {pointed, plain,
  variants?}. `checkedAgainst: [{page, cells[]}]` records which cells the book itself shows.
- **GrammarTopic** `u04-s2`: `titleHe`, `titleEn`, `pages`, `explanationEn` (markdown, a faithful rendering of the
  book's Russian; the teacher's method added where relevant and labelled), `tables` (rows × cols × cells),
  `examples [{he, en}]`, `verbIds`, `exerciseIds`, `audioTrack?`.
- **Exercise** `u04-ex2.1`: `page`, `number` («2.1»), `instructionHe`, `instructionEn` (via the instruction key
  pp.186–187), `kind` (transform | fill | conjugate-in-context | match | questions | open), `items [{label (א, ב…),
  prompt, hint? (e.g. the infinitive under the blank), tense? (the tense the item asks for: ex. 2.2 mixes past,
  present, future and infinitive), answers[] from the key, keyPage}]`, `gradable` (open questions → self-grade or
  skipped).
- **Text** `u01-t1`: `titleHe`, `pages`, `audioTrack?`, `paragraphs[]` (as printed), `glossRefs?`.
- **Proverb** `u01-p1`: `he`, `ru?/en?`, `page`, `audioTrack`.
- **PrepositionParadigm** `prep-al`: preposition × the nine pronouns (אליי, אליך …), `page`, `audioTrack?`.

## 5. Drill types (what each record feeds)

| Drill | From | Answer |
|---|---|---|
| Word → meaning | VocabEntry | reveal + self-grade |
| Meaning → word | VocabEntry (ru/en → he) | type Hebrew (`plain`) |
| Gender / plural / government | VocabEntry fields | tap choice |
| One form | Verb × tense × pronoun | type Hebrew |
| **Paradigm grid** (teacher's sheet) | Verb × tense: infinitive → root + 9 cells | type each cell, wrong cells requeue |
| Which form is this? | Verb form → tense + person (+ binyan later) | multiple choice |
| Book exercise | Exercise items + answer key | type (gradable) / self-grade |
| Preposition grid | PrepositionParadigm | the same grid component |
| Listen & read | Text + audio track | none in v1 (play, show/hide text) |

**Tense focus** (Serhii, 2026-10-09): a multi-select of tenses (Future / Past / Present / Imperative), default
Future only. It filters every verb drill and the tense-tagged exercise items; vocabulary is not affected. Progress
is kept per verb × tense, so switching the focus loses nothing. With several tenses on, drills interleave them.

## 6. Transcription method (session 2 onwards)

1. Render a page: `pdftoppm -f N -l N -r 300 -png` into `sources/pages/`. Crop vocabulary pages per column
   (`magick -crop`): the Hebrew is small and pointed.
2. Claude reads the crop and writes `sources/transcribed/pNNN.json` (records + a `raw` field with the page
   text). The vowel points must be exactly as printed; illegible spots become `?` and get flag `unreadable`.
3. Second pass: a fresh read of the same crop, diffed against the first; differences are resolved by re-reading
   at a higher zoom, never by guessing.
4. Units are independent, so unit batches can run as parallel subagents: repo files only, no MCP tools, each
   writing only its own pages.
5. Verb paradigms are generated as data for every verb in the vocabulary lists, then checked against every
   paradigm the book prints (tables, examples, answer key) before they become `checked` (G3).

Timing reference: p.8 at 150 dpi was readable for the headings and the layout; the pointed list itself needs
300 dpi crops.

## 7. Risks and open questions

- **Copyright**: the book and audio are © 1991 «Шефа». They must never reach the public repo in plaintext; they
  ship as encrypted bundles only (as in muscle-memory).
- **Pointed-Hebrew accuracy**: a wrong vowel point teaches a wrong form. Hence the two-pass reading, the
  `unreadable` flag, and G1 review by Serhii and/or his teacher.
- **Generated paradigms** can be wrong for weak roots (ע״ו, ל״ה, gutturals). They stay `draft` until checked
  against the book; the book's own tables win on any conflict.
- **English glosses**: the book glosses in Russian only. English glosses would be added text, marked as such
  (not in v1 unless Serhii asks).
- **iOS**: a Hebrew keyboard must be enabled (help screen). he-IL speech synthesis exists only if the device has
  a Hebrew voice — feature-detect, hide otherwise [assumption: verify on the iPhone].
- **Font**: Nunito has no Hebrew glyphs. A Hebrew font with full vowel-point support must render niqqud correctly
  in iOS Safari (check: לְהַבְטִיחַ, תְּדַבְּרִי, אֲדַבֵּר).
- **Audio size**: ~40 MB encrypted per track. Runtime-cache tracks on first play; do not precache all of them.
