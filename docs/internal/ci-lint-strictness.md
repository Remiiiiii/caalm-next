# Decision: ESLint must fail CI (not soft-pass)

**Status:** Accepted  
**Date:** 2026-10-16  
**Audience:** Engineering, Cursor agents  

## Decision

The **CI → Lint** job must **fail** when ESLint fails. Do not put `continue-on-error: true` back on that step.

## Why

When lint was allowed to “fail open,” style and safety warnings piled up and nobody noticed until something bigger broke. A red Lint check is the early warning light.

## What stays soft-fail

Roadmap **notify** steps in `run-tests.yml` may keep `continue-on-error: true`. Those ping an internal webhook after tests/deploy; a webhook blip must not fail the whole test or production deploy job.

## Current tooling

- Flat config: `eslint.config.mjs` (Next `core-web-vitals` + CAALM ignores)
- Runner: `pnpm run lint` → `scripts/run-eslint.mjs`
- ESLint **9.x** (10.x breaks `eslint-plugin-react` with this stack today)
- Noisy React Hooks Compiler rules are **warn** until cleaned; real errors still fail CI

## If Lint goes red

1. Read the ESLint output on the failing check.  
2. Fix the reported **errors** (warnings are debt — clear over time).  
3. Do **not** re-add `continue-on-error` on Lint to “get the PR green.”

## Local / CI command

`pnpm run lint` → `node scripts/run-eslint.mjs` (ESLint flat config: `eslint.config.mjs`, wrapping the old `next/core-web-vitals` rules).

## Related

- Workflow: `.github/workflows/ci.yml` job `lint`  
- Playbook overlooking: ESLint `continue-on-error`  
