# Lessons from muscle-memory (2026-10-09) — read before session 1 and session 2

Each line: what happened → what to do instead.

## Repo hygiene (public repo)
- The kickoff prompt landed in the first commit → add `KICKOFF-PROMPT.md` to `.gitignore` **before**
  `git init`, together with `/content/`, `/sources/`, `.env.local`.
- `.gitignore` pattern `content/` also ignored `src/content/` → CI could not build. Use root-anchored
  `/content/` and `/sources/`.
- The learner's first name leaked through a materials path in a comment and the review queue → keep
  the materials path only in `.env.local` (`MATERIALS_DIR`) and refer to "the learner" in tracked files.
- `pnpm import` is a pnpm built-in (it deleted `pnpm-lock.yaml`) → name scripts `import-answers`, etc.
- Secrets check before every commit: `git diff --cached --name-only | grep -E 'content/|sources/|\.env'`.

## Pipeline
- Dedupe by md5 first: 90 PDFs collapsed to 43 sources; every seminar copy was byte-identical to the
  lecture folder copy. Pick one canonical folder and ignore the rest.
- Count backbone items yourself from the extracted sheet (brief said 42 muscles; the sheet had 41; the
  brief said question 64 was missing from the draft; it was present).
- Extract per page by splitting `pdftotext -layout` output on form feeds → exact page citations.
- OCR is fast: 643 slide pages at 300 dpi with 4 jobs ≈ 15 min. Queue by usefulness, run in background,
  make it resumable (skip existing pages). Atlas (600+ pp): OCR the TOC first, then only the sections.
- A `find` tool over extracted + OCR text (Unicode-aware regex, prints `slug p.N: line`) was the single
  most-used verification tool. JS `\b` is ASCII-only: use `(^|\s)word(?=\s|$)` for Cyrillic.
- NotebookLM drafts carry artefacts: citation digits glued to words («бедра8», «20–30°14»), ` z.` tails,
  `$` where arrows were. Clean with a logged report, never silently.
- Draft answers were right on structure and wrong on specifics (synergists/antagonists, timing,
  element lists). Verify against the primary source named by the backbone (here the atlas), not the
  secondary textbook.
- Verification batches as TS patch files (`content/verified/<batch>.ts`) applied by a script beat editing
  JSON by hand: reviewable, re-applicable after a re-import, typed.
- Cite PDF page numbers, not book pagination (they differ); say so in CONTENT-RULES.

## Crypto / app
- Put PBKDF2 iterations in the file header: the app otherwise cannot open a bundle made with a different
  count (the test bundle uses 20k, production 210k).
- Keep one salt per project in `public/data/salt.json` so cached device keys survive content updates;
  deterministic IV = SHA-256(salt‖plaintext) so unchanged content does not churn git.
- Scope the cached key and the progress store by data directory, or a test bundle opened in the same
  browser profile wipes the real cached key and pollutes progress.
- vite-plugin-pwa under pnpm needs `workbox-window` as a direct dependency.
- A `Card` component with a default `bg-surface` plus a caller's `bg-*` class = stylesheet order decides,
  not props → the primary call-to-action rendered white on white in light mode. Let callers override.
- Dark mode: pastel fills need dark text; add an `on-accent` token instead of `text-white`.
- A study screen keyed to the route element kept the previous session when the mode changed via URL →
  `key={pathname + search}` on the route element.
- A one-card daily quota in the dummy bundle finishes the session after one grade; write the smoke test
  around the real quota math, and exercise topic mode for requeue.
- Vitest exits 1 with zero test files → CI fails until the first test exists.

## Process
- Playwright WebKit (iPhone 13) + a committed dummy bundle (`?data=data-test`, public passphrase)
  gives a real end-to-end smoke in CI without the secret. Driving the live site through Chrome MCP found
  three more bugs the smoke could not (contrast, scoping, blank card) → do both.
- Home screen needs a visible "start here" and a permanent help screen; a hint that disappears after the
  first card is not enough (feedback from Serhii on day 1).
- Daily plan math: new/day = remaining ÷ (days − 4); 278 cards over 14 days = 28/day plus reviews,
  ~1–1.5 h/day by day 5. Tell the learner up front.

## Scanned non-Latin books (Hebrew trainer, 2026-10-09)
- tesseract heb+rus on a pointed-Hebrew page with mixed RTL/LTR columns produced unusable text (wrong letters,
  interleaved columns) → render pages/crops and transcribe with Claude vision, two passes, flag unreadable spots.
- An unpointed TOC hid the binyan (פיעל read as פעל) → verify every heading on its own page, not from the TOC.
- macOS filenames are NFD (Cyrillic «Й», Hebrew points decomposed) → `normalize('NFC')` before parsing/comparing.
- Language courses need typed answers checked against the plain (ktiv male) spelling, not the pointed form with
  the marks stripped (דִּבֵּר → "דבר", but people type "דיבר"): store both.
