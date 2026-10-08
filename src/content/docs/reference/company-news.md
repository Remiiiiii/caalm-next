---
title: "Company news"
description: "Read the internal feed, acknowledge required posts, and publish with feeds and review."
section: reference
audience: "Everyone, Content Creators"
---

Company news keeps operational communication inside the same system people already open for deadlines.

## Where readers go

- **Dashboard widget** — short list on role home dashboards (carousel on many admin / executive shells)
- **Full feed** — `/company-news`

### Full feed (`/company-news`)

- Stats: total articles, this month, categories
- Filters: search, type, department
- Empty state when nothing is published yet
- Acknowledgment banner when a live article requires you to confirm you read it

Readers with create or feed-manage permission see links into the Content Creator workspace when the feed is empty.

## Where authors go

**Content Creator home:** `/dashboard/content-creator`

| Area | Purpose |
|---|---|
| Articles | Native drafts, publish, bulk actions |
| Review queue | Imported items waiting for approval |
| Connected sources | RSS / Atom / WordPress + LinkedIn / X |
| Analytics | Engagement and trends |

Deep link example: `/dashboard/content-creator?tab=sources`.

Do not use `/content-creator` — that path redirects to the dashboard route.

Full playbook: [Content Creator guide](/docs/guides/content-creator).

## Permission keys

| Key | Use |
|---|---|
| `news.read` | View the feed (and drafts where allowed) |
| `news.create` | Draft native articles |
| `news.update` | Edit articles |
| `news.publish` | Publish / unpublish |
| `news.delete` | Delete articles |
| `news.approve` | Approve, draft, or dismiss review-queue items |
| `news.feeds.manage` | Manage feeds and social connections |
| `news.ack.manage` | Acknowledgment reports / CSV export |

Access is permission-based. Holding “Content Creator” as a role name is not enough without the keys above.

## Acknowledgments

Authors can mark an article as requiring acknowledgment (with an optional due date). Readers see a banner until they acknowledge. Managers with `news.ack.manage` can review and export acknowledgment data for compliance.

## Writing for action

Bad: “Please be advised of updates to processes.”

Better: “Facility license renewal packet due Friday — owners listed below — upload evidence in Licenses.”

Link people to the CAALM screen where work happens.

## Related

- [Content Creator guide](/docs/guides/content-creator)
- [Dashboards](/docs/reference/dashboards)
- [Desktop, tablet, and phone](/docs/concepts/desktop-and-mobile) — news is available as a phone companion surface
