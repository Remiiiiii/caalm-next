---
title: "Help vs Engineering tickets"
description: "Pick the right lane, claim and close Help tickets, or escalate to Engineering for code fixes."
section: troubleshooting
audience: "Everyone, IT"
---

Tickets in CAALM use two lanes. You pick the lane when you submit so the right people get the right tools.

## Which lane?

| Lane | Use when | What happens |
|---|---|---|
| **Help** | You need access, a device, a network fix, billing help, or a change request | Stays in CAALM. IT claims it and marks it resolved. No GitHub issue by default. |
| **Engineering** | Something in the product is broken or not behaving as expected | Creates a GitHub issue. Staff claim it, then start the fix agent. |

Helpers on the submit form:

- Help: “I need access, a device, or a change”
- Engineering: “Something isn't working the way it should”

## Staff workflow

1. **Claim** — takes ownership in CAALM (`assigneeCaalmUserId`)
2. **Help** — **Mark resolved** when the request is done
3. **Help needs a code fix** — **Escalate to engineering** (creates the GitHub issue, then the agent path works)
4. **Engineering** — **Start fix agent** after claim (optional instructions and attachments)

## Rule of thumb

If IT can finish it without changing product code, use Help. If the fix needs a pull request, use Engineering — or escalate from Help.
