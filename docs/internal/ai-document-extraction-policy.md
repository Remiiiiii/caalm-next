# Policy: AI on customer documents

**Status:** Accepted  
**Date:** 2026-10-16  
**Audience:** Engineering, product, sales, Cursor agents  

## Purpose

CAALM can send **parts of uploaded contracts and licenses** to an AI service so the product can suggest form fields (dates, parties, amounts). This policy keeps that use **limited, reviewable, and honest** with buyers.

Inspired by [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) ideas: know the risk, keep a human in the loop, be clear with customers. This is an **internal engineering/product policy**, not a public privacy policy or legal advice.

## What we do today

| Step | What happens |
|------|----------------|
| 1 | User uploads a file during **contract or license intake** |
| 2 | CAALM reads text from the file on our side when possible |
| 3 | Text (and related prompts) may go to **Google Gemini** via `GOOGLE_API_KEY` (`src/lib/ai/extractContractFromDocument.ts`, `extractLicenseFromDocument.ts`) |
| 4 | Suggested fields show in the UI for **human review** before submit (`AiExtractionReviewPanel`) |
| 5 | Orgs have a monthly **extraction quota** (billing); system settings include an **AI document extraction** toggle key |

Other Gemini uses (assistant, news assist, audits) are **not** the same as document intake. New document-file AI paths must follow this policy too.

## Hard rules

1. **Human confirms.** Never auto-save or auto-approve a contract/license **only** from AI output. User (or an explicit product flow) must confirm fields.
2. **Minimum data.** Send what is needed for the extraction task. Do not add “send the whole vault to AI” features without a new written decision.
3. **No silent new vendors.** Do not wire a new third-party AI (OpenAI, Anthropic, Google Document AI product, etc.) for document files without updating this doc and product/security review.
4. **Honest sales.** Do not claim “AI never sees your documents” if intake extraction is enabled. Align `buyer-demo-script` and integrations copy with reality.
5. **Failures are safe.** If AI is down or quota is hit, users can still fill forms **manually**.

## Customer disclosure (what to say)

Use plain language in demos, security questionnaires, and docs:

> When AI document extraction is on, CAALM may send text from the uploaded file to Google’s AI so we can suggest form fields. A person in your org should review those suggestions before saving. You can turn extraction off or hit plan limits. Documents are not used to train CAALM’s own models.

Legal/privacy pages may need counsel review for customer-facing contracts; this file does not replace that.

## For agents (Cursor)

- Prefer improving **review UX**, confidence flags, quotas, and manual fallback over “smarter auto-fill with no review.”
- Do not remove the review step or auto-submit extracted values.
- Do not log full document bodies to extra third parties “for debugging.”
- Point product questions here: `.cursor/rules/ai-document-extraction.mdc`.

## When to reopen

- Switching or adding a document AI vendor  
- Sending documents for purposes other than intake field suggestion  
- Training or fine-tuning on customer file contents  
- A signed customer requires a different data path (e.g. VPC-only)

Update **Status/Date** in this file before coding those changes.

## Related

- Playbook overlooking item: AI document extraction  
- Billing quota: `src/lib/billing/aiExtractionQuota.ts`  
- NIST AI RMF (external reference in the playbook Tier list)  
