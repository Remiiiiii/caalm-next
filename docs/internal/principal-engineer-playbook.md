# CAALM principal-engineer playbook

Research-backed operating system for building CAALM with Cursor agents at principal-engineer pace.  
**Audience:** engineering leads and agents. **Last updated:** 2026-10-13.

## How to use this doc

1. Read **Top 10 changes** and start the **30-day** items this week.
2. Install **Tier S** resources per area as bookmarks; agents should `@`-reference `.cursor/rules/` and `graft/` before grepping.
3. Use **prompt templates** in `.cursor/prompt-templates/` (separate PR).
4. Treat **Tier B** as “when pain appears,” not day-one mandates.

---

## Top 10 highest-leverage changes (do these first)

| # | Change | Why for CAALM | Tradeoff |
|---|--------|---------------|----------|
| 1 | **Single agent context spine:** `graft ask` → scoped rules → `@file` refs; ban drive-by full-file reads | You already ship 30+ `.mdc` rules; agents waste tokens ignoring them | 15 min habit per task |
| 2 | **Every feature PR: permission + audit + tenant scope checklist** in agent prompt | RBAC is DB-driven; bypasses are forbidden; CLM buyers audit this | Slightly slower first PR |
| 3 | **Cloud vs local Cursor parity:** portable `.cursor/hooks.json`, Team MCP for Appwrite/GitHub/Vercel | Hooks today embed Windows paths; cloud agents skip user hooks | One afternoon to fix paths + dashboard MCP |
| 4 | **MCP minimal set:** GitHub + Playwright + Appwrite (+ Stripe read-only); defer 20-tool sprawl | MCP noise increases wrong-tool calls | Less “magic” integrations |
| 5 | **Review loop:** `pnpm test:api-authz` + targeted Vitest + Playwright smoke on touched routes | CI already has authz matrix; agents often skip local proof | 5–10 min per PR |
| 6 | **Modular monolith boundaries** documented per domain (`contracts`, `licenses`, `rbac`, `workflows`) | Appwrite + Next monolith is correct stage; extract services only on measured pain | Not microservices yet |
| 7 | **Immutable audit narrative:** who did what, when, on which tenant — design doc for every write path | Enterprise CLM differentiator; SOC 2 CC7 | Schema work |
| 8 | **Design system as law:** `global-style-guide.mdc` + `ui-ux-pro-max` skill before new UI | Dense desktop-first UI; inconsistency kills trust | Agents must search skill |
| 9 | **Demo DB sync in same PR as prod schema** (`sync-demo-database-schema.mjs`) | Already a hard rule; agents forget | Extra step every migration |
| 10 | **Roadmap PR discipline:** cursor-team-kit skills (`fix-ci`, `review-and-ship`) + journey footer rule | You run batch roadmap PRs; consistency reduces rework | Process overhead |

---

## 30 / 60 / 90-day adoption plan

### Days 1–30 (speed without chaos)

- Fix **hooks portability** (relative or env-based paths; document cloud agent limitations).
- Add **Team MCP** mirrors of project servers for cloud agents.
- Mandate agent preamble: `graft ask "<task>" --source` + list applicable rules.
- Cursor live UI: in-IDE Browser Tab (`cursor-ide-browser`). Claude Code live UI: Chrome on port 9222. Keep Playwright E2E in CI (`pnpm test:e2e`).
- Run **agent-compatibility** plugin once; file top 5 fixes.
- Publish internal **tenant + RBAC checklist** (see `.cursor/prompt-templates/feature-delivery.md`).

### Days 31–60 (quality at scale)

- Architecture tests: forbidden imports across `src/lib/<domain>` (lightweight dep-cruiser or eslint boundaries).
- Expand **Vitest** coverage on RBAC helpers and API scaffolds; keep Playwright for critical paths only.
- **Observability:** standardize structured logs with `tenantId`, `userId`, `correlationId` on API routes.
- **GDPR engineering:** DSAR export/delete runbook + ticket template (even before full automation).
- **PR review canvas** for roadmap batches >500 LOC.

### Days 61–90 (enterprise readiness)

