# Shorashim

A personal Hebrew trainer for one learner working through «Шэат иврит, часть II» (level Bet): a
mobile-first PWA (React + Vite) with typed-answer drills, verb paradigm grids, an open-ended Leitner
scheduler and offline support. The book's text and recordings are **not** in this repository — they
ship only as AES-GCM-encrypted bundles in `public/data/` and are unlocked with a passphrase on the device.

Deployed from `main` to GitHub Pages by `.github/workflows/deploy.yml`.

## Commands

```sh
pnpm dev        # local dev server
pnpm test       # unit tests (answer normaliser, scheduler, crypto)
pnpm build      # typecheck + production build
pnpm e2e        # Playwright smoke in iPhone emulation (dummy bundle)
```

Content pipeline scripts live in `scripts/` and read local sources that are gitignored; see `CLAUDE.md`.
