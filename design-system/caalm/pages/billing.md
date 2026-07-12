# Billing & Integrations — page overrides

> Overrides [`MASTER.md`](../MASTER.md) for `/settings/billing`.
> Mobbin research (2026-07-11) + CAALM glass-first tokens.

---

## Layout

- Page container: `w-full px-4 sm:px-6 lg:px-8 xl:px-12`
- Header: `h1 capitalize sidebar-gradient-text` + short subtitle
- Tabs: Billing | Integrations (shadcn `Tabs`)
- Section spacing: `space-y-6` / `mb-6`
- Content grids: `gap-6` (not `gap-4`)
- Cards: `glass-card` + `glass-card-cap`; no legacy `bg-white/30`

## Billing tab (Mobbin-informed)

Patterns from:

- [TIDAL subscription](https://mobbin.com/screens/38028871-6268-416e-9df5-be192294f4ac) — plan hero + Change Plan + cancel link
- [Dovetail billing](https://mobbin.com/screens/11d6060d-68e3-412b-b6bc-340da0f2e3ee) — plan card, upcoming invoice, invoice list with download
- [Base44 manage subscription](https://mobbin.com/screens/905cd729-ed46-4bd8-8645-07f96ace09eb) — subscription details + payment + billing history cards
- [v0 billing and usage](https://mobbin.com/screens/a0f856d3-94c3-4edc-a567-32eb9d73e348) — usage progress bars + Manage via portal

### Structure

1. **Plan overview card** — plan name, status badge (`active` / `trialing` / `past_due` / `canceled`), price/interval, renewal date
2. **Primary CTA** — Manage billing → Stripe Customer Portal (`primary-btn`)
3. **Secondary CTA** — Change / Upgrade plan → Checkout
4. **Usage meters** — Progress bars for storage, seats, departments, contracts
5. **Plan upgrade section** — monthly/yearly toggle + tier cards
6. **Invoice history table** — date, amount, status, PDF link; empty state with Lucide icon

### Stat / usage cards

- No `CardHeader`; content in `CardContent` with `p-4 sm:p-6`
- Title: `text-sm font-medium sidebar-gradient-text`
- Values: `text-slate-900` / muted `text-slate-600`

## Integrations tab (Mobbin-informed)

Patterns from:

- [Rox integrations](https://mobbin.com/screens/3e819b97-b78d-4adc-86ea-b100a8e6e9e7) — Connected vs Not connected sections; status badges; Connect CTA
- [Chatbase integrations](https://mobbin.com/screens/9d24c903-7050-4e16-b34e-71da42107d2c) — card grid with logo, description, Connect/Connected
- [Apollo integrations](https://mobbin.com/screens/e4e07047-5579-43e7-87f4-b61a25df1e46) — connected list + available Connect buttons
- [incident.io integrations](https://mobbin.com/screens/c24ec995-b467-42a5-97fa-92310162c211) — search + connected status cards

### Structure

- Grid: `grid-cols-1 md:grid-cols-2 gap-6`
- Each card: logo/icon, title, description, status badge, last sync, Connect / Disconnect / Configure
- Outlook: real OAuth via existing `/api/microsoft/*`
- Tier-gated (Growth+: API/Webhooks; Enterprise: SSO) — locked state with upgrade hint; no role bypasses

## Interaction

- `cursor-pointer` on clickable cards/buttons
- `transition-all duration-200`
- Focus: `focus-visible:ring-2 focus-visible:ring-[#0f5384]/40`
- No `scale-*` on cards
- Lucide icons only

## Permissions

- Page: `settings.billing` OR `settings.integrations`
- Billing tab / APIs: `settings.billing`
- Integrations tab: `settings.integrations`

## Stripe test catalog (verified)

| Product | Stripe ID | Monthly | Yearly |
|---------|-----------|---------|--------|
| CAALM Starter | `prod_UrsY8xHlfRCU3z` | `price_1Ts8nnEcIRVzi89ssgnJqT5O` ($79) | `price_1Ts8o1EcIRVzi89shUqLqfxd` |
| CAALM Growth | `prod_UrsYVP25KIDdt6` | `price_1Ts8o3EcIRVzi89s2e0HMLdS` ($299) | `price_1Ts8o4EcIRVzi89sT5qx4zsN` |
| CAALM Enterprise | `prod_UrsYNL7QlzzNCV` | `price_1Ts8o6EcIRVzi89sI4fjcZ0r` ($999) | `price_1Ts8o7EcIRVzi89sjETnxfVI` |

Local checkout/webhook walkthrough:

1. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local` (price IDs already mapped).
2. Run `stripe listen --forward-to localhost:3000/api/billing/webhooks` and copy the CLI webhook secret.
3. Open `/settings/billing`, complete test Checkout, confirm org `billingStatus` + `subscriptionTier` update via webhook.
