# Agent prompt templates

On Plan mode or “make a plan”, the agent auto-picks or asks **A–K** (see `.cursor/rules/plan-prompt-templates.mdc`). Fill `[brackets]` **in memory only** — never rewrite these files.

| Key | File | Use |
|-----|------|-----|
| **A** | `feature-delivery.md` | API + UI feature |
| **B** | `roadmap-batch-pr.md` | Roadmap batch PR |
| **C** | `security-rbac-review.md` | Pre-merge RBAC review |
| **D** | `ui-page.md` | New app page |
| **E** | `schema-migration.md` | Appwrite schema + demo sync |
| **F** | — | Other (no template) |
| **G** | `bug-fix.md` | Bug fix / regression |
| **H** | `fix-ci.md` | Fix CI / failing checks |
| **I** | `permission-rbac-seed.md` | New permission + role seed (prod + demo) |
| **J** | `audit-write-path.md` | Audit who/what/when/tenant on writes |
| **K** | `ui-dialog.md` | Dialog or shared UI component |

Playbook: `docs/internal/principal-engineer-playbook.md`
