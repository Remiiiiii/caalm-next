# Cursor rules — read order (consolidated)

**Status:** Accepted  
**Date:** 2026-10-16  
**Audience:** Engineering, Cursor agents  

## Decision

1. **One spine:** `agent-workflow-principal.mdc`  
2. **One UI book:** `global-style-guide.mdc` (dialogs, buttons, inputs, segmented switches, Tailwind colors, glass cards)  
3. **One chat voice:** `plain-english-junior-dev.mdc`  
4. **Always-on = safety + habits only** — not style encyclopedias  

Deleted as overlaps: `dialog-best-practices`, `button-placement`, `segmented-switch`, `input-field-borders`, `tailwindcss-best-practices`, stub `react`/`radix`/`vite`/`zod`/`typescript`/`react-query`/`react-hook-form` best-practice files, and `rules.mdc` (merged into `general.mdc`).

## Context order

1. Graft  
2. `agent-workflow-principal.mdc`  
3. Matching scoped rule(s) only  
4. `@`-reference real files  

## Always-on

| Rule | Role |
|------|------|
| `agent-workflow-principal.mdc` | Spine |
| `graft.mdc` | Context before grep |
| `security-rbac.mdc` | No bypasses |
| `caalm-demo-database-sync.mdc` | Demo parity |
| `plain-english-junior-dev.mdc` | Chat voice |
| `general.mdc` | Stack, logging, cleanup, DB MCP pointer |
| `system-prompts-and-ai-model-tools.mdc` | Hard chat/edit behaviors |
| `vercel-env-local-permission.mdc` | Protect `.env.local` |
| `env-example-placeholders.mdc` | No secrets in examples |
| `desktop-first.mdc` | Phones = companion |
| `no-workflow-engine-sprawl.mdc` | No second workflow product |
| `ai-document-extraction.mdc` | AI-on-documents |
| `audit-narrative.mdc` | Who/what/when/tenant on material writes |
| `plan-prompt-templates.mdc` | Plan templates |
| `roadmap-pr-journey.mdc` | Roadmap journey footer |

## File-scoped keepers

| Rule | When |
|------|------|
| `global-style-guide.mdc` | UI source files |
| `api-route-authz.mdc` | `src/app/api/**/route.ts` |
| `appwrite-collection-ids.mdc` | Appwrite config / schema / env examples |
| `writing.mdc` | Docs / content / marketing copy |
| `nonprofit-roadmap-prs.mdc` / `platform-readiness-roadmap-prs.mdc` | Those roadmap paths |
| `media-hosting.mdc` / `share-give-page.mdc` | Those features |

## Conflicts

- Chat → `plain-english-junior-dev.mdc` (not `writing.mdc`)  
- UI → `global-style-guide.mdc` only  
- Security → `security-rbac.mdc` + `api-route-authz.mdc` for routes  
