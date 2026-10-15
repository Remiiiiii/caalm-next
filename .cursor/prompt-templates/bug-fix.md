# Template: Bug fix / regression

Copy into Agent chat and fill `[brackets]`.

---

**Symptom:** [What the user sees — wrong UI, error message, bad data]

**Reproduce:** [Exact click path / API call / role / org]

**Expected:** [Correct behavior in one sentence]

**Actual:** [What happens instead]

**Suspected area:** [domain or file hints if known — or “unknown”]

**Context first:**
1. Run `graft ask "[symptom + domain]" --source` before editing.
2. Confirm root cause with evidence (log, failing test, code path) — do not guess-patch.

**Constraints:**
- Smallest correct fix only — no drive-by refactors or unrelated cleanup.
- Keep tenant scope and permission checks intact; do not add role bypasses.
- Remove any debug logs added while investigating before done.

**Acceptance:**
- [ ] Reproduce steps no longer fail
- [ ] Regression covered: [vitest | playwright | manual] — [brief how]
- [ ] No new scope beyond the bug

**Out of scope:** [what not to touch]
