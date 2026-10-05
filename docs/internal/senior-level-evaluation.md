# Senior-level evaluation: Remi / CAALM

**Repo analyzed:** `caalm-next` only (12 months of git + this Cursor chat).  
**Chat corpus:** this thread and related agent work; local agent-transcripts folder returned empty — chat confidence is **medium-low** outside this session.  
**Not assessed:** other repos, pair reviews from teammates, production incident history, customer interviews.

---

## 1. Executive summary

You are shipping a real multi-tenant SaaS (Software as a Service) at founder velocity: ~504 human commits + ~168 Cursor Agent commits in 12 months, with a sharp Aug–Sep 2026 spike. That is mid-to-senior **output**, not beginner output.

The blocker to a clean **senior** label is not “can you build features.” It is **control of complexity under AI leverage**: ~32 files/commit (30d Remi sample), PRs like #178/#181/#182 at 5k–6.7k+ lines, God files (`OutlookStyleCalendar.tsx` ~4k lines, `user.actions.ts` ~2.3k), and commit messages that are ~72% vague “Enhance/Refactor/Update” vs ~10% conventional in 90 days.

Security and product instinct are **above mid**: RBAC (role-based access control) rules, `api-authz` matrix, workspace isolation, donation/docs/roadmap product asks with clear acceptance criteria. Testing exists (325 test files) but is not yet a senior gate (tests often lag; CI Playwright gaps still surprise you).

**Verdict today: solid mid / senior-leaning founder.** You clear mid easily. You are not yet consistently senior on architecture, change hygiene, and AI output ownership.

---

## 2. Scorecard

