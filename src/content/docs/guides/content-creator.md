---
title: "Content Creator guide"
description: "Publish company news that people read — and keep governance intact."
section: guides
audience: "Content Creator"
---

Company news is how leadership and ops communicate inside CAALM without burying updates in email.

## Home base

`/dashboard/content-creator` — publishing workspace with four tabs:

| Tab | What you do there |
|---|---|
| **Articles** | Create, edit, publish, filter, and bulk-manage native articles |
| **Review queue** | Approve, save as draft, or dismiss items imported from feeds |
| **Connected sources** | Add RSS / Atom / WordPress feeds; connect LinkedIn or X (when enabled) |
| **Analytics** | Views, trends, and engagement for what you publish |

Stat cards at the top (total, published, drafts, this month) refresh from the same analytics source as the Analytics tab.

Tab switches stay on the page (the URL updates with `?tab=…` without a full reload). Deep links still work — for example `/dashboard/content-creator?tab=sources`.

There is **no** `/content-creator` route. Always use `/dashboard/content-creator`.

## Permissions that matter

- `news.create` — draft articles
- `news.update` — edit articles
- `news.publish` — make live or unpublish
- `news.delete` — remove articles
- `news.read` — consume the feed (most users)
- `news.approve` — act on the review queue for imported items
- `news.feeds.manage` — connect and manage feeds / social sources
- `news.ack.manage` — acknowledgment reports and CSV export (when articles require acknowledgment)

You only see actions you have permission for. Admins assign these in roles — CAALM does not bypass checks for “special” roles.

## Publishing workflow (native articles)

1. Open **Articles** and create a new article (or edit a draft).
2. Write a title humans can scan on a dashboard widget.
3. Keep the first paragraph outcome-oriented (“What changed / What to do”).
4. Set type, priority, department audience, and optional schedule / pin / acknowledgment as needed.
5. Publish only when ready — drafts are fine; accidental publishes are not.
6. Check `/company-news` as a normal reader would.

## Imported news (feeds and social)

1. Open **Connected sources**.
2. Add an RSS, Atom, or WordPress API source, or connect LinkedIn / X when your org has production credentials.
3. New items land in **Review queue** as `pending_review` — they do **not** go live automatically.
4. Approve to publish, save as draft to edit first, or dismiss noise.
5. Polling runs on a schedule in the background; consecutive failures back off so a broken feed does not spam the system.

Demo sandboxes may lock social connect — use a production pilot for LinkedIn / X.

## Editorial standards that pay off

- One idea per article
- Link to the CAALM record or workflow when asking people to act
- Avoid dumping policy PDFs without a summary
- Update or retire stale posts that create conflicting instructions
- Prefer acknowledgment only when you truly need proof someone read it

## Analytics

Use the **Analytics** tab to see whether people open what you publish. If nobody reads renewal warnings, change channel, title, or timing — do not just publish harder.

## Related

- [Company news](/docs/reference/company-news) — reader feed and permission map
- [Permissions catalog](/docs/reference/permissions-catalog) — full news keys
- [Roles and home dashboards](/docs/concepts/roles-and-dashboards)
