# Decision: no separate workflow engine (yet)

**Status:** Accepted  
**Date:** 2026-10-15  
**Audience:** Engineering, product, Cursor agents  

## Decision

Keep **contract and license approval workflows** inside the existing CAALM Next.js + Appwrite app. Do **not** add a second workflow product or external orchestration engine for CLM approvals right now.

## What we have today

Approvals live in-app (for example `src/lib/approvals/`). They track steps, people who must approve, and related UI/API. That matches how buyers experience “send for approval” on a contract or license.

## What we are not doing

- A standalone workflow microservice
- Temporal, Camunda, Conductor, Airflow, or similar for core approvals
- A second “workflow builder” product that competes with Approvals
- Microservices / event-bus rewrite of CLM core “for workflows”

## Why

1. **Focus:** Core CLM (contracts, licenses, permissions, audit) still needs depth.
2. **Size:** One deployable app fits current scale; a second engine adds ops and delay.
3. **Buyer value:** Better approval clarity and audit beats a generic workflow platform logo.

## When to revisit

Reopen this decision only if **written** evidence shows all of:

1. Current approval code cannot meet a **signed** customer requirement without an engine, and  
2. Cost of extending `src/lib/approvals/**` is clearly higher than adopting a known engine, and  
3. Product agrees scope is still CLM approvals — not a new horizontal workflow SaaS.

Record the new decision in this file (update Status/Date) before coding.

## Agent rule

Always-on Cursor rule: `.cursor/rules/no-workflow-engine-sprawl.mdc`.

## Related

- Playbook “overlooking” item: workflow engine scope creep  
- Playbook days 61–90: fuller engine ADR if stage changes  
- Overkill list: microservices / event bus for CLM core — deferred  