| # | Dimension | Score (1–5) | Confidence | Evidence (2–3) |
|---|-----------|-------------|------------|----------------|
| 1 | Code quality & readability | **2.5** | High | Hotspots: `OutlookStyleCalendar.tsx` (~4030), `ExpandedCalendarView.tsx` (~2568), `user.actions.ts` (~2343); repeated rewrites of same surfaces |
| 2 | System design & architecture | **3** | Med | Strong: `src/lib/rbac/`, roadmap engine + catalogs, donation settings split; Weak: calendar/dashboard monoliths, large cross-cutting PRs (#178 97 files / +6722) |
| 3 | Testing & reliability | **2.5** | High | ~325 `*.test.*` files; ~734 test-ish path touches vs ~9606 total (~7.6%); sample ~13/50 recent commits touch tests with `src`; Playwright browsers missing mid-PR flow (this chat) |
| 4 | Debugging & problem-solving | **3.5** | Med | This chat: orgId 400 → targeted API test; roadmap “merged but 0%” → multi-catalog + UI strikethrough root cause; merge conflicts resolved with intent (keep HEAD tests) |
| 5 | Security & data handling | **3.5** | High | `.cursor/rules/security-rbac.mdc`, `api-authz-matrix` / baseline; credentials rewrite commits `0dce6788` / `8cec4e09` (good recovery, bad that secrets landed) |
| 6 | Git/process discipline | **2** | High | 90d Remi: 19 conventional vs 143 Enhance/Refactor/Update-style; many merge-sync commits; Agent authorship ~168/90d; huge PRs #176/#178/#181/#182 |
| 7 | Requirements thinking & communication | **4** | Med | This chat: precise product asks (docs blur, orgId 400 test, roadmap PRD sync, conflict resolution rules); Cursor rules encode intent for agents |
| 8 | Product & business judgment | **4** | Med | NPO donation → docs → authz → roadmap PRD board; packaging/pricing skills exist; shipping full CLM+NPO surface as solo |
| 9 | Use of AI tools | **3** | High | Heavy leverage (Agent commits + `.cursor/rules` ~31); over-reliance risk: large agent diffs + follow-up fix chains; evaluation prompt itself shows meta-awareness |
| 10 | Learning velocity & consistency | **4** | Med | Aug–Sep commit spike; CI/Vercel/roadmap/authz systems added in-band; consistency uneven (quality vs volume trade) |

**Scale reminder:** 3 = solid mid, 4 = senior, 5 = staff+.

**Overall placement:** **mid / senior-leaning** (weighted toward 3.1–3.3). Product + security pull up; process + modularity + test gates pull down.

---

## 3. Evidence-backed findings

### Facts (observed)

| Fact | Source |
|------|--------|
| Remiiiiii ≈ 504 commits; Cursor Agent ≈ 168 (12mo) | `git shortlog` |
| +~734k / −~303k lines (12mo) | numstat aggregate |
| Monthly activity spike Aug–Sep 2026 | commits-per-month |
| Top churn: calendar, user.actions, ExecutiveDashboard, roadmap, donation settings | name-only churn |
| Test-path touches ≈ 734 of ≈ 9606 (~7.6%) | helper-style grep |
| 90d Remi non-merge: 199 commits; 19 conventional; 143 Enhance/Refactor/Update | message regex |
| 30d Remi: 71 non-merge commits, 2268 file touches ≈ **32 files/commit** | numstat |
| Open/recent PRs #178/#181/#182: 97–153 files, 4.8k–6.7k+ insertions | `gh pr` |
| 325 test files present; `api-authz` baseline ~2KB | filesystem |
| Secrets incident + history rewrite | commits `0dce6788`, `8cec4e09` |
| This chat: docs UX, API contract test, roadmap board sync, merge conflicts, then senior eval | transcript |

### Inferences (interpretation)

1. **You optimize for shipping surface area** (product coverage) over **change blast-radius control**. Inference from file/commit ratio + PR sizes + God files.
2. **AI is a force multiplier and a debt amplifier.** Agent volume is high; follow-ups in this chat (docs overlay, roadmap 0%, Playwright) look like “ship then correct” loops.
3. **You think like a product owner more than like a platform maintainer.** Strong requirements and feature sequencing; weaker atomic commits and module boundaries.
4. **Security is intentional, not accidental** — rules and authz matrix are real senior signals — but secret leakage shows process still lags intent.
5. **Chat evidence is thin outside this session.** Do not treat the scorecard as a full personality assessment of how you debug day-to-day without more transcripts.

### Could not assess (need data)

- Code review quality when someone else reviews you (solo founder limitation)
- Production MTTR (mean time to repair), on-call, customer-facing incidents
- Whether you can design a system from a blank page **without** AI scaffolding
- Depth of understanding of Appwrite/Next edge cases you ship (would need live design interview or “explain this PR” drill)
- Other repos you pointed at (none provided beyond caalm-next)

---

## 4. Strengths / gaps / blind spots

### Top 5 strengths (keep leaning in)

1. **Product sequencing under real constraints** — donation → docs → authz → roadmap PRD; you specify acceptance criteria, not vibes (this chat).
2. **Security posture as policy** — RBAC-without-bypasses, `requirePermission`, api-authz matrix/baseline; this is senior-adjacent for a solo SaaS.
3. **End-to-end ownership** — full-stack, CI, Vercel, demo DB parity rules, agent rules; founders who only “do frontend” do not look like this.
4. **Learning velocity** — Aug–Sep volume + new subsystems (roadmap engine, donation, authz) shows you absorb stacks fast.
5. **Willingness to seek hard feedback** — this evaluation request + conflict-resolution precision are maturity signals.

### Top 5 gaps blocking senior (by impact)

1. **Change hygiene / PR & commit discipline** — sprawling commits (~32 files), vague messages, mega-PRs. Seniors make reviewable, reversible slices.
2. **Modular architecture under growth** — calendar/actions/dashboard hotspots. Seniors refuse 2–4k line UI/service files as permanent homes.
3. **Test-as-gate, not test-as-afterthought** — tests exist but ratio and colocating with features are mid. Seniors land risk tests with the risk.
4. **AI output ownership** — Agent authorship volume + fix-after-ship pattern. Seniors treat AI like a junior: require design, tests, and a self-review before merge.
5. **Operational predictability** — Playwright env gaps, roadmap UI/logic mismatch after merge, secret rewrite. Seniors prevent class of failures with checklists/CI contracts.

### Patterns (git ∩ chat)

| Pattern | Git | Chat |
|---------|-----|------|
| Ship broad, fix narrow | Mega PRs, Enhance commits | Docs blur / roadmap 0% / Playwright after the fact |
| Encode intent in rules | `.cursor/rules`, authz | Precise conflict/keep-HEAD instructions |
| Product clarity > process clarity | Feature-heavy history | Clear UX/API asks; weaker “how will we verify CI” upfront |
| Security intentional | RBAC/isolation commits | Security rules always-on |

### Blind spots (likely unaware)

1. **“I review AI diffs” vs “I own AI diffs.”** Ownership means you can redraw the module map and explain every risky path without re-reading the whole PR.
2. **God-file comfort** — high churn on the same files is a smell that “working” is substituting for “bounded.”
3. **Commit messages as future debugging tools** — Enhance/Refactor history will punish you during incidents.
4. **CI as product** — Playwright missing browsers mid-flow is a process bug, not bad luck.
5. **Senior bar is judgment under constraint, not feature count.** Your feature count already looks senior; your constraint discipline does not yet.

### Honest verdict

**Today: mid-level / senior-leaning solo founder.**

You are past junior. You are stronger than a typical mid on product and security policy. You are weaker than a typical senior on change control, modularization under pressure, and making reliability part of the Definition of Done. Staff+ is not the next rung; **consistent senior habits on this codebase** are.

---

## 5. Improvement plan

### Gap plans (top 5)

#### Gap 1 — Change hygiene

- **Senior looks like:** PRs ≤ ~400 lines change when possible; commits tell *why*; one concern per PR; green CI before “done.”
- **Why it matters:** Solo + AI means you are your only reviewer. Sprawling diffs hide auth and data bugs.
- **Exercises:**
  1. Next feature touching calendar: extract one pure helper module from `OutlookStyleCalendar.tsx` in its own PR (no behavior change).
  2. Rewrite last 10 Enhance/Refactor commits mentally into conventional form; enforce for 2 weeks.
  3. Cap Agent PRs: if >40 files, force split before merge.
- **Success signal:** 30d: median files/commit ≤ 12; ≥60% conventional messages; no PR >2k insertions without an explicit “why large” note.

#### Gap 2 — Modular architecture

- **Senior looks like:** clear boundaries (UI shell / domain service / API / RBAC); hotspots shrink over time.
- **Why it matters:** NPO + CLM surface will keep growing; God files become untestable and AI-hostile (context overflow → worse AI output).
- **Exercises:**
  1. Split `user.actions.ts` by domain (auth, profile, org) with a thin facade.
  2. Carve `ExecutiveDashboard.tsx` data fetching into a service already patterned like `PortfolioAccountabilityAnalyticsService.ts`.
  3. Roadmap: keep `service.ts` thin; catalog/UI contract tests for “merged ⇒ unlocked” (you already hit this bug class).
- **Success signal:** 60d: top-5 churn files lose ≥20% LOC or are split; new feature PRs rarely reopen the same 4k file for unrelated work.

#### Gap 3 — Testing as gate

- **Senior looks like:** riskiest paths tested with the feature; CI failure is blocking, not informative.
- **Why it matters:** multi-tenant SaaS mistakes are data leaks and wrong org scope (you already chase `orgId` 400s).
- **Exercises:**
  1. For every new API route: permission denial + happy path + org-scope miss (mirror dashboard invitations/stats patterns).
  2. Add roadmap regression: merged PRD section cannot show locked/0% when checks pass.
  3. Make Playwright browser install part of CI/onboarding doc — fail fast locally.
- **Success signal:** 30d: ≥70% of `src/**` feature commits also touch `tests/**` or colocated `*.test.ts`; 90d: zero “forgot Playwright” class failures on PRs you open.

#### Gap 4 — AI ownership

- **Senior looks like:** AI proposes; you decide architecture; you can delete 30% of the diff and the feature still works.
- **Why it matters:** Agent is already ~25%+ of recent authorship; unchecked, you become a prompt operator.
- **Exercises:**
  1. Prompt template: constraints, non-goals, files allowed to touch, tests required, “do not expand scope.”
  2. After each Agent PR: write a 5-bullet “blast radius” note before merge (callers, auth, data, UI, rollback).
  3. Once/week: implement a small fix **without** Agent (authz test, pure helper) to keep the muscle.
- **Success signal:** 60d: Agent commits drop as % of total *or* stay high but median PR size drops; your self-review notes appear in PR bodies.

#### Gap 5 — Operational predictability

- **Senior looks like:** checklists prevent known failure classes (secrets, CI deps, demo schema sync, env overwrite).
- **Why it matters:** you already have rules for Vercel env and demo DB — enforce them like production law.
- **Exercises:**
  1. Pre-commit / CI secret scan (you paid once with history rewrite).
  2. PR template checklist: permissions, org scope, tests, demo schema, Playwright.
  3. “Merge green ≠ product green”: smoke the board/UI path you care about (roadmap taught this).
- **Success signal:** 90d: no secret rewrite; no “merged but UX wrong” on roadmap-class features; CI red means you stop.

### 30 / 60 / 90 days

| Window | Weekly focus |
|--------|----------------|
| **Days 1–30** | Commit/PR hygiene; conventional commits; PR size caps; API org-scope + permission tests on every new route; Playwright CI contract; stop Enhance-only messages |
| **Days 31–60** | Split one hotspot (`user.actions` *or* calendar helper extraction); roadmap contract tests; Agent PR blast-radius notes; shrink top churn LOC |
| **Days 61–90** | Second hotspot split; dashboard data layer extraction; measure files/commit + test colocations; run a “senior mock”: explain one mega-PR end-to-end without opening Agent chat |

### Habits to adopt immediately

1. **Commit convention:** `type(scope): why` — e.g. `fix(roadmap): unlock PRD when checks pass`.
2. **PR self-review checklist:** auth permission, org scope, tests added, demo schema, secrets, UI smoke of the user path.
3. **Test-with-risk rule:** if it touches RBAC, money, or multi-tenant IDs, tests land in the same commit.
4. **AI prompt law:** allowed files, forbidden files, acceptance criteria, required tests, max scope.
5. **One concern per PR** — behavior change vs rename/split never mixed.

### High-value reading / practice (short list)

1. *A Philosophy of Software Design* (Ousterhout) — especially deep modules vs shallow; apply to calendar/actions.
2. Your own `api-authz` + security rules — treat them as the bar; audit 10 routes against them monthly.
3. Practice: take PR #178 or #181 and write the PR description a senior would have written (risk, test plan, rollback) — compare to what shipped.

### How to prompt AI so it makes you stronger

- Start with **constraints and non-goals**, not “build X.”
- Require **tests and file allowlist** in the same prompt.
- Ask for **2 designs with trade-offs** before code on anything touching auth, billing, or >3 modules.
- After output: demand a **diff summary by risk** (auth, data, UI) and reject scope creep.
- Weekly: one task where you forbid Agent and only use AI for review questions — keep generation muscles alive.

---

## 6. If you only do three things

1. **Cap blast radius:** no more unmarked 5k-line / 100-file PRs; split hotspots starting with `user.actions.ts` or calendar helpers.
2. **Make tests gate risky paths:** every RBAC/org-scoped API change ships with deny + scope tests (pattern from dashboard orgId work).
3. **Own AI like a junior on your team:** allowlisted files, required tests, blast-radius note in every Agent PR — or do not merge.