- SOC 2 control matrix row for **change management** (GitHub + Vercel) and **access** (Appwrite RBAC).
- Load test **hottest** read paths (contracts list, search); set Vercel/Appwrite caching policy.
- Workflow engine decision record (state machine in Appwrite vs external orchestrator).
- **Disaster recovery** drill: restore demo DB + blob bucket procedure documented.
- Trim rules: merge overlapping `.mdc` files >500 lines; move reference material to `docs/internal/`.

---

## Area 1 — Cursor & agent mastery

**Impact tiers:** **S** = adopt now · **A** = next month · **B** = situational

### Tier S

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://cursor.com/docs/context/rules | Official project rules, `AGENTS.md`, nesting | You have 30+ rules; this is precedence and size limits |
| https://cursor.com/docs/agent/hooks | Hook events, `beforeMCPExecution`, fail-closed | Graft + ponytail hooks; cloud vs IDE differences |
| https://cursor.com/guides/coding-agent-mcp | MCP design: small tool sets, naming | Appwrite/GitHub/Stripe MCP sprawl control |
| https://cursor.com/docs/cloud-agent | Cloud agent env, branches, PR flow | `cursor/**` CI and agent PR log |
| https://github.com/cursor/plugins | Official plugins (GitHub, Playwright, team-kit) | Matches your CI + E2E stack |
| https://modelcontextprotocol.io/specification/latest | MCP spec | Custom internal tools later |
| https://github.com/nanonets/graft (via `@nanonets/graft`) | Repo graph for agents | Already in `.cursor/mcp.json` + `graft.mdc` |
| In-repo: `.cursor/rules/security-rbac.mdc` | No RBAC bypasses | CLM compliance core |
| In-repo: `.cursor/rules/graft.mdc` | When to `graft ask` vs grep | Token-efficient navigation |
| In-repo: `.cursor/rules/api-route-authz.mdc` | `pnpm new:api-route` | Every API surface |

### Tier A

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://cursor.com/docs/agent/skills | SKILL.md discovery | Sales + ui-ux-pro-max skills |
| https://cursor.com/docs/agent/subagents | Task tool, explore agent | Large refactors |
| https://cursor.com/docs/integrations/github | GitHub integration | PR automation |
| https://github.com/cursor/plugins/tree/main/cursor-team-kit | fix-ci, review-and-ship | Roadmap PR batches |
| https://github.com/cursor/plugins/tree/main/third_party/playwright | Playwright MCP plugin | Desktop UI verification |
| https://github.com/cursor/plugins/tree/main/agent-compatibility | Repo agent-readiness score | Onboarding + cloud env |
| https://github.com/cursor/plugins/tree/main/pr-review-canvas | PR diff canvas | Large RBAC/UI PRs |
| https://github.com/cursor/plugins/tree/main/thermos | Deep security review | Pre-merge for auth changes |
| https://www.anthropic.com/engineering/building-effective-agents | Agent design patterns | Subagent boundaries |
| https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent | Copilot agent patterns (concepts) | Comparable workflows |
| https://github.com/github/github-mcp-server | GitHub MCP server | Issues, PRs, Actions |
| https://github.com/microsoft/playwright-mcp | Browser MCP | Agent-driven smoke tests |
| https://github.com/DietrichGebert/ponytail | Lazy senior-dev discipline | Optional; don’t fight pstack + 30 rules |
| In-repo: `.cursor/hooks/graft-hooks.cjs` | Post-tool graft indexing | Keep paths portable |
| In-repo: `.cursor/commands/code-review.md` | Review command | Standardize reviews |

### Tier B

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://github.com/cursor/plugins/tree/main/orchestrate | Parallel cloud agents | Big roadmap batches only |
| https://github.com/cursor/plugins/tree/main/advisor | Second model consult | Architecture decisions |
| https://github.com/cursor/plugins/tree/main/continual-learning | AGENTS.md memory | Overlaps rules; use sparingly |
| https://github.com/cursor/plugins/tree/main/pstack | Deep planning workflow | Overlap with ponytail/rules |
| https://cursor.com/docs/cli/overview | Cursor CLI | CI-adjacent automation |
| https://code.visualstudio.com/docs/copilot/copilot-customization | Custom instructions concepts | Parallels rules |
| https://docs.anthropic.com/en/docs/claude-code/memory | Memory patterns | Team hygiene |
| https://github.com/openai/openai-agents-sdk | Agent SDK reference | Future automations |
| https://www.promptingguide.ai/ | Prompt patterns | Training material |
| https://simonwillison.net/tags/prompt-engineering/ | Practical LLM dev notes | Context budgeting |

