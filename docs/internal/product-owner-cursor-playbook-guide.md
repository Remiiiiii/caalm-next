# CAALM build playbook — guide for product owners

**Who this is for:** Product owners and other non-technical leaders who want to understand how we use Cursor (AI coding assistants) to build CAALM safely and quickly.

**What CAALM is in one sentence:** CAALM is our contract and compliance software for organizations — contracts, licenses, permissions, audit history, and related workflows.

**What this guide covers:** The improvement package we prepared in late 2025: written playbooks, team rules for the AI, copy-paste task templates, and fixes so cloud-based AI helpers work the same way as local ones.

---

## Why we did this at all

We build CAALM with **Cursor**, a coding tool that includes **AI agents** — assistants that can read the codebase, suggest changes, run checks, and open pull requests (PRs = proposed bundles of code changes for review before they go live).

Without clear rules and habits, those agents:

- Repeat mistakes (wrong screen layout, missing permission checks, forgetting demo environment sync).
- Waste time re-reading the whole codebase.
- Work on cloud servers but fail on a developer’s laptop (or the reverse).

This package is our **operating manual**: how humans and AI should work together so delivery feels like a strong senior engineering team, not random autocomplete.

---

## The pull requests (PRs) — what each one is and why it matters

A **pull request** is a proposal to add or change files in the product repository. Nothing in these PRs changes what customers see in the live app **by itself** — they mostly improve **how we build**. That still affects quality, speed, and risk over time.

### PR #194 — The main playbook (research and plan)

**What it adds:** A long internal document (`principal-engineer-playbook.md`) with:

- The **top 10** habits we should adopt first.
- A **30 / 60 / 90 day** rollout plan.
- A library of **172 links** to trusted articles and official docs (for engineers; you do not need to read them all).

**Purpose:** One place that answers “how should we build CAALM with AI?” so every developer and agent follows the same playbook.

**If we do not merge this:**

- Knowledge stays in chat history and one person’s head.
- New hires and cloud agents rediscover the same mistakes.
- Product and engineering disagree on “what good looks like” for security and demos.

---

### PR #195 — Always-on AI rule (short checklist)

**What it adds:** A small rule file the AI reads on **every** task: look up context in the right order, check tenant isolation and permissions, run the right tests before calling work “done,” and respect cloud-agent limits.

**Purpose:** Turn the playbook’s daily habits into something automatic in Cursor, not something engineers must remember to paste each time.

**If we do not merge this:**

- Agents keep skipping permission checks or demo-database sync unless a human catches it in review.
- More rework after code review and more risk for enterprise buyers who care about access control and audit trails.

---

### PR #196 — Copy-paste task templates

**What it adds:** Five fill-in-the-blank prompts in `.cursor/prompt-templates/`, for example:

- New feature (API + screens).
- Large roadmap batch.
- Security review before merge.
- New app page layout.
- Database schema change (production + demo sync).

**Purpose:** Product and engineering can start complex work with a **consistent brief** so the AI does not guess scope or skip compliance steps.

**If we do not merge this:**

- Every person phrases requests differently; quality varies by who wrote the prompt.
- Roadmap batches miss the same checklist items (tests, demo sync, buyer-facing verify steps).

---

### PR #197 — Portable hooks (fix for cloud AI and all computers)

**What it changes:** Technical wiring files that tell Cursor when to run small helper scripts (for example, keeping our **graft** code map up to date after the AI reads files).

Previously, those files contained **one developer’s Windows paths** (like `C:/Users/...`). That works on that one PC only. **Cloud agents** and other machines could not run them reliably.

**Purpose:** The same helper behavior works for **every developer** and for **Cursor Cloud Agents** working on `cursor/...` branches.

**Personal “ponytail” tooling** (optional coding style helper) was removed from the shared repo file on purpose — each developer installs that on their own machine if they want it.

**If we do not merge this:**

- Cloud agents may silently skip indexing helpers; they work blind or error in logs nobody reads.
- Only one machine’s setup works; others carry broken config in git.

**Supporting doc:** `cursor-hooks-setup.md` explains project vs personal setup in engineer-facing language.

---

## Recommended merge order

1. **#197** (portable hooks) — fixes broken shared setup.
2. **#194** (playbook) — reference for the team.
3. **#195** (always-on rule) — daily behavior.
4. **#196** (templates) — how to start tasks.

---

## Top 10 changes — what to implement and why (plain English)

