# Evidence Matrix unification — handoff (PR #305)

Branch: `cursor/todo/3-3.1-wire-evidence-readiness-matrix-into-file`

**Status at handoff (updated, round 5): Phases 1–4 done. Phase 2 is complete for this PR (core tables, detail page, confirm-link, and matrix list columns). Phase 5 not started (deliberately deferred). Phase 6 (nav item) was explicitly rejected by the user — do not re-add.**

### Round 5 update

- **Evidence Matrix list columns** on `/audit-lab/evidence` (the
  `surface === "evidence"` table in `AuditLabClient`): Statement, Document,
  and Test result, plus an amber "Statement only" pill when a requirement has
  testimonial links and no documentary link. Rows filter to the selected
  simulation. Link data comes from
  `GET /api/audit-lab/evidence?sessionId=…` → `linkSummaries` (pure helper
  `summarizeEvidenceLinks` in `evidence-link-summary.ts`).
- **Confirm AI-suggested link** is wired end-to-end: detail page
  `ConfirmEvidenceLinkButton` → POST `confirm_link` → `confirmEvidenceLink`.
- Phase 5 (sign-off/lock/export) and Phase 6 (Files nav) still out of scope.

### Round 4 update

- **Built out the evidence detail page**
  (`src/app/(root)/audit-lab/evidence/[itemId]/page.tsx`) — the one gap
  flagged at the end of round 2. It now renders two sections per evidence
  request:
  - **"Already on file"** — contracts/licenses tagged org-wide (readiness
    evidence map's existing tagging feature,
    `src/lib/audits/readiness/record-tags.ts`) as evidence for this same
    requirement. Added `listTagsForRequirement(orgId, requirementId)` there
    (no such query existed; existing ones were by-record or by-org, not
    by-requirement) and `getEvidenceItem` in `repository.ts` (mirrors the
    existing `getEvidence` getter).
  - **"From this interview"** — the session-scoped `AuditLabEvidenceLink`
    rows from Phase 3 (documentary/testimonial, contradicts flag,
    AI-suggested/unconfirmed badge).
  Live-verified on a real evidence item: both sections render their correct
  empty states with no errors.
- **Deliberate architecture decision on "migrate existing tags":** the
  original plan said "existing contract/license tags become links with
  `source: existing_record`." I did **not** do a literal one-time data
  migration copying tag rows into `audit_lab_evidence_links`, because that
  table is session-scoped (`sessionId` required) while tags are an org-wide,
  ongoing, mutable fact — copying them into one session's link table would
  misrepresent them as session-specific and go stale the moment a tag
  changes. Instead this is a **query-time merge**: the detail page queries
  both sources live and displays them side by side. This is more correct and
  needs no migration script, no backfill, and no staleness handling.
- **Phase 6's nav item was removed** (prior round, still in effect). The
  user pointed out it's unnecessary — `/audit-lab/evidence` is already
  reachable from within Audit Lab itself (the "Evidence Matrix" tab), so a
  second entry point in the Files sidebar was redundant. Reverted
  `src/constants/navigation-permissions.ts` and
  `tests/rbac/navigation-permissions.test.ts` to clean `main`. **Do not
  re-add this nav item** unless asked again.
- The "Generate from Evidence Matrix" button (Phase 1 UI fix) lives in
  **Audit Lab → Interview Builder tab**, next to the existing "Generate
  questions" button.

### Round 2 updates (corrections to the original handoff above)

- **Phase 1 is now live-verified**, not just unit-tested: clicked "Generate
  evidence list" and the new "Generate from Evidence Matrix" button (added
  this round) against the real dev server. Confirmed real matrix requirement
  rows appear (e.g. "Credentialing and privileging documentation sample",
  "Active provider / lead-agency service contract") coexisting cleanly with
  the old `CC6`/`CC8`/`CC1` legacy rows — dedup by title means nothing was
  destroyed or duplicated.
- **The original handoff's Phase 1 UI gap is closed**: `generateQuestionBank`
  had a `source` param but no UI control to set it to `"matrix"`. Fixed:
  `src/app/api/audit-lab/interview/route.ts` now passes `body.source` through;
  `src/components/audit-lab/AuditLabClient.tsx`'s Interview Builder tab has a
  new "Generate from Evidence Matrix" button next to the existing "Generate
  questions" one.