*(Area 1 count: 35)*

---

## Area 2 — Application architecture (multi-tenant enterprise SaaS)

### Tier S

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://aws.amazon.com/saas | AWS SaaS Lens hub | Multi-tenant Well-Architected |
| https://aws.amazon.com/blogs/architecture/lets-architect-building-multi-tenant-saas-systems/ | Tenant isolation, metering | Enterprise buyer questions |
| https://brotcode.com/blog/engineering/building-multi-tenant-saas-platform-complete-guide/ | Isolation patterns, tenant context | Appwrite shared DB + org scoping |
| https://martinfowler.com/bliki/BoundedContext.html | Bounded context definition | contracts/licenses/rbac modules |
| https://martinfowler.com/eaaCatalog/repository.html | Repository pattern | Appwrite data access layer |
| https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | Authz design | Complements DB RBAC |
| https://owasp.org/www-project-application-security-verification-standard/ | ASVS levels | Security questionnaire alignment |
| https://owasp.org/API-Security/ | API Top 10 | Public + internal APIs |
| https://appwrite.io/docs/advanced/platform/permissions | Appwrite permissions | Collection-level security |
| https://appwrite.io/docs/products/databases | Appwrite TablesDB | Primary data plane |
| In-repo: `.cursor/rules/caalm-demo-database-sync.mdc` | Prod/demo schema parity | Release discipline |
| In-repo: `.cursor/rules/appwrite-collection-ids.mdc` | Alphanumeric IDs | Prevents prod misconfig |
| In-repo: `docs/internal/platform-readiness-vs-clm.md` | Roadmap honesty | Buyer trust |

### Tier A

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://fullstackhero.net/docs/architecture/modular-monolith/ | Modular monolith boundaries | Stay monolith; enforce modules |
| https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/overview | MS multi-tenant guide | M365 integration buyers |
| https://stripe.com/docs/billing/subscriptions/overview | Stripe subscriptions | Billing in product |
| https://stripe.com/docs/security/guide | Stripe security | SOC questionnaires |
| https://auth0.com/docs/get-started/architecture-scenarios/implementation-b2b | B2B SaaS identity | Future SSO/SAML |
| https://datatracker.ietf.org/doc/html/rfc9457 | Problem Details for HTTP APIs | Consistent API errors |
| https://zod.dev/ | Schema validation | Forms + API bodies |
| https://nextjs.org/docs/app/building-your-application/routing/route-groups | Next.js App Router | `(root)` structure |
| https://nextjs.org/docs/app/building-your-application/authentication | Auth patterns | Session + Appwrite |
| https://www.allthingsdistributed.com/ | Werner Vogels essays | Event-driven thinking |
| https://www.enterpriseintegrationpatterns.com/ | EIP catalog | Workflow/integration design |
| https://www.joeldonnelly.com/post/cqrs-and-event-sourcing | CQRS/event sourcing intro | Audit + workflow history |
| https://martinfowler.com/articles/201701-patterns-of-distributed-applications.html | Monolith first | Avoid premature microservices |
| https://12factor.net/ | Twelve-factor app | Vercel deployment fit |
| https://github.com/Remiiiiii/caalm-next (internal) | CAALM codebase | Ground truth |

