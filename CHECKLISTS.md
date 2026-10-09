# Checklists

## Toolchain preflight
- `tesseract --list-langs` includes the content language(s); poppler tools; `ffmpeg`; node ≥ 24; pnpm ≥ 10.
- `gh auth status` → SerhiiKizenko with `repo` + `workflow` scopes.
- `.env.local`: `TRAINER_PASSPHRASE`, `MATERIALS_DIR`. Never print either; check with `grep -c '^NAME='`.
- `.gitignore` before `git init`: `node_modules/ dist/ dev-dist/ /content/ /sources/ .env.local
  .env.*.local KICKOFF-PROMPT.md playwright-report/ test-results/ *.log .DS_Store`.

## Fork the sibling project
```sh
rsync -a --exclude .git --exclude node_modules --exclude content --exclude sources \
  --exclude 'public/data' --exclude 'public/data-test' --exclude KICKOFF-PROMPT.md --exclude .env.local \
  ~/work/personal/muscle-memory/ ./
pnpm install && pnpm test && pnpm build
```
Then rename: `package.json` name, `vite.config.ts` base + manifest, `index.html` title/short name,
`README.md`, `CLAUDE.md`, `public/icon.svg` (+ `pnpm icons`), `src/ui/Help.tsx`, e2e driver ids.
`gh repo create SerhiiKizenko/<name> --public --source=. --push`, then
`gh api -X POST repos/SerhiiKizenko/<name>/pages -f build_type=workflow`.

## Content rules (per card)
- Prompt from the backbone verbatim; answer in the course's own terminology; lists complete, in source order.
- ≥ 1 source `{file, page}` (PDF page). `checked` only with pages. Marks: «⚠︎ не подтверждено в
  материалах» + flag `unsupported`; «⚠︎ нет в материалах — проверить» + flag `stub`.
- Conflicts: primary source named by the backbone wins; note it in `notes`.
- `examLine` one spoken sentence; `facts[]` 3–8 atomic statements (for drills).
- `pnpm validate` green before every `pnpm encrypt`; commit `public/data/*` only.

## Gates
- G1: ~10 verified cards across clusters (wording, length, one-liner) — before mass verification.
- G2: deployed skeleton on the learner's device: passphrase, Home Screen, offline, Backup round trip.
- G3: 5 generated drill items with distractors — before generating all.

## Verification of a deploy
- `gh run watch <id> --exit-status`; `curl -I <live>/data/manifest.json` → 200.
- Decrypt the live bundle locally (script reading `.env.local`, printing counts only).
- `pnpm e2e` (WebKit iPhone) green; then drive the live site via Chrome MCP at phone width and desktop
  width: unlock (dummy bundle), today → reveal → grade good/again, topic, mock, weak, settings theme,
  reload persistence, SW precache (`caches.match('/<base>/data/bundle.enc')`), console errors.
- Not automatable: Share sheet backup, Restore file picker, airplane mode → learner's device (G2).
