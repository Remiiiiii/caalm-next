---
title: "Audit readiness"
description: "How to set up and use CAALM readiness — snapshots, insights, AI assistant, packet preview, and PDF export for compliance prep."
section: reference
audience: "Compliance, QI / Risk, Organization Admins, Viewers with audit.view"
---

**Audit readiness** helps your organization prepare for reviews using records already in CAALM. It scores live **contracts** and **licenses**, stores weekly/monthly/quarterly snapshots, and can produce a shareable packet with charts.

Route: **`/audits/readiness`**

Packet preview: **`/audits/readiness/preview`**

> [!IMPORTANT]
> **CAALM readiness is not an official audit.** The score and packet reflect data in your CAALM organization. They are not a state, federal, funder, HRSA, DCF, or CPA determination.

Related: [Audits and compliance](/docs/reference/audits) · [Organization settings](/docs/reference/organization-settings) · [Contracts](/docs/reference/contracts) · [Licenses](/docs/reference/licenses)

## Who this is for

People who own compliance prep day to day:

- Quality Improvement / Risk / Compliance leads
- Organization Admins who keep contracts and licenses current
- Viewers who monitor posture (read-only) when they have `audit.view`

You need **`audit.view`** to open the page. You need **`audit.export`** to download the PDF. You need **`settings.edit`** to set timezone and website URL.

## What readiness measures

| Included in the score | Not in the score |
|---|---|
| Contract compliance and expiries (within 90 days) | Public website crawl findings |
| License health, at-risk status, expiries (within 30 days) | Regulatory / documents / governance domains (coming later) |
| Evidence gaps from those live records | External auditor pass/fail outcomes |

If your org has no contracts and no licenses in CAALM, the score shows **N/A** until you add records. Sources used appear as chips (for example `Contracts · Licenses`).

RAG bands:

- **Green** — 85 or higher
- **Amber** — 70–84
- **Red** — below 70

## Evidence map (prep lens)

Insights and packet rows can be tagged to common prep lanes (CFCE-style segment):

- **HRSA OSV** — health center operational site visit style evidence
- **Child-welfare monitoring** — provider / licensing style evidence
- **Financial PBC** — contracts, grants, and related non-finance slice only (not GL, bank recs, or SEFA)

The map helps you gather the right files. It does **not** mean CAALM ran those official audits.

## First-time setup

1. Open [Organization settings](/docs/reference/organization-settings) → **Profile**
2. Set **Timezone** (IANA), for example `America/New_York`  
   Scheduled runs use your org’s **local 9:00** hour.
3. Optionally set **Public website URL** (for example `https://example.org`)  
   Enables a bounded crawl for the informational “Public site” section.
4. Save profile

Without a timezone, CAALM defaults to `America/New_York`. Without a website URL, readiness still works; the site section stays empty.

## Find the feature

- Sidebar → **Audits** → **Audit Readiness**
- Or Audits page tabs: **Readiness** · Compliance status · Audit logs

## Screen tour

| Area | Job |
|---|---|
| Disclaimer banner | Reminds everyone this is CAALM readiness, not an official determination |
| Score + RAG + sources | Live posture from contracts/licenses |
| KPI cards | Critical counts, contracts, licenses at risk, expiries |
| Charts | Domain readiness, severity breakdown, score history |
| Priority insights | Clickable gaps that deep-link into Contracts or Licenses |
| Readiness AI assistant | Auto-summary and Q&A for prep talking points |
| Evidence map | Requirement tags aligned to HRSA / CW / PBC prep |
| Public site | Informational crawl results (not scored) |
| Snapshot history | Filter weekly / monthly / quarterly past runs |

## Day-to-day journey

### 1. Open readiness

Go to `/audits/readiness`. Read the disclaimer, then check score, RAG, and critical count.

### 2. Run a snapshot (recommended first visit)

Click **Run weekly snapshot**.

CAALM will:

1. Pull live contracts and licenses for your default organization
2. Optionally crawl your public site (if a URL is set)
3. Tag insights against the evidence map
4. Generate an AI auto-summary
5. Save a snapshot to history

Use **Refresh** anytime for a live view without saving a new snapshot.

### 3. Work the punch list

1. Open **Priority insights**
2. Click an item to jump to Contracts or Licenses
3. Fix the record (renew, attach file, clear action-required, update expiry)
4. Return to Readiness → Refresh or run another snapshot
5. Confirm critical count and score moved

Treat readiness as a **radar and checklist**, not a certificate.

### 4. Use the AI assistant

On the readiness page:

1. Click **Auto-summary** for an executive write-up grounded in the current snapshot
2. Or ask questions / tap suggestions, for example:
   - Which gaps matter most for HRSA OSV prep?
   - What should we fix before child-welfare monitoring?
   - Which items belong on a financial PBC list?

Answers stay practical and point back into CAALM. They do not invent regulator findings.

### 5. Build a shareable packet

1. Open **Packet preview** (`/audits/readiness/preview`)
2. Review the enterprise layout: disclaimer, KPIs, charts, insights, evidence map, site section, summary
3. **Print** for a browser printout, or
4. **Download PDF** (needs `audit.export`) for a charted packet you can attach to internal prep notes

Use the packet for leadership huddles or site-visit prep binders. Keep the disclaimer visible when you share it.

## Automatic schedule

After timezone is set, CAALM checks each hour and runs when it is **09:00–09:59** in the org’s local time:

| Cadence | Local schedule |
|---|---|
| Weekly | Mondays at 9:00 |
| Monthly | 1st of the month at 9:00 |
| Quarterly | Jan / Apr / Jul / Oct 1st at 9:00 |

Each run stores a snapshot. History charts fill in over time.

### In-app alerts

On **weekly** runs, users in your org with `audit.view` may get an in-app notification when:

- Critical count is greater than 0, **or**
- Score dropped by 5 or more versus the prior weekly run

The notification links back to `/audits/readiness`.

## Example week

| When | What happens |
|---|---|
| Monday ~9:00 | Automatic weekly snapshot; alert if critical items exist |
| Monday morning | QI opens Readiness, reads AI summary, assigns owners via insight links |
| Mid-week | Team renews licenses / clears contract actions in CAALM |
| Later in week | Refresh or new snapshot; history shows improvement |
| Before a visit | Packet preview + PDF for internal leadership |

## Permissions

| Permission | What you can do |
|---|---|
| `audit.view` | Open readiness, run snapshots, use AI, see history, receive alerts |
| `audit.export` | Download the PDF packet |
| `settings.edit` | Set org timezone and website URL |

## What readiness does not do

- Replace an official HRSA, DCF, funder, or CPA audit
- Score your public website into the readiness percentage
- Cover full financial PBC items (general ledger, bank reconciliations, SEFA, payroll)
- Sample clinical charts or EHR records

Those stay outside CAALM or in other systems. Readiness focuses on **contracts, licenses, evidence gaps, and prep packaging**.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Score is N/A | Add contracts and/or licenses; confirm statuses are maintained |
| No scheduled runs | Set org timezone; confirm the org is not suspended |
| Empty public site section | Set website URL in Organization settings → Profile |
| Cannot download PDF | Ask an admin for `audit.export` |
| Page blocked | Ask an admin for `audit.view` |

> [!TIP]
> The best readiness meeting is boring: every insight already has an owner, a file, and a due date in CAALM.