### Tier B

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://aws.amazon.com/blogs/apn/building-a-multi-tenant-saas-solution-using-aws-serverless-services/ | Serverless multi-tenant | If you offload workers |
| https://docs.temporal.io/evaluate/use-cases-design-patterns | Temporal workflows | Alternative to custom workflow engine |
| https://www.cncf.io/blog/ | Cloud native patterns | Future k8s only if needed |
| https://microservices.io/patterns/monolithic.html | Monolith patterns | Validates current stage |
| https://www.domainlanguage.com/ddd/ | Eric Evans DDD | Deep domain modeling |
| https://www.infoq.com/articles/ddd-contextmapping/ | Context mapping | Multi-module CLM |
| https://www.w3.org/TR/did-core/ | Decentralized identifiers | Long-shot identity |
| https://pages.nist.gov/OSCAL/ | OSCAL compliance docs | Gov/nonprofit RFPs |
| https://www.fedramp.gov/ | FedRAMP | Only if gov cloud path |
| https://cloud.google.com/architecture/multi-tenant | GCP multi-tenant | Secondary reference |
| https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns | SQL tenancy patterns | If you leave Appwrite |
| https://supabase.com/docs/guides/platform/multi-tenancy | Postgres RLS patterns | Analog to row-level scope |
| https://planetscale.com/blog/multi-tenant-data-models | MySQL tenancy | Data modeling reference |
| https://www.prisma.io/docs/guides/multitenancy | Prisma multi-tenant | If ORM layer added |
| https://clerk.com/docs/guides/organizations | Org modeling | Compare to your org units |

*(Area 2 count: 40 — cumulative 75)*

---

## Area 3 — Code quality & testing

### Tier S

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://google.github.io/eng-practices/review/ | Google code review | Agent review standard |
| https://vitest.dev/guide/ | Vitest | `test:unit` |
| https://playwright.dev/docs/intro | Playwright | E2E in CI |
| https://biomejs.dev/guides/getting-started/ | Biome | lint-format scripts |
| In-repo: `.github/workflows/ci.yml` | Lint, authz, build | Agent must green these |
| In-repo: `tests/rbac/api-authz-matrix.test.ts` | API authz matrix | Security gate |
| In-repo: `scripts/new-api-route.ts` | Route scaffold | Consistent gates |

### Tier A

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications | Testing trophy | Balance unit vs E2E |
| https://martinfowler.com/articles/practical-test-pyramid.html | Test pyramid | CI cost control |
| https://testing.googleblog.com/ | Google testing blog | Flake reduction |
| https://github.com/goldbergyoni/javascript-testing-best-practices | JS testing practices | Repo conventions |
| https://eslint.org/docs/latest/use/configure/configuration-files | ESLint flat config | `pnpm lint` |
| https://typescript-eslint.io/ | typescript-eslint | TS strictness |
| In-repo: `.cursor/rules/global-style-guide.mdc` | UI + TSX patterns | Agent alignment |
| https://www.conventionalcommits.org/ | Commit format | Changelog + audits |
| https://trunkbaseddevelopment.com/ | Trunk-based dev | main + cursor branches |
| https://github.com/dependency-check/DependencyCheck | Dependency scanning | Supply chain |
| https://docs.github.com/en/code-security/dependabot | Dependabot | Automated updates |
| https://github.com/OWASP/CheatSheetSeries | OWASP cheat sheets | Secure coding |
| https://snyk.io/learn/secure-code/ | Secure code learning | Dev training |
| https://refactoring.guru/ | Refactoring catalog | Pay down CLM debt |
| https://sourcemaking.com/refactoring | Refactoring patterns | Large file splits |

### Tier B

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://github.com/plantuml-stdlib/C4-PlantUML | C4 diagrams | Architecture docs |
| https://adr.github.io/ | Architecture Decision Records | Decision log |
| https://github.com/strategicml/code-review-excellence | Review excellence | Team norms |
| https://www.thoughtworks.com/radar | Thoughtworks Radar | Tool sanity check |
| https://semver.org/ | Semver | Release tagging |
| https://keepachangelog.com/ | Changelog format | Buyer-facing notes |
| https://github.com/kuchin/awesome-cto | CTO resources | Leadership |
| https://www.softwaretestinghelp.com/ | Testing help | Supplementary |
| https://testcontainers.com/ | Testcontainers | If Docker integration tests |
| https://mswjs.io/ | Mock Service Worker | API mocking |

*(Area 3 count: 32 — cumulative 107)*

---

## Area 4 — UI/UX & design systems

### Tier S

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://www.w3.org/WAI/WCAG22/quickref/ | WCAG 2.2 quick reference | Enterprise a11y |
| https://www.w3.org/WAI/ARIA/apg/ | ARIA Authoring Practices | Dialogs, tables, menus |
| https://ui.shadcn.com/ | shadcn/ui | Component base |
| https://www.radix-ui.com/primitives/docs/overview/introduction | Radix primitives | Accessibility behavior |
| In-repo: `.cursor/rules/global-style-guide.mdc` | CAALM UI law (dialogs, buttons, inputs, switches) | Glass cards, modals |
| In-repo: `design-system/caalm/MASTER.md` | Design system master | Single source |
| In-repo: `.cursor/skills/ui-ux-pro-max/SKILL.md` | UX skill | Agent UI work |

