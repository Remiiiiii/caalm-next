# CAALM Voice Agent (Audit Lab — Practice & Roleplay, Phase 1)

A [LiveKit Agents](https://docs.livekit.io/agents/) Node worker: the live AI
mock-auditor that conducts voice interviews for Audit Lab's Practice &
Roleplay tab. This is a **separate, always-on process** — it cannot run
inside the main Next.js app's serverless functions, since it has to hold a
live STT→LLM→TTS pipeline open for the duration of each call.

See `C:\Users\victo\.claude\plans\shimmying-tickling-cherny.md` (or ask for a
copy) for the full architecture this implements.

## What it does

1. The main app dispatches a job into a LiveKit room when someone starts a
   voice interview (`POST /api/audit-lab/practice` with
   `action: "start_voice"`).
2. This worker picks up that job, reads the rubric (the session's question
   bank) from the job metadata, and runs a Claude-powered interviewer that
   asks each rubric question, records answers, and asks one bounded
   follow-up when an answer is too vague.
3. Every answered question is persisted back to the main app immediately
   (`POST /api/audit-lab/practice/voice/turn`), so a dropped call never loses
   the transcript so far.
4. When the call ends, LiveKit's `room_finished` webhook (received by the
   main app, not this worker) triggers grading and scorecard generation —
   see `src/app/api/webhooks/livekit/route.ts` in the main repo.

## Running it

From the **repo root**, `pnpm run dev` starts Next.js and this worker together
(`dev:web` + `dev:voice`). You can still run the worker alone:

```bash
cd worker/voice-agent
cp .env.example .env.local   # fill in real values — see below
pnpm install                 # from the repo root also works (it's a workspace member)
pnpm dev                     # LiveKit Agents' dev mode (hot reload, connects to LIVEKIT_URL)
# or from repo root: pnpm run dev:voice
```

## Production deployment

This worker is a **separate deployable from the main Next.js app** — it is
not part of the Vercel deployment. There are two ways to run it in
production:

### Option A — LiveKit Cloud's own agent hosting (recommended)

Since this already runs against a LiveKit Cloud project, LiveKit Cloud can
host the worker itself as a container — no separate VM/Fly.io/Railway
account needed. [Source: [LiveKit CLI agent docs](https://docs.livekit.io/reference/developer-tools/livekit-cli/agent.md), [deployment quickstart](https://docs.livekit.io/deploy/agents/quickstart.md), [managing deployments](https://docs.livekit.io/deploy/agents/managing-deployments.md)]

```bash
# Once, on your machine: install the CLI and link it to your LiveKit Cloud account
winget install LiveKit.LiveKitCLI        # macOS/Linux: see the docs above for brew/curl
lk cloud auth

cd worker/voice-agent
# First deploy — registers the agent, writes livekit.toml, builds + ships a container.
# Loads every KEY=value in secrets.env as an encrypted secret (don't commit that file).
lk agent create --secrets-file ./secrets.env
```

`lk agent create` needs a `Dockerfile`; it generates one for you if the
directory doesn't already have one. `secrets.env` should hold everything in
`.env.example` **except** `LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`
— LiveKit Cloud injects those three for you automatically since the agent
runs inside that same project, and `LIVEKIT_API_SECRET` specifically can't
be overridden as a secret.

To ship a change after editing the worker's code:

```bash
lk agent deploy
```

To change a secret value later (e.g. rotating `VOICE_AGENT_SHARED_SECRET`,
or updating `NEXT_PUBLIC_APP_URL` once you know your Vercel domain) without a
full redeploy:

```bash
lk agent update-secrets --secrets-file=./secrets.env
```

(merges by default — add `--overwrite` to fully replace, not just add keys).
`lk agent status`, `lk agent logs`, and `lk agent rollback` cover the rest —
run `lk agent --help` for the current flags, since this CLI moves fast.

### Option B — bring your own host

Anywhere that can run a long-lived Node process works: Fly.io, Railway, a
small VM, ECS, etc. `pnpm build && pnpm start` (LiveKit Agents' `start` mode
registers with the LiveKit server and waits for dispatched jobs — no HTTP
server to expose, just outbound network access to `LIVEKIT_URL`, Anthropic,
ElevenLabs, Deepgram, and `NEXT_PUBLIC_APP_URL`). You'd write your own
Dockerfile/deploy config for this path — there isn't one in this repo, since
Option A's generated one is specific to LiveKit Cloud's build.

### Either way, two things change from local dev

- **`NEXT_PUBLIC_APP_URL`** must point at the main app's real production URL
  (e.g. your Vercel production domain), not `http://localhost:3000` — the
  worker calls this from wherever *it* runs, which can't reach your laptop.
- **LiveKit's webhook destination** (in your LiveKit Cloud project settings,
  not this worker) must point at
  `https://<your-production-domain>/api/webhooks/livekit`, so `room_finished`
  events reach the deployed main app instead of nothing.

## Environment variables

See `.env.example`. Four are shared with the main app (use the same values):
`LIVEKIT_*`, `CLAUDE_API_KEY`/`CLAUDE_SONNET_MODEL`, `ELEVENLABS_API_KEY`.
Set `ELEVENLABS_AUDIT_LAB_VOICE_ID` for the interviewer voice (falls back to
`ELEVENLABS_VOICE_ID` if unset). Two are new to this worker: `DEEPGRAM_API_KEY`
(speech-to-text — sign up at console.deepgram.com) and
`VOICE_AGENT_SHARED_SECRET` (must match the same env var in the main app exactly).

## Guardrails

- The agent is only ever given the session's real question bank as its
  rubric — the system prompt and the `record_response_and_advance` tool's
  schema both reject any `questionId` that isn't one of those real IDs, so
  it can't grade against an invented criterion.
- A hard 20-minute wall-clock cap ends the call even if the model never
  calls `conclude_interview`.

## Phase 3 capabilities

- Browser camera + optional Synthesia talking-head (`SYNTHESIA_API_KEY` / `SYNTHESIA_AVATAR_ID`).
- Client-side voice anonymization before mic publish; live captions PII-scrubbed.
- RoomComposite egress copied into Appwrite practice recordings bucket.
- Transcript redaction + `audit_lab.view_practice_pii` / `manage_practice_media`.
- `AUDIT_LAB_DATA_RESIDENCY_REGION` stamped on attempts (required in production).
- LiveKit Cloud region and Appwrite region must match that stamp (no multi-cloud failover).