- **Phase 6 was NOT actually blocked** — the original handoff assumed
  `/audit-lab/evidence` needed to be built from scratch (Phase 2's UI half).
  It already exists as a real, shipped page
  (`src/app/(root)/audit-lab/evidence/page.tsx`, gated on
  `PERMISSIONS.AUDIT_LAB.VIEW` via `getLabServerContext`) — it's the existing
  per-session evidence-requests table, already labeled "Evidence Matrix" in
  its own UI. So the nav item was safe to add after all:
  `src/constants/navigation-permissions.ts`'s Files section now has an
  "Evidence Matrix" item → `/audit-lab/evidence`, gated by
  `PERMISSIONS.AUDIT_LAB.VIEW`. Live-verified in the sidebar. Tests added to
  `tests/rbac/navigation-permissions.test.ts`.
- **Found and fixed one real, pre-existing latent bug** (not something I
  introduced, but exposed by adding explicit return-type annotations — see
  below): `src/app/api/audit-lab/practice/route.ts`'s `"start_voice"` and
  `"pause"` actions did `if (result.error)` against a return type where not
  every union member has an `error` property — structurally invalid, only
  "worked" because `startVoicePracticeRound`/`pauseVoiceInterview` had no
  explicit return-type annotation and TypeScript's inference silently widened
  past the mistake. Added explicit return types to both functions in
  `service.ts` (good practice regardless) and fixed the two call sites in
  `route.ts` to use `"error" in result` — the correct, inference-independent
  narrowing idiom. No behavior change, pure type-correctness fix.
- **Still genuinely open, confirmed by checking the evidence detail page**
  (`src/app/(root)/audit-lab/evidence/[itemId]/page.tsx`): it has zero
  awareness of the new `AuditLabEvidenceItem`/`AuditLabEvidenceLink` tables —
  still only shows the plain `EvidenceRequest` fields (title, status, owner,
  due date). Surfacing "documentary evidence attached" / "testimonial
  claimed, unconfirmed" there is real remaining Phase 2 UI work, not done
  this round.

### Original handoff (round 1) below, left intact for context

## Why this PR grew beyond its original scope

PR #305 started as "add a sidebar nav item linking to the Readiness Evidence
Map." While scoping it, the user flagged that Audit Lab already has its own,
separate evidence tracking (`evidence_requests`, seeded from 3 hard-coded SOC2
placeholders) that never talks to the real Readiness Evidence Map
(`audit_evidence_map`, real HRSA/OSV, CW monitoring, financial PBC
requirements). A research pass (`/tmp` report, see commit history around this
doc) concluded this is a **gap-fill between two already-shipped systems**, not
a new feature, and proposed a 6-phase plan to unify them. The original nav-item
work was reverted; this doc is the record of implementing that 6-phase plan.

## What's actually done

### Phase 1 — shared requirement ID (done)
No new schema needed — discovered that `review_questions.controlRef` (32
chars) and `evidence_requests.controlRef` (64 chars) were already wired
end-to-end through the voice rubric → LiveKit worker pipeline, and real
requirement IDs (e.g. `"CW-PROVIDER-CONTRACT"`, ~21 chars) fit comfortably.
`controlRef` now carries the real requirement ID for matrix-sourced rows
instead of a `"CC6"/"CC8"/"CC1"` stub.

- `src/lib/audit-lab/service.ts`:
  - `generateEvidenceRequestList` now sources rows from `listEvidenceMap()`
    (the readiness evidence map) instead of 3 hard-coded seeds, via the
    previously-dead `mergeEvidenceSeeds` helper (`evidence-merge.ts`) — wired
    it in instead of writing a third copy of the same dedup logic.
  - `generateQuestionBank(actor, sessionId, source: "template" | "matrix")` —
    new optional third param. `"matrix"` generates one question per evidence-map
    requirement, tagging `controlRef` with the real requirement ID. Default
    stays `"template"` (old behavior), so this is backward compatible.

### Phase 2 — evidence repository (core tables only; no dedicated UI)
Two new Appwrite tables, added to `scripts/provision-audit-lab-schema.mjs`
(idempotent, diffs existing collections) and **already applied** to both prod
and the `caalm-demo` database:

- `audit_lab_evidence_items` (`69c4b201001f4e8c210b`) — one row per file/
  existing-record, independent of which requirement(s) it supports.
- `audit_lab_evidence_links` (`69c4b201001f4e8c210c`) — many-to-many join:
  item ⇄ requirement, with `evidenceType` (documentary/testimonial/
  observational), `relation` (supports/contradicts), `aiSuggested` +
  `confirmedByUserId`. `itemId` is **optional** — a pure testimonial link (a
  spoken claim, nothing attached yet) has no file behind it, only
  `transcriptTurnId`.
- `evidence_requests` got one new optional column: `testResult` (enum:
  not_tested/no_exception/exception/deficiency) — kept deliberately separate
  from the existing `status` (collection workflow) field, per the doc's
  warning that conflating "we accepted the file" with "the control passed"
  is the most common evidence-matrix modeling mistake.

Types: `AuditLabEvidenceItem`, `AuditLabEvidenceLink`,
`EvidenceTestResult`/`EVIDENCE_TEST_RESULTS` in `src/lib/audit-lab/types.ts`.
Repository CRUD: `createEvidenceItemRow`, `createEvidenceLinkRow`,
`updateEvidenceLinkRow`, `listEvidenceLinks` in `src/lib/audit-lab/repository.ts`.

**Not built**: a dedicated `/audit-lab/evidence` matrix *page* (one row per
requirement, columns for interview statements/documents/status/test
result/reviewer). This was the explicit Phase 2 UI deliverable in the
original plan and is still open — see "What's left" below.

### Phase 3 — wire in the live interview (done)
- `src/lib/audit-lab/service.ts`:
  - `recordVoiceTurn` now creates a **testimonial** evidence link (`relation:
    "supports"`, `aiSuggested: true` only when `citedEvidence` text was given)
    tying the spoken answer to its requirement — a spoken answer is logged as
    a *claim*, never treated as proof by itself.
  - `markAttachmentAttached(rowId, sha256?)` — now takes an optional hash,
    creates a **documentary** evidence item + link, and (via
    `updateEvidenceStatus` with a synthesized `"system"` actor, so the
    existing sensitive-item gate and status log still apply) moves a matching
    `evidence_request` to `"submitted"`.
  - `src/lib/audit-upload/run-attachment-upload.ts` now computes a SHA-256 of
    the uploaded bytes (reusing the existing `hashAuditContent` utility —
    nothing new needed there) and passes it through.
- UI chip: `src/lib/audit-lab/voice/coverage.ts`'s `buildCoverageSnapshot` gained
  an optional `documentedIds` param → each `CoverageSnapshotItem` now carries
  `hasDocument: boolean`. `src/contexts/AuditLabCallContext.tsx`'s two call
  sites (realtime turn update + session-state seed on reconnect) compute this
  from the transcript turns already in scope (`kind: "attachment"` +
  `attachmentStatus: "attached"`). `src/components/audit-lab/voice/RubricPanel.tsx`
  renders a "Document ✓" (green) vs "Statement only" (amber) chip per rubric
  row that `requiresEvidence`.

### Phase 4 — gaps/findings (done, minimal schema)
- `src/lib/audit-lab/findings.ts` (new, tested) — `review_gaps` has no
  condition/criteria/cause/effect columns and the house convention
  (confirmed via a code comment in `service.ts`) is to avoid new columns in
  favor of existing free-text fields. So the five-attribute finding (minus
  `recommendation`, left to a human reviewer) is composed into
  `description` with a parseable `"[requirement:<id>] Criteria: … | Condition:
  … | Cause: …"` prefix. `gapRequirementId()` parses it back out.
- `service.ts`'s new `raiseGapsForUncorroboratedRequirements`, called from
  `finalizeVoiceInterviewAttempt` right after scoring: for every rubric item
  that `requiresEvidence` and has a requirement ID, checks
  `listEvidenceLinks(..., requirementId)` for a documentary link — if none
  exists (regardless of how strong the verbal answer sounded), raises a gap
  and pushes the matching `evidence_request` to `"follow_up_requested"`.
  Gaps **never** touch `computeLiveReadinessScore` (confirmed scoped to real
  contract/license data only) — they're rehearsal findings, not live
  compliance findings.

### Schema changes — already live
`scripts/provision-audit-lab-schema.mjs` is the idempotent schema-diff tool
(direct Appwrite REST + API key from `.env.local`, not MCP/Console). Ran
`--apply` then `--apply --demo` — **both already applied**, re-running the
script now shows everything as `=` (no pending diff). `.env.example` updated
with the two new collection-id env vars (both have hardcoded ID fallbacks in
`config.ts`, so no `.env.local` change was required for this to work).

## What's left (not started)

**Phase 2**: done for this PR (tables, detail page with query-time tag merge,
confirm-link, matrix list columns). No literal tag → link migration (by
design; see Round 4).

**Phase 5 (not started)** — reviewer sign-off/lock/export binder. Deliberately
**not rushed**: this is a genuine new, data-integrity-sensitive feature
(preparer ≠ reviewer, sign-off goes stale on edit, session lock at
`report_ready`, append-only after, 5-year retention + legal-hold flag,
export binder with a SHA-256 manifest). `hashAuditContent` (already reused in
Phase 3) is the hashing primitive to reuse again for the manifest. Needs its
own design pass, not a bolt-on.

**Phase 6** — Files sidebar nav item. Explicitly rejected; do not re-add.

## Known risk / things to double check

- `markAttachmentAttached`'s and `raiseGapsForUncorroboratedRequirements`'s
  evidence-status transitions use a synthesized `{ userId: "system", name:
  "System", email: "", orgId }` actor for `updateEvidenceStatus` calls (no
  human drove them). This reuses the existing audit-log call (`audit(actor,
  ...)` inside `updateEvidenceStatus`), so "System" will show up in that
  org's audit trail for these transitions — confirm that's acceptable, or
  give it a more specific label.
- No direct unit tests exist for `generateEvidenceRequestList`,
  `generateQuestionBank`, `markAttachmentAttached`, `recordVoiceTurn`'s new
  branches, or `raiseGapsForUncorroboratedRequirements` — these are
  Appwrite-orchestrating functions in `service.ts`, and this codebase has no
  precedent of unit-testing that layer directly (no `service.test.ts` exists
  for any of its ~70 functions); only its pure helper modules
  (`evidence-merge.ts`, `coverage.ts`, now `findings.ts`) are tested, which is
  what this PR followed. A live smoke test (start a session, generate a
  matrix question bank, run a voice interview, attach a document, finalize)
  has **not** been done — only `tsc --noEmit` and the existing + new unit
  tests have been verified.
- `requirementIdForQuestion()` (new private helper in `service.ts`) does a
  full `listQuestions()` scan per call — fine at today's volumes, but if a
  session ever has hundreds of questions this is an easy future optimization
  (pass the already-fetched `questions` array through instead of refetching).

## Test status at handoff

- `npx vitest run src/lib/audit-lab/ src/lib/audits/readiness/` — 46/46 pass.
- `npx vitest run src/lib/assistant/tools/auditLabTools.test.ts` — 7/7 pass.
- `npx vitest run tests/roadmap/pto/audit-lab-*.test.ts tests/it/` — 15/15 pass.
- `npx tsc --noEmit -p tsconfig.json` — clean except 4 pre-existing, unrelated
  errors confirmed via `git stash` diff (StepUpOtpDialog.tsx,
  AuditUploadForm.tsx ×2, content-hash.ts, upload-list-summaries.ts) — none
  in files this PR touches.
- `npx biome check` on all touched files — clean (two real formatting nits in
  new files auto-fixed via `--write`; the rest were pre-existing CRLF-vs-LF
  noise unrelated to this change, confirmed via stash).

## Files changed (current full set, through round 5)

`navigation-permissions.ts` and its test are back to clean `main` — the nav
item was added in round 2 and removed in round 3. Not listed below since
there's no diff.

```
M  .env.example
M  scripts/provision-audit-lab-schema.mjs
M  src/app/(root)/audit-lab/evidence/[itemId]/page.tsx
M  src/app/api/audit-lab/evidence/route.ts
M  src/app/api/audit-lab/interview/route.ts
M  src/app/api/audit-lab/practice/route.ts
M  src/components/audit-lab/AuditLabClient.tsx
M  src/components/audit-lab/voice/RubricPanel.tsx
M  src/contexts/AuditLabCallContext.tsx
M  src/lib/appwrite/config.ts
M  src/lib/audit-lab/repository.ts
M  src/lib/audit-lab/service.ts
M  src/lib/audit-lab/types.ts
M  src/lib/audit-lab/voice/coverage.ts
M  src/lib/audit-lab/voice/coverage.test.ts
M  src/lib/audit-upload/run-attachment-upload.ts
M  src/lib/audits/readiness/record-tags.ts
?? src/components/audit-lab/ConfirmEvidenceLinkButton.tsx
?? src/lib/audit-lab/evidence-link-summary.ts
?? src/lib/audit-lab/evidence-link-summary.test.ts
?? src/lib/audit-lab/findings.ts
?? src/lib/audit-lab/findings.test.ts
?? docs/internal/evidence-matrix-unification-handoff.md   (this file)
```

Nothing has been committed or pushed — all of the above is uncommitted working-tree state on the branch.

## Suggested next steps, in order

1. ~~Live smoke test Phase 1~~ — done.
2. ~~Build out the evidence detail page~~ — done (round 4).
3. ~~Confirm AI-suggested link~~ — done (round 5).
4. ~~Matrix list Statement / Document / Test result columns~~ — done (round 5).
5. Live smoke test Phases 3–4: run a short voice interview on a
   matrix-generated question, attach a document mid-call, finalize, and
   confirm RubricPanel chip + gaps + detail "From this interview" + matrix
   list columns. Needs a human LiveKit session.
6. Design Phase 5 (sign-off/lock/export) as its own piece of work.
7. Commit, open/update the PR, run `pnpm run test:api-authz`, get Vercel
   preview + Playwright green before merge (per the PR's own test plan).