### Tier A

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://www.nngroup.com/articles/enterprise-ux/ | NN/g enterprise UX | Dense admin UIs |
| https://www.nngroup.com/articles/data-tables/ | Data table UX | Contracts/licenses tables |
| https://inclusive-components.design/ | Inclusive components | Patterns |
| https://tailwindcss.com/docs | Tailwind v4 docs | Styling |
| https://carbondesignsystem.com/ | Carbon DS | Enterprise reference |
| https://polaris.shopify.com/ | Polaris | Settings patterns |
| https://atlassian.design/ | Atlassian DS | Admin density |
| https://web.dev/explore/accessible | web.dev a11y | Lighthouse alignment |
| https://developer.mozilla.org/en-US/docs/Web/Accessibility | MDN a11y | Baseline |
| https://www.w3.org/TR/wai-aria-1.2/ | WAI-ARIA spec | Compliance depth |
| In-repo: `.cursor/rules/desktop-first.mdc` | Desktop gate | Product strategy |

### Tier B

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://lawsofux.com/ | Laws of UX | Quick reminders |
| https://www.smashingmagazine.com/category/accessibility/ | Smashing a11y | Articles |
| https://www.a11yproject.com/checklist/ | A11y checklist | QA pass |
| https://deque.com/axe/ | axe tools | Automated a11y |
| https://www.figma.com/best-practices/ | Figma practices | Design handoff |
| https://material.io/design | Material Design | Pattern reference |
| https://www.interaction-design.org/literature | IxD literature | Training |
| https://baymard.com/blog | Baymard e-commerce UX | Form/checkout patterns |
| https://www.designsystems.com/ | Design systems gallery | Inspiration |
| https://component.gallery/ | Component gallery | Naming |

*(Area 4 count: 30 — cumulative 137)*

---

## Area 5 — DevOps, cloud, security & compliance

### Tier S

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://vercel.com/docs | Vercel platform | Hosting |
| https://vercel.com/docs/security | Vercel security | Buyer due diligence |
| https://opentelemetry.io/docs/ | OpenTelemetry | Logs/traces/metrics |
| https://www.aicpa.org/resources/article/trust-services-criteria | SOC 2 TSC | Audit language |
| https://gdpr.eu/ | GDPR overview | EU customers |
| https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/ | ICO GDPR guidance | Engineering tasks |
| In-repo: `.cursor/rules/vercel-env-local-permission.mdc` | Env sync safety | Secret hygiene |
| In-repo: `.github/workflows/run-tests.yml` | E2E workflow | Release gate |

### Tier A

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://musabdulai.com/evidence-kit | Cloud controls evidence kit | SOC 2 prep |
| https://rulemesh.com/guides/gdpr-checklist-for-saas-engineering-teams | GDPR engineering checklist | DSAR/delete |
| https://soc2-auditors.com/soc-2-compliance-checklist | SOC 2 checklist CSV | Control tracking |
| https://www.normgrid.com/soc-2/checklists/control-matrix/ | Control matrix template | Single source of controls |
| https://sre.google/books/ | Google SRE books | Reliability culture |
| https://aws.amazon.com/architecture/well-architected/ | Well-Architected | Reviews |
| https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | Logging cheat sheet | Audit logs |
| https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | Session management | Appwrite sessions |
| https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html | Crypto storage | Files at rest |
| https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions | GH Actions hardening | CI security |
| https://www.cisecurity.org/cis-benchmarks | CIS benchmarks | Infra baseline |
| https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final | NIST 800-53 | Gov RFPs |
| https://www.nist.gov/itl/ai-risk-management-framework | NIST AI RMF | Document AI features |
| https://developer.mozilla.org/en-US/docs/Web/Security | MDN web security | Headers, CSP |
| https://owasp.org/www-project-top-10/ | OWASP Top 10 | Web risks |

### Tier B

