# Fundraising intelligence (gift officers)

This guide explains how to use donor scores in CAALM without technical setup steps.

## Who can see scores

Only staff with the **ai.fundraising** permission see the Intelligence tab on a constituent profile. Everyone else keeps access to contact info and gifts according to their normal permissions.

## What the card shows

After the nightly RFM (recency, frequency, monetary) job runs, each donor with posted gifts may show:

- **Lifecycle segment** (for example Champion or At-risk)
- **Lapse risk** (0–100, higher means more likely to stop giving)
- **Upgrade readiness** (0–100, higher means a larger ask is reasonable)
- **Suggested ask** (model amount in dollars)
- **Top drivers** (plain-language reasons the numbers moved)

If scores are not ready yet, the tab shows an empty state. It does not fill the card with zeros.

## Suggested ask and overrides

The model starts from recent gifts, applies an upgrade factor from readiness, and caps the result when you have imported a **capacity band** from an external screen.

Gift officers can **override** the ask with a dollar amount and a short reason. Overrides are audited like other constituent changes.

## Import a wealth screen (capacity)

CAALM does **not** scrape wealth data. You may **import a wealth screen** CSV from vendors such as DonorSearch or iWave:

1. Open a constituent → **Intelligence** tab.
2. In **Constituent wealth**, upload the CSV.
3. Map columns (constituent id, capacity, source, date, external score).
4. Import. Cross-organization ids are rejected.

Imported capacity bands cap suggested asks on the next score recompute.

## Do-not-contact donors

Constituents marked **Do not contact** are skipped when scores are recomputed. They will not show intelligence scores meant for outreach.
