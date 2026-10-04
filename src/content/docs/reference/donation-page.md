---
title: "Public donation page"
description: "Configure the public /give page, publish amounts and designations, share with attribution, and post card gifts through Stripe."
section: nonprofit
audience: "Development staff, Organization Admins"
---

The public donation page is the org’s online ask. Donors open `/give/{slug}`, pick an amount and program, pay with Stripe (card processor), and CAALM posts a gift on the register — no manual data entry for successful checkouts.

Think of settings as the **stage lights** and the public URL as the **stage**. Draft changes stay backstage until you publish.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Donation page settings | `/settings/donation-page` | Dedicated editor (also available as a tab on Organization settings) |
| Organization settings → Donation | `/settings/organization` | Same editor when you have donation config permission |
| Public give page | `/give/{slug}` | What donors see (no login) |
| Gift register | `/gifts` | Posted online gifts after Stripe confirms payment |

`{slug}` comes from the organization give slug (derived from the org name when you have not set a custom one).

## What you configure

Edit the **draft**, then **publish** so the live page updates.

| Field | What donors see |
|---|---|
| Suggested amounts | Preset dollar buttons (stored as cents under the hood) |
| Frequency | One-time, monthly, or both |
| Designations | Program / fund labels donors can choose |
| Impact statements | Short “your gift does X” copy tied to an amount |
| EIN + legal text | Tax-deductibility language on the page footer |

EIN is shown on the public page for credibility. Keep legal text accurate for your counsel; CAALM does not file with the IRS.

## Draft, preview, publish, revert

1. Open **Donation page settings** (`donations.config.view` to open; `donations.config.edit` to change).
2. Edit amounts, designations, impact lines, and frequency. Draft saves as you go.
3. Use **Preview** to open the public page with a short-lived preview token so you see the draft without publishing.
4. **Publish** when the draft is ready. That version becomes live for everyone.
5. Use **version history** to revert to an earlier published snapshot if something went wrong.

> [!IMPORTANT]
> Unpublished drafts do **not** change `/give/{slug}` for donors. Share, QR, and embed actions require a published page.

Monthly amounts can create Stripe Price objects when you save. Changing a monthly amount retires the old price for new donors; existing subscribers stay on the price they started with.

## How a donation becomes a gift

1. Donor completes Stripe Checkout (one-time payment or monthly subscription).
2. Stripe sends a webhook to CAALM.
3. CAALM finds or creates a constituent (by email/name when available), then posts a card gift.
4. Campaign and share tags from the URL (when present) are stored on the gift.

Monthly renewals post again when Stripe marks the invoice paid (the first payment is already handled at checkout so you do not get a double post).

Open the gift detail to see **share attribution** (source / medium / campaign) when the donor arrived from a tracked link.

## Share the page

On Donation page settings, switch to **Share page** after you publish:

- Copy a clean or campaign-tagged URL
- Email the link through connected Gmail or Outlook Mail (signature included when available)
- Download or copy a QR image
- Copy an embed snippet for your website

Campaign tags use UTM-style query params (`utm_source`, `utm_medium`, `utm_campaign`). Visits and gifts can roll into share analytics on that card so you see which asks performed.

Link a fundraising **campaign** when you want tagged gifts to resolve to a campaign id on the register.

## Permissions

| Key | Meaning |
|---|---|
| `donations.config.view` | Open donation page settings, version history, and share analytics |
| `donations.config.edit` | Edit draft, preview, publish, and revert |
| `gifts.view` | See posted online gifts and campaigns |
| `constituents.view` | Pick constituents when emailing a share link |

Related: [Gifts and campaigns](/docs/reference/gifts-and-campaigns), [Constituents](/docs/reference/constituents), [Permissions catalog](/docs/reference/permissions-catalog#donations), [Mail](/docs/reference/mail).