| Resource | Summary | Why CAALM |
|----------|---------|-----------|
| https://www.vanta.com/resources | Vanta SOC resources | GRC automation |
| https://drata.com/grc-central | Drata GRC | Alternative |
| https://www.cloudflare.com/learning/ | Cloudflare learning | CDN/WAF |
| https://www.terraform.io/docs | Terraform | If IaC expands |
| https://kubernetes.io/docs/concepts/security/ | K8s security | Only if leaving Vercel |
| https://www.backblaze.com/blog/the-3-2-1-backup-strategy/ | 3-2-1 backups | DR planning |
| https://aws.amazon.com/blogs/architecture/disaster-recovery-dr-architecture-on-aws/ | DR architectures | Playbook |
| https://www.finops.org/introduction/what-is-finops/ | FinOps | Cost control |
| https://www.cloudzero.com/blog/saas-unit-economics/ | SaaS unit economics | Pricing alignment |
| https://slack.engineering/ | Slack eng blog | Ops culture |
| https://netflixtechblog.com/ | Netflix tech | Scale patterns (aspirational) |
| https://stripe.com/blog/engineering | Stripe eng blog | Billing reliability |

*(Area 5 count: 35 — **total catalogued: 172 resources**)*

---

## What you are likely overlooking

1. **Cloud agent hook gap:** User-level ponytail hooks do not run in cloud; project `.cursor/hooks.json` must use repo-relative paths and Node on PATH.
2. **Rule overload:** 30+ always-on rules compete; agents miss conflicts. Consolidate meta-rule into one “read order” rule. **Map:** `docs/internal/cursor-rules-read-order.md` + spine `agent-workflow-principal.mdc` (UI/copy rules are file-scoped).
3. **MCP on cloud vs IDE:** Team MCP dashboard must mirror `.cursor/mcp.json` or agents operate blind on Appwrite.
4. **Audit log as product:** Buyers care as much about immutable audit narrative as feature count. **Decision:** `docs/internal/audit-narrative-decision.md` + rule `audit-narrative.mdc`.
5. **Workflow engine scope creep:** CLM workflows need idempotent state transitions + human tasks, not a second microservice on day one. **Decision:** `docs/internal/workflow-engine-decision.md` + rule `no-workflow-engine-sprawl.mdc`.
6. **ESLint `continue-on-error: true` in CI:** Signals drift; tighten when roadmap pressure eases. **Decision:** `docs/internal/ci-lint-strictness.md` — Lint job must fail closed (no soft-pass).
7. **Desktop-first companion routes:** Mobile scope stays narrow; don’t duplicate admin UI for phones. **Decision:** `docs/internal/desktop-first-decision.md` + rule `desktop-first.mdc`.
8. **Demo vs prod parity gaps:** `Audit Logs.changes` attribute cap — track explicitly in PRs.
9. **AI document extraction:** NIST AI RMF + customer disclosure for Google AI document paths. **Policy:** `docs/internal/ai-document-extraction-policy.md` + rule `ai-document-extraction.mdc`.
10. **Buyer demo script vs code:** Keep `docs/internal/buyer-demo-script.md` synced when integrations change.

---

## Overkill at current stage (defer)

- Microservices / event bus (Kafka) for CLM core
- Full CQRS + event sourcing everywhere
- FedRAMP / HIPAA unless contracted
- Custom MCP for every SaaS integration in cursor/plugins catalog
- Ralph Loop / multi-orchestrator for every feature
- Replacing Appwrite with Postgres RLS migration

---

## Verification

- Agent task dry-run: `graft ask "add API route for X" --source` then `pnpm new:api-route ...`
- CI: `pnpm run test:api-authz && pnpm run build`
- Local UI: Playwright MCP or `pnpm test:e2e` on touched flows

---

## Related deliverables (separate PRs)

| PR branch | Contents |
|-----------|----------|
| `cursor/playbook-doc-0e5f` | This document |
| `cursor/agent-workflow-rules-0e5f` | `.cursor/rules/agent-workflow-principal.mdc` |
| `cursor/agent-prompt-templates-0e5f` | `.cursor/prompt-templates/*.md` |

## Hooks setup

See `docs/internal/cursor-hooks-setup.md` (PR: portable hooks branch).
