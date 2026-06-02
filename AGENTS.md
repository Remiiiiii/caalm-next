# AGENTS.md

## Cursor Cloud specific instructions

### Product

CAALM Solutions — Next.js 16 contract/license/compliance dashboard (Appwrite backend, port **3000**).

### Dependency refresh (automatic)

The VM update script runs `pnpm install` in this repo. See workspace-level notes in sibling repos if you work across the multi-repo `/agent` layout.

### First-time local env (manual, not in update script)

1. Copy `.env.example` → `.env.local` (or run `node scripts/setup-dev.js` for a minimal `.env.local` stub, then merge real Appwrite IDs).
2. Real E2E and authenticated flows need GitHub/VM secrets for Appwrite, Microsoft OAuth, Twilio, etc. (see `.github/workflows/run-tests.yml`).

### Running services

| Service | Command | Port |
|---------|---------|------|
| Next.js dev | `pnpm dev` | 3000 |

Use **tmux** for long-running dev (`pnpm dev` with Turbo). Do not rely on one-shot background shells.

### Lint / test / build

| Task | Command | Notes |
|------|---------|-------|
| ESLint | `pnpm lint` | Requires legacy config; ESLint 10 may error without `eslint.config.js` — use Biome as fallback |
| Biome | `pnpm run lint-check` | May report existing repo issues |
| Unit tests | `pnpm run test:unit -- --run` | Vitest; some chart tests may fail on current main |
| E2E | `pnpm test:e2e` | Needs `pnpm exec playwright install chromium` once per VM |
| Production build | `pnpm build` | Needs valid Appwrite env for some routes |

### Non-obvious gotchas

- **pnpm only**: `preinstall` enforces `only-allow pnpm` (use `corepack prepare pnpm@9.15.9 --activate`).
- **Ignored native builds**: `sharp`, `tesseract.js`, etc. may need `pnpm.onlyBuiltDependencies` + `pnpm rebuild` if image/OCR features break.
- **Hot reload**: New dependencies often need a dev server restart; Turbo HMR does not always pick up new native modules.
- **User rule conflict**: Repo `.cursor/rules/general.mdc` says not to start the app in the user's local machine — in **Cloud Agent** sessions you should start `pnpm dev` yourself to verify changes.
