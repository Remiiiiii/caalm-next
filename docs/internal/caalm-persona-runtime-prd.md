# CAALM Persona Runtime (CPR) — PRD

**Status:** Accepted for Audit Lab MVP path  
**Date:** 2026-11-27  
**Audience:** Engineering, product, Cursor agents  
**Scope:** Replace Synthesia Interactive + Nuance Live talking-head spend for Audit Lab practice interviews, with a first-party LiveKit-adjacent avatar path. Design the session contract so a future public CAALM Personas API can peel off later.

## Boundary (legal)

This document is a **competitive teardown from public docs** and CAALM’s existing integrations. It does **not** authorize cloning Synthesia avatars, likenesses, meshes, textures, or proprietary weights. CPR personas are **CAALM-owned or licensed** originals. Quality bar: near-photoreal face (Synthesia-class) + Nuance-like head/face motion (expressiveness 0–2).

## Problem

Audit Lab pays third parties for AI talking heads:

| Persona | Backend today | Face | Brain / voice |
|---------|---------------|------|----------------|
| Amara, David | LiveKit + `worker/voice-agent` | Optional Synthesia | Deepgram → Claude → ElevenLabs |
| Simone, Valentina | Nuance Live | Nuance persona | Nuance-hosted LLM + voice; tools back to CAALM |

CAALM already owns consent, roster, transcript, rubric tools, grading, recordings, PII scrub, and residency. Vendors only fill avatar render (Synthesia) or avatar + conversation runtime (Nuance).

## Goals

1. Cut Synthesia and Nuance subscription/credit spend for Audit Lab.
2. Near-photoreal talking-head interviewers from day one (product fidelity bar).
3. Host avatar workers on a **LiveKit-adjacent** container host (same ops pattern as the voice agent).
4. Keep Audit Lab as the only consumer for now; keep the worker session API free of Audit Lab types so a CAALM Personas API can wrap it later.

## Non-goals (v1)

- Competing with Synthesia’s async marketing video studio (batch MP4).
- Training a foundation video model from scratch in the first spike.
- Phone-first dense admin UI.
- A second workflow engine.
- Cloning competitor avatars or likenesses.

## Decisions locked (2026-11-27)

1. **Audit Lab only** now; future public API possible.
2. **Near-photoreal** fidelity from day one (not a cartoon MVP).
3. **LiveKit-adjacent** GPU/container host.
4. Quality targets Synthesia face + Nuance motion; assets are original/licensed.
5. After cutover, leftover spend is speech stack + CPR GPU (see Costs).

## Layer model

| Layer | Job | Today | CPR target |
|-------|-----|-------|------------|
| L0 Transport | WebRTC room | LiveKit / Nuance room | Always CAALM LiveKit |
| L1 Capture | Mic/cam, anon | Browser + worker | Keep |
| L2 STT | Speech → text | Deepgram / Nuance | Pluggable STT (Deepgram first) |
| L3 Brain | Rubric agent + tools | Claude worker / Nuance LLM | One Claude (or chosen) agent |
| L4 TTS | Text → speech | ElevenLabs / Nuance | Pluggable TTS (ElevenLabs first) |
| L5 Avatar | Audio → lip-sync video | Synthesia / Nuance face | **CPR Avatar Worker** |
| L6 Product | Consent, grade, UI | CAALM Audit Lab | Unchanged product surface |

Synthesia is L5 only. Nuance collapses L2–L5. CPR matches the Synthesia split first, then moves Nuance personas onto the same LiveKit path.

## Functional requirements

### FR1 — Session API (stable for future public API)

Inputs conceptually: room join credentials, `avatarId`, `publish_on_behalf` agent identity, optional expressiveness.  
No Audit Lab attempt/session types inside the avatar worker.

### FR2 — Avatar worker

- Join LiveKit as `cpr-avatar-*` with `lk.publish_on_behalf`.
- Receive agent TTS over `lk.audio_stream` DataStream.
- Publish lip-synced video + audio so A/V stay locked.
- Idle / listening / speaking motion; expressiveness 0–2.
- Soft-fail: leave room without killing the audio agent.
- Hard TTL aligned with the 20-minute interview cap.

### FR3 — Persona catalog

Four CAALM interviewers (Amara, David, Simone, Valentina) as owned assets + ElevenLabs voice ids + behavior prompt packs. No Nuance `persona_id` mapping.

### FR4 — Interview brain

Existing rubric tools (`record_response_and_advance`, `flag_clarification_needed`, conclude). Prefer LiveKit `room_finished` for all personas; remove browser `nuance-end` after cutover.

### FR5 — Client

One LiveKit client path in `AuditLabCallContext` after Nuance decommission. Avatar detected via `lk.publish_on_behalf` (already in UI).

### FR6 — Ops

Concurrent limits, residency stamp alignment, usage metering (GPU minutes), kill switch `CPR_AVATAR_ENABLED=false` → audio-only.

## Costs after cutover

### Cancel

- Synthesia Interactive
- Nuance Labs Live

### Still pay

- LiveKit Cloud (rooms, agents, egress)
- Deepgram (STT)
- Anthropic / Claude (brain)
- ElevenLabs (TTS)
- Appwrite + Vercel (product)
- **New: CPR GPU minutes** (avatar containers)

### Shift

Simone/Valentina leave Nuance’s bundle and start consuming Deepgram + Claude + ElevenLabs + GPU like Amara/David.

Savings = Synthesia + Nuance line items, minus GPU minutes and any extra speech usage from ex-Nuance traffic, minus one-time avatar production.

## Delivery slices

1. **GPU avatar spike (this PR family)** — CPR `AvatarSession` + local LiveKit-adjacent runner: TTS audio in → video participant out; wire beside Synthesia behind env flags; prove soft-fail.
2. Photoreal asset pack + real GPU renderer (replace spike stand-in frames).
3. Swap Synthesia plugin off; CPR default for Amara/David.
4. Move Simone/Valentina to LiveKit + CPR; remove Nuance SDK/routes.
5. Metering, concurrency, residency hardening.
6. (Later) Public CAALM Personas API wrapper.

## Acceptance criteria (slice 1 spike)

- [ ] `CPR_AVATAR_ENABLED=true` starts a CPR avatar participant in the LiveKit room (or dry-run skips cleanly).
- [ ] Agent audio routes through `DataStreamAudioOutput` to the CPR identity when avatar starts.
- [ ] Soft-fail / dry-run leaves the interview audio-only.
- [ ] Session contract stays free of Audit Lab domain types.
- [ ] PRD committed at `docs/internal/caalm-persona-runtime-prd.md`.
- [ ] Unit coverage for backend selection env rules.

## Risks

| Risk | Mitigation |
|------|------------|
| GPU $/min exceeds old vendor bills | Meter + audio-only tiers; measure before Nuance cutover |
| Spike frames ≠ photoreal bar | Slice 1 proves wiring; slice 2 ships owned photoreal renderer |
| Likeness / deepfake policy | Consent + CAALM-owned assets only |
| Dual backends during migration | Per-env feature flags |

## Open follow-ups

- Choose GPU SKU / LiveKit Cloud agent host sizing after spike latency numbers.
- Commission four photoreal persona assets with likeness releases if needed.
- Confirm ElevenLabs voice ids per persona before Nuance decommission.
