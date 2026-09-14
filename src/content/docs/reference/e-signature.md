---
title: "E-signature (CAALM Execute)"
description: "Send approved contracts and licenses for electronic signature, track status, and activate when everyone has signed."
section: reference
audience: "Contract managers, License managers, Admins, Signers"
---

CAALM Execute is the built-in electronic signature tool. After internal [approvals](/docs/reference/approvals) finish, you send the PDF for legal execution — not a casual checkbox.

Think of it like a secure package: you name the signers, stamp where they sign, email the link, and CAALM records who signed (or declined) and when.

## When to use it

| Situation | Use CAALM Execute? |
|---|---|
| Contract or license is approved and waiting for wet-ink or DocuSign-style signing | Yes — status is usually **Pending Signature** |
| Wording is still changing | No — finish [Negotiate](/docs/reference/negotiate) first |
| Internal review / approve only | No — use [Approvals](/docs/reference/approvals) |
| Explaining why something expired (attestation) | No — that acknowledgment is separate from legal execution |

> [!TIP]
> Approvals say “the org accepts this.” E-signature says “the parties executed it.” Keep those steps distinct so audit history stays honest.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Prepare & send | `/esign/prepare/contract/[id]` or `/esign/prepare/license/[id]` | Add signers, place fields, message, send |
| Signer link (guest) | `/sign/[token]` | Review PDF, consent, sign or decline (no CAALM login) |
| E-Sign disclosure | `/sign/disclosure` | Legal explanation of electronic signing |
| Contracts / Licenses row menu | `/contracts`, `/licenses` | **Send for signature** when status allows |
| Approval flow dialog | Contract or license workflow | **Send for signature** after approvals complete |

Preparing a package needs a laptop. Guest signing links and the disclosure page work on a phone. See [Desktop, tablet, and phone](/docs/concepts/desktop-and-mobile).

## Who can send

| Person | Permission | Can do |
|---|---|---|
| Contract sender | `contracts.sign` | Open prepare workspace and send for a contract |
| License sender | `licenses.sign` | Same for a license |
| Viewer without sign | view only | See status; cannot send |
| Invited signer | magic link | Sign or decline without a CAALM account |

The row action **Send for signature** appears when the record is in **Pending Signature** and you have the matching `.sign` permission.

## Happy path (sender checklist)

1. Finish approvals so the record moves to **Pending Signature**
2. Open **Send for signature** from the row menu or the approval flow dialog
3. **Add signers** — email (required) and name; use **Add myself** when you countersign
4. **Place fields** — pick a signer, drag stamps onto the PDF (at least one **Signature** field per signer)
5. **Add message** (optional) — personal note in the invitation email
6. Click **Send** — CAALM emails each signer a secure link (except in demo; see below)
7. Watch status on the prepare page and on the contract/license badge
8. When everyone has signed, the record activates and a sealed signed PDF is stored

## Prepare workspace steps

The wizard uses four steps:

1. **Add signers** — one or more people; duplicate emails are cleaned up
2. **Place fields** — stamps: Signature, Date, Name, Email, Text
3. **Add message** — optional email body; leave blank for the default
4. **Send** — validates that every signer has a Signature stamp

### Message variables

You can insert:

- `{signer.name}` — recipient name
- `{signer.email}` — recipient email
- `{document.name}` — document title

### Validation before send

If a signer has no Signature field, CAALM blocks send and lists who is missing. Fix the stamps, then send again.

### After you send

- Envelope status moves off **draft** (for example **sent**, **viewed**, **partially_signed**)
- The prepare page can show signing links (useful when email is delayed or you are in demo)
- Declined, voided, or expired packages start a **new** wizard the next time you open prepare (prior signers are prefilled)

## What signers see

1. Open the email link → `/sign/[token]`
2. Review the electronic signature disclosure (and the full page at `/sign/disclosure` if they want detail)
3. Fill required fields; draw or type a signature where stamps require it
4. Submit to finish, or **Decline** if they will not sign
5. Download a PDF copy for their records when signing succeeds

Invalid, expired, voided, or already-used links show a clear error instead of a blank page.

## Status meanings

| Envelope / display | Meaning |
|---|---|
| Draft | Package exists but is not sent |
| Sent | Invitations went out; nobody has signed yet |
| Viewed | At least one signer opened the link |
| Partially signed / countersign | Some signers done; others still outstanding |
| Completed | Everyone signed; sealed PDF created |
| Declined | A signer refused; start a new package if you still need signatures |
| Voided / Expired | Package is dead; prepare a new one |

On contracts and licenses you will often see badges like **Pending Signature** or **Pending Countersign** while the envelope is in flight. When signing completes, the resource moves to **active** and `digitalSignatureStatus` becomes completed.

## What happens when everyone has signed

CAALM Execute:

1. Seals a signed PDF onto the envelope
2. Marks the contract or license **active**
3. Writes an audit event (“E-signature completed”)
4. Notifies the owner and signers that the package finished

That is legal execution of the document — not the same as an internal approval click or an expiration attestation.

## Acknowledgment vs legal execution

| Flow | What it proves | Where it lives |
|---|---|---|
| **CAALM Execute** | Parties signed the agreement under e-sign consent | Prepare + `/sign/[token]` |
| **Approvals** | Internal reviewers accepted the proposal | [Approvals](/docs/reference/approvals) |
| **Expiration attestation** | Someone explained why a record expired | Dashboard / attestation dialogs |

Do not treat an attestation or an approval as a substitute for Execute when policy requires a signed instrument.

## Demo sandbox

In the [demo sandbox](/docs/learn/demo-sandbox), invitation emails are not sent. After **Send**, copy signing links from the prepare workspace and open them yourself to walk the signer flow.

## Troubleshooting

| Symptom | What to check |
|---|---|
| No **Send for signature** action | Need `contracts.sign` or `licenses.sign`, and status **Pending Signature** |
| Send blocked | Every signer needs a Signature stamp on the PDF |
| Signer says email never arrived | Use signing links on the prepare page; confirm the email address |
| Link says invalid | Envelope may be voided, declined, expired, or already finished |
| Stuck on countersign | Open prepare and see who has not signed yet |
| Need to retry after a decline | Re-open prepare — CAALM starts a fresh package |

## Permissions

- `contracts.sign` — prepare and send contract envelopes
- `licenses.sign` — prepare and send license envelopes
- Viewing status still needs the usual `contracts.view` / `licenses.view`

Full key list: [Permissions catalog](/docs/reference/permissions-catalog).

## Related

- [Lifecycle of a record](/docs/concepts/lifecycle) — where execution sits in the loop
- [Approvals](/docs/reference/approvals) — must finish before send-for-signature
- [Contracts](/docs/reference/contracts) · [Licenses](/docs/reference/licenses)
- [Desktop, tablet, and phone](/docs/concepts/desktop-and-mobile)