| # | What to implement | Why it matters for CAALM |
|---|-------------------|---------------------------|
| **1** | **Look up context in a fixed order** (code map “graft” first, then team rules, then specific files) | Stops the AI from guessing and breaking our glass-card UI, dialog layout, or permission rules. Saves time and tokens. |
| **2** | **Every feature: correct org/customer isolation + permission checks + audit story** | Enterprise buyers expect “User A at Org X cannot see Org Y’s contracts.” Missing this is a deal-breaker and a compliance failure. |
| **3** | **Same AI tooling on cloud and local** (fixed hooks + team MCP connections) | Roadmap work uses cloud agents; if cloud lacks database/GitHub tools, agents ship incomplete PRs. |
| **4** | **Limit which external tools the AI can use** (GitHub, browser testing, Appwrite, Stripe — not dozens) | Too many tools confuse the AI; wrong tool = wrong data or leaked scope. |
| **5** | **Proof before “done”:** permission matrix tests, unit tests where logic changed, browser tests for critical clicks | Catches regressions before customers or CI do. |
| **6** | **Stay one product codebase with clear modules** (not split into many microservices yet) | CAALM’s size fits one deployable app; splitting early slows features without benefit. |
| **7** | **Treat audit log as a product promise** (who did what, when, for which customer) | Differentiates us in CLM/compliance sales and supports SOC 2-style questions. |
| **8** | **One design system rulebook for all new screens** | Consistent, professional UI; less “each screen looks different.” |
| **9** | **Any production database change also updates the demo sandbox** | Sales demos and tests must match real behavior; drift causes embarrassing demos and false “bugs.” |
| **10** | **Disciplined roadmap PRs** (CI green, clear description, short user journey for what shipped) | Faster review, fewer back-and-forth weeks on large batches. |

**Product owner takeaway:** Items **2, 7, 8, 9, and 10** are most visible to buyers and demos. Items **1, 3, 4, 5** are mostly invisible but prevent fires.

---

## 30 / 60 / 90 days — what the work includes (in detail)

### First 30 days — “Stop stepping on rakes”

**Goal:** Fix broken shared setup and make daily AI use consistent **without** slowing roadmap features.

