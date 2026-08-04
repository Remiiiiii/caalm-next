---
name: sales
description: >-
  Anthropic Sales plugin skills adapted for Cursor. Use for CAALM go-to-market
  work: prospect research, call prep, outreach drafts, pipeline review, forecast,
  call summaries, daily briefing, competitive intel, and sales assets. Trigger
  when the user mentions sales, prospecting, outreach, pipeline, forecast, call
  prep, battlecards, or deal strategy.
---

# Sales skills (Cursor)

Open-source skills from [anthropics/knowledge-work-plugins/sales](https://github.com/anthropics/knowledge-work-plugins/tree/main/sales) (Apache-2.0). Adapted for Cursor agent skills — not installed into the CAALM product app.

## When to load a child skill

| Need | Load |
|------|------|
| Company / person intel | [sales-account-research](../sales-account-research/SKILL.md) |
| Prep for a sales call | [sales-call-prep](../sales-call-prep/SKILL.md) |
| Summarize call notes | [sales-call-summary](../sales-call-summary/SKILL.md) |
| Morning priorities | [sales-daily-briefing](../sales-daily-briefing/SKILL.md) |
| Cold / warm outreach | [sales-draft-outreach](../sales-draft-outreach/SKILL.md) |
| Competitor battlecard | [sales-competitive-intelligence](../sales-competitive-intelligence/SKILL.md) |
| Landing page / deck / one-pager | [sales-create-an-asset](../sales-create-an-asset/SKILL.md) |
| Weighted forecast | [sales-forecast](../sales-forecast/SKILL.md) |
| Pipeline health / weekly plan | [sales-pipeline-review](../sales-pipeline-review/SKILL.md) |

## How to use in Cursor

1. Ask in plain language, e.g. "Research Acme Corp before my demo" or "Draft outreach to their VP of Compliance".
2. Paste call notes, CRM CSV exports, or deal lists when the skill asks for them.
3. Optional connectors (CRM, Gong, Clay, etc.) are documented in [sales-connectors.md](../sales-connectors.md) — they only work if you configure matching MCP servers in Cursor.

## License

See [SALES-PLUGIN-LICENSE.txt](../SALES-PLUGIN-LICENSE.txt) (Apache-2.0). Upstream README: [sales-README.md](../sales-README.md).
