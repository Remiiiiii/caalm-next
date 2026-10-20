@AGENTS.md

# Cursor rules

Project rules live in `.cursor/rules/` and are the single source of truth. Edit them there, not here.

## Always-on (`alwaysApply: true` in Cursor)

@.cursor/rules/general.mdc
@.cursor/rules/agent-workflow-principal.mdc
@.cursor/rules/graft.mdc
@.cursor/rules/security-rbac.mdc
@.cursor/rules/audit-narrative.mdc
@.cursor/rules/ai-document-extraction.mdc
@.cursor/rules/desktop-first.mdc
@.cursor/rules/no-workflow-engine-sprawl.mdc
@.cursor/rules/caalm-demo-database-sync.mdc
@.cursor/rules/env-example-placeholders.mdc
@.cursor/rules/vercel-env-local-permission.mdc
@.cursor/rules/plain-english-junior-dev.mdc
@.cursor/rules/plan-prompt-templates.mdc
@.cursor/rules/roadmap-pr-journey.mdc

## On-demand: read the file before working in its area

| Rule | Read when |
|------|-----------|
| `.cursor/rules/global-style-guide.mdc` | Any UI/UX work: styling, page structure, components (`*.tsx`, `*.css`) |
| `.cursor/rules/api-route-authz.mdc` | Creating or editing `src/app/api/**/route.ts` |
| `.cursor/rules/appwrite-collection-ids.mdc` | Touching Appwrite collection/table/bucket IDs (`src/lib/appwrite`, `src/lib/database`, `scripts`, `.env*.example`) |
| `.cursor/rules/writing.mdc` | Writing product or marketing copy (`docs`, `src/content`, `public`) |
| `.cursor/rules/media-hosting.mdc` | Adding or changing video/image assets, `src/lib/media/urls.ts`, page backgrounds |
| `.cursor/rules/nonprofit-roadmap-prs.mdc` | Nonprofit Roadmap batch PRs (`src/lib/roadmap/nonprofit*`, `src/lib/roadmap/npo-batches`) |
| `.cursor/rules/platform-readiness-roadmap-prs.mdc` | Platform Readiness Roadmap batch PRs (`src/lib/roadmap/platform-readiness*`) |
| `.cursor/rules/share-give-page.mdc` (+ `share-give-page-design.txt`) | Editing `DonationPageShareCard.tsx` or `DonationPageSettingsClient.tsx` |

## Not loaded

- `system-prompts-and-ai-model-tools.mdc`: a copy of Cursor's own agent system prompt ("You operate in Cursor", Cursor tool names). Not applicable to Claude Code.
- `senior-coach.mdc.paused`: paused.

# Cursor ↔ Claude Code parity

`.cursor/` is the source of truth. Claude Code mirrors it as follows; when something is added to `.cursor/`, add its mirror here.

| Cursor | Claude Code |
|--------|-------------|
| `.cursor/rules/*.mdc` | `@` imports / on-demand table above |
| `.cursor/prompt-templates/` | Used in place, via `plan-prompt-templates.mdc` |
| `.cursor/skills/*`, `.agents/skills/*` | Directory junctions in `.claude/skills/` (gitignored; recreate with `New-Item -ItemType Junction`) |
| `.cursor/commands/code-review.md` | `/caalm-review` (renamed: `/code-review` is a Claude Code built-in) |
| `.cursor/commands/ui-ux-check.md` | `/ui-ux-check` |
| `.cursor/hooks.json` (Graft) | `.claude/settings.json` hooks + statusline, from `graft init --no-agents` |
| `.cursor/mcp.json` (graft) | `.mcp.json` (gitignored by `*.mcp.json`) |
| `~/.cursor/mcp.json` + Cursor plugin MCPs (figma, notion, playwright, slack) | User-scope servers in `~/.claude.json` (`claude mcp list`) |
| `~/.cursor/hooks.json` (ponytail) | `ponytail@ponytail` plugin from the local `~/Development/ponytail` clone |
| `~/.cursor/skills/*` | Junctions in `~/.claude/skills/` (project copies of `ui-ux-pro-max` and `thermo-nuclear-code-quality-review` win) |
| `.cursor/rules/global-style-guide.mdc` (design rules) | `design-system-inventory.md` documents the same tokens/components; update both when shared UI changes (card titles, tables, switches, bulk dock, bars) |
| Cursor review loop (`agent-workflow-principal.mdc`: api-authz, targeted unit tests, Playwright smoke) | Same loop in Claude Code, recorded in the auto-memory feedback "run tests after changes"; use `graft` first (`graft.mdc`) |
| Cursor built-in skills (`review`, `review-security`, `loop`, `create-skill`, `statusline`, …) | Claude Code built-ins: `/code-review`, `/security-review`, `/loop`, `skill-creator`, `/statusline` |

Not mirrored: the `github` MCP server (disabled in Cursor; needs a fresh token), and skills bundled inside Cursor marketplace plugins (Claude Code has official plugins for figma, github, notion, playwright, slack via `/plugin`).