| Work item | What happens | Who is involved | What you’ll notice |
|-----------|--------------|-----------------|---------------------|
| Merge portable hooks (#197) | Shared Cursor config works on all machines and cloud | Engineering | Fewer “agent failed on cloud” threads |
| Configure **Team MCP** in Cursor dashboard | Connect GitHub, Appwrite, Vercel (and similar) once for the whole team’s cloud agents | Engineering lead / admin | Cloud PRs that actually touch DB and deployment context |
| Require **graft + rules** at start of non-trivial agent tasks | Engineers/agents query code map before editing | Engineering habit | Shorter PRs, fewer wrong-file edits |
| Add **Playwright plugin** for local browser checks | AI can click through key flows in a real browser when testing UI | Engineering | Fewer UI regressions on dense desktop screens |
| Run **agent-compatibility scan** once | Score how easy the repo is for AI; fix top 5 issues | Engineering | Faster onboarding |
| Use **prompt templates** for batches | PO/EM fills template when kicking off roadmap slice | Product + engineering | Clearer scope in PR descriptions |

**Not in code (but in plan):** Train the team that demo DB sync is non-negotiable for schema work.

---

### Days 31–60 — “Quality at scale”

**Goal:** Harder to accidentally break boundaries as the codebase grows.

| Work item | What happens | Why |
|-----------|--------------|-----|
| **Module boundaries** | Automated checks that “contracts code” does not randomly import “billing internals,” etc. | Prevents spaghetti that slows every feature |
| **More automated tests** on permission helpers and API scaffolds | Tests run in CI on every PR | Cheaper than manual security retesting |
| **Structured logging** | Logs include customer org id, user id, correlation id on API actions | Faster incident response; answers buyer audit questions |
| **GDPR engineering runbook** | Written steps for export/delete requests even before full product automation | EU and privacy-conscious buyers ask early |
| **PR review canvas** for very large diffs | Visual walkthrough of big changes | Reviewers understand risk without reading 100 files |

**Product owner role:** Prioritize one **GDPR/export** epic if sales targets EU; accept slight feature slowdown for boundary tests.

---

### Days 61–90 — “Enterprise readiness”

**Goal:** Evidence and reliability for sales and security questionnaires, not checkbox theater.

| Work item | What happens | Why |
|-----------|--------------|-----|
| **SOC 2 control mapping (engineering slice)** | Map “how we deploy” and “how we control access” to control matrix rows | Sales cycle acceleration |
| **Load test hot paths** | Measure contracts list/search under load; tune caching | Avoid launch-day embarrassment for large customers |
| **Workflow engine decision record** | Written decision: build workflows in-app vs buy orchestration later | Stops endless rewrite debates |
| **Disaster recovery drill** | Practice restoring demo DB and file storage | Proves backups are real |
| **Consolidate AI rules** | Merge overlapping rule files so agents do not get conflicting instructions | Less agent confusion |

**Product owner role:** Align roadmap with **audit**, **workflow**, and **performance** narratives for enterprise deals.

---

## Ready-to-use rule + templates — why and how to use them

### The rule (PR #195)

**What it is:** A short “always read this first” instruction for the AI, like a company policy posted in the break room.

**Why:** Our product already has **many** detailed rules (UI, security, dialogs). Without a **meta-rule**, the AI reads them in random order or misses security entirely.

**How product uses it:**

- You usually **do not** paste the rule yourself — engineers merge PR #195 and Cursor applies it.
- When kicking off work, say: *“Follow the principal agent workflow and use the feature-delivery template.”*

### The templates (PR #196)

**What they are:** Fill-in-the-blank briefs you paste into Cursor chat before the agent starts coding.

**Why:** Reduces vague prompts like “add export” that cause scope creep or missed permission checks.

**How to use (example — new feature):**

1. Open `.cursor/prompt-templates/feature-delivery.md` (or ask engineering to paste it).
2. Fill in: goal, area (contracts/licenses/etc.), who may access it, acceptance checks, **out of scope**.
3. Paste into Agent chat and send.
4. Engineering reviews the resulting PR against the same acceptance bullets.

**Templates at a glance:**

| Template | Use when |
|----------|----------|
| `feature-delivery.md` | New capability touching screens and/or APIs |
| `roadmap-batch-pr.md` | A numbered roadmap batch (CLM / nonprofit / platform readiness) |
| `security-rbac-review.md` | Before merging anything about login, roles, or data access |
| `ui-page.md` | New or redesigned app page |
| `schema-migration.md` | Database structure change (must include demo sync) |

---

## What we’re likely overlooking — explained for product

These are gaps that **do not show up in a demo** until a buyer, auditor, or cloud agent hits them.

| Topic | Plain English | Business risk |
|-------|---------------|---------------|
| **Cloud vs laptop AI** | Cloud agents do not use a developer’s personal Cursor settings; only shared project settings. | Cloud roadmap PRs ship incomplete or fail silently. |
| **Too many AI rules** | Dozens of style and security rules can contradict each other; the AI picks inconsistently. | Same feature looks different week to week; security steps skipped. |
| **Cloud missing database tools** | If Appwrite/GitHub are not connected in Cursor Team settings, cloud agents cannot verify schema or PRs properly. | “Done” PRs that break demo or permissions. |
| **Audit log as checkbox vs product** | Logging exists but narrative is weak (“who changed this contract clause?”). | Lose compliance-led deals to vendors with clearer audit stories. |
| **Workflow scope creep** | Building a full second “workflow product” inside CAALM too early. Guardrail: `docs/internal/workflow-engine-decision.md`. | Years of delay; core CLM features starve. |
| **Lint warnings ignored in CI** | Automated style/security lint can fail but pipeline still passes (`continue-on-error`). | Slow quality drift; harder to catch bugs early. |
| **Mobile vs desktop strategy** | CAALM is desktop-first; phones get companion flows only. | PO asks for phone layouts engineers should not build for admin screens. |
| **Demo vs production database** | Demo sandbox can lag production schema (known limits on audit log size on demo). | Demo shows wrong behavior; sales loses trust. |
| **AI document extraction** | Reading PDFs with AI needs governance (what is sent to vendors, disclosures). | Privacy review surprises in enterprise procurement. |
| **Demo script vs reality** | Sales script says what is “live” vs “roadmap.” | Overpromise in calls; churn after purchase. |

**Product owner action:** Keep `buyer-demo-script` (internal) aligned with integrations page; flag any sales claim that is not wired in product.

---

## Portable hooks follow-up (#197) — process for the team

**Problem we had:** Shared config pointed at one person’s computer paths. Other people and cloud servers could not run the same helpers.

**What we did:** Shared config now says “run the script **inside this repo**” with relative paths. Optional personal tools (ponytail) move to **personal** Cursor settings.

**Implementation steps (engineering):**

1. Merge PR #197.
2. Each developer pulls latest main.
3. If someone used ponytail from the old shared file, re-run ponytail **install** on their machine (user-level), per `cursor-hooks-setup.md`.
4. Open Cursor → Hooks log → send a test agent message → confirm no “file not found” errors.

**What product should expect:** No customer-visible change; fewer agent failures on cloud roadmap work.

---

## Next manual steps (not code) — why and how

These are **Cursor account / team** settings, not files in the CAALM repo.

### 1. Team MCP (Model Context Protocol = “plugins that let AI talk to GitHub, database, etc.”)

**Why:** Cloud agents do not inherit a developer’s laptop plugins. Team MCP configures connections **once** for everyone’s cloud runs.

**How:**

1. Cursor dashboard → team / integrations (admin).
2. Add servers the team already trusts: **GitHub**, **Appwrite** (database), **Vercel** (deployments), **Stripe** read-only if used in support workflows.
3. Teammates authenticate once if prompted.
4. Retry a cloud agent task that needs DB or PR context.

**If skipped:** Cloud agents write code that compiles but wrong permissions, wrong collection ids, or missing demo sync.

### 2. Official Cursor plugins (GitHub, Playwright, cursor-team-kit)

**Why:** Standard skills for “fix CI,” “review PR,” “smoke test in browser” — matches how we already run GitHub Actions and Playwright.

**How:** Cursor Settings → Plugins → install **GitHub**, **Playwright**, **Cursor Team Kit** (names per [cursor/plugins](https://github.com/cursor/plugins)).

**If skipped:** Engineers rely on ad-hoc prompts; CI failures take longer to fix.

### 3. Agent-compatibility scan once

**Why:** Grades the repo for AI-friendliness (docs match reality, easy to boot, easy to verify changes).

**How:** Install **agent-compatibility** plugin; run full scan; fix top 5 items in a small PR.

**If skipped:** Every new hire and agent relearns the same bootstrapping pain.

---

## Optional fifth PR — should we do it? Which option?

We have **not** opened a fifth PR yet. Two candidates were discussed:

### Option A — Turn off “ignore lint failures” in CI (`continue-on-error: false`)

**What it is:** Today the main CI job can **report** lint problems but still **pass**. This change would make lint failures **block** merge like build failures.

| Pros | Cons |
|------|------|
| Stops slow quality slide | May block PRs until existing lint debt is cleaned |
| Clear “green means green” for PO | Short-term slowdown fixing old warnings |
| Aligns with enterprise rigor | Needs engineer time budget for cleanup PR first |

**When to choose:** You accept a **1–2 sprint lint cleanup** then stricter gate forever.

**Product framing:** “We pay down technical debt once so future features ship with fewer regressions.”

---

### Option B — Team template for `.cursor/mcp.json` (with placeholders only)

**What it is:** A **committed example file** showing which MCP connections the project expects (`graft`, GitHub, Appwrite, etc.) with **fake placeholder values** — not real secrets. Documents the standard stack for every developer and cloud admin.

| Pros | Cons |
|------|------|
| Onboarding doc as code | Does not replace Team MCP dashboard for cloud |
| New devs know what to connect | Wrong if someone commits real secrets (mitigated by review + placeholders rule) |
| Matches env-example pattern we already use | Slightly more maintenance when tools change |

**When to choose:** Team grows; people ask “what should my Cursor connect to?” repeatedly.

**Product framing:** “Standard toolkit checklist” — like `.env.example` for AI tools.

---

### Recommendation (product + engineering)

| Priority | Choice | Reason |
|----------|--------|--------|
| **First** | **Option B** (MCP template with placeholders) | Low risk, helps cloud/local parity story; no immediate merge blocking |
| **Second** | **Option A** (strict lint) | Do after a planned **lint burn-down** sprint so roadmap batches are not surprise-blocked |

**Do not do both in one PR** — different audiences (onboarding vs CI policy).

---

## What you can do Monday as product owner

1. **Approve merge order:** #197 → #194 → #195 → #196 (or at minimum #197 + #195).
2. **Ask engineering lead** to confirm Team MCP is configured for cloud agents.
3. **Use templates** when writing roadmap tickets: link `feature-delivery.md` or `roadmap-batch-pr.md` in the ticket body.
4. **Schedule 30-day checkpoint:** demo DB parity, one cloud agent PR end-to-end, buyer demo script review.
5. **Decide fifth PR:** MCP template this quarter; strict lint after burn-down.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Cursor** | IDE with built-in AI coding agents |
| **Agent / Cloud agent** | AI that edits code, runs commands, opens PRs |
| **PR (pull request)** | Proposed change set reviewed before merge to main |
| **MCP** | Standard way AI connects to GitHub, databases, etc. |
| **RBAC** | Role-based access control — who may do what in the app |
| **Demo database** | Sandbox copy of schema for demos/tests, separate from production data |
| **SOC 2** | Common security audit framework enterprise buyers request |
| **GDPR** | EU privacy law — export/delete personal data, breach timelines |
| **Hooks** | Small scripts Cursor runs at session start/end or after tool use |
| **graft** | In-repo code map tool to find where logic lives quickly |

---

*Related engineer docs: `principal-engineer-playbook.md`, `cursor-hooks-setup.md`. PR numbers refer to GitHub caalm-next repo, October 2025.*
