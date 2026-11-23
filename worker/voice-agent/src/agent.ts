import { cli, defineAgent, voice, WorkerOptions } from "@livekit/agents";
import * as anthropic from "@livekit/agents-plugin-anthropic";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import * as silero from "@livekit/agents-plugin-silero";
import * as synthesia from "@livekit/agents-plugin-synthesia";
import { RoomEvent } from "@livekit/rtc-node";
import { config as loadEnv } from "dotenv";
import {
	buildCoverageSnapshot,
	type CoverageSnapshot,
	VOICE_COVERAGE_TOPIC,
} from "./coverage.js";
import { buildInterviewTools, type SessionUserData } from "./tools.js";
import type { VoiceAgentJobMetadata } from "./types.js";

// Nothing below reads an env var before this runs: the CLI's own --url/--api-key/
// --api-secret option bindings (read at cli.runApp() below) and every plugin's
// apiKey lookup (read inside entry(), called later by the framework) both happen
// after this line.
loadEnv({ path: ".env.local" });
loadEnv(); // fall back to a plain .env if .env.local isn't present

/** Must match `CLAUDE_SONNET_MODEL`'s default in the main app's `claudeChat.ts`. */
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5-5";

/** Independent of the LLM ever calling conclude_interview — never trust the model alone to hang up. */
const HARD_CALL_CAP_MS = 20 * 60 * 1000;

function buildInstructions(metadata: VoiceAgentJobMetadata): string {
	const rubricList = metadata.rubric
		.map((r, i) => `${i + 1}. [${r.questionId}] (${r.difficulty}) ${r.prompt}`)
		.join("\n");
	const first = metadata.rubric[0];
	return `You are a mock auditor conducting a practice interview for "${metadata.sessionTitle}", playing the "${metadata.persona}" persona. Ask ONLY the questions listed below, one at a time, in a natural conversational voice — never invent a new criterion that isn't on this list.

Rubric (cover every item before concluding — order may change based on answer quality):
${rubricList}

Start with this first question (questionId: ${first.questionId}): "${first.prompt}"

Rules:
- After the interviewee answers, call record_response_and_advance with a concise summary, answerQuality (strong|adequate|weak), and any specific record/evidence they cited.
- The tool reply tells you the exact next prompt and questionId — ask that next. Do not invent a different question or reorder on your own.
- If an answer is too vague to grade, call flag_clarification_needed instead and ask ONE bounded follow-up — never ask more than one clarification per item.
- Once every rubric item is recorded, thank them briefly and call conclude_interview.
- Keep your own turns short — this is a spoken conversation, not an essay.`;
}

export default defineAgent({
	prewarm: async (proc) => {
		proc.userData.vad = await silero.VAD.load();
	},
	entry: async (ctx) => {
		await ctx.connect();

		const metadata = JSON.parse(
			ctx.job.metadata || "{}",
		) as VoiceAgentJobMetadata;
		if (!metadata.attemptId || !metadata.rubric?.length) {
			ctx.shutdown("Missing or empty rubric in job metadata");
			return;
		}

		const publishCoverage = async (snapshot: CoverageSnapshot) => {
			try {
				const payload = new TextEncoder().encode(JSON.stringify(snapshot));
				await ctx.room.localParticipant?.publishData(payload, {
					reliable: true,
					topic: VOICE_COVERAGE_TOPIC,
				});
			} catch (err) {
				console.error("[voice-agent] publishCoverage failed", err);
			}
		};

		const firstId = metadata.rubric[0]?.questionId ?? null;

		/** Room metadata is how the main app's pause/resume action (`pauseVoiceInterview`/`resumeVoiceInterview`) reaches this already-running job. */
		function readPausedFromMetadata(raw: string | undefined): boolean {
			try {
				return Boolean(JSON.parse(raw || "{}").paused);
			} catch {
				return false;
			}
		}

		const userData: SessionUserData = {
			attemptId: metadata.attemptId,
			rubric: metadata.rubric,
			covered: new Set<string>(),
			currentQuestionId: firstId,
			publishCoverage,
			paused: readPausedFromMetadata(ctx.room.metadata),
		};
		ctx.room.on(RoomEvent.RoomMetadataChanged, (raw: string) => {
			userData.paused = readPausedFromMetadata(raw);
		});

		await publishCoverage(
			buildCoverageSnapshot({
				rubric: metadata.rubric,
				coveredIds: userData.covered,
				currentQuestionId: firstId,
			}),
		);

		const session = new voice.AgentSession<SessionUserData>({
			userData,
			vad: ctx.proc.userData.vad as silero.VAD,
			stt: new deepgram.STT({ apiKey: process.env.DEEPGRAM_API_KEY }),
			llm: new anthropic.LLM({
				apiKey: process.env.CLAUDE_API_KEY,
				model: process.env.CLAUDE_SONNET_MODEL || DEFAULT_CLAUDE_MODEL,
			}),
			tts: new elevenlabs.TTS({
				apiKey: process.env.ELEVENLABS_API_KEY,
				// Prefer Audit Lab interviewer voice; fall back to the shared app default.
				voiceId:
					process.env.ELEVENLABS_AUDIT_LAB_VOICE_ID?.trim() ||
					process.env.ELEVENLABS_VOICE_ID,
			}),
		});

		const agent = new voice.Agent({
			instructions: buildInstructions(metadata),
			tools: buildInterviewTools(),
		});

		const hardCap = setTimeout(() => {
			void session.close();
		}, HARD_CALL_CAP_MS);
		ctx.addShutdownCallback(async () => {
			clearTimeout(hardCap);
		});

		const synthesiaKey = process.env.SYNTHESIA_API_KEY?.trim();
		const rawAvatarId = process.env.SYNTHESIA_AVATAR_ID?.trim();
		// Studio "Copy ID" is the source gallery id. Sessions need the Interactive id
		// (Prepare / Copy Interactive ID). The plugin also accepts bare UUIDs and adds av_.
		const synthesiaAvatarId = rawAvatarId
			? rawAvatarId.startsWith("av_")
				? rawAvatarId
				: `av_${rawAvatarId}`
			: "";
		const synthesiaDryRun = process.env.SYNTHESIA_DRY_RUN === "true";
		let avatarStarted = false;
		if (synthesiaDryRun) {
			console.log(
				"[voice-agent] SYNTHESIA_DRY_RUN=true; skipping Synthesia avatar call, audio-only",
			);
		} else if (synthesiaKey && synthesiaAvatarId) {
			try {
				const avatar = new synthesia.AvatarSession(
					new synthesia.AvatarConfig({
						avatarIds: [synthesiaAvatarId],
					}),
					{
						apiKey: synthesiaKey,
						avatarParticipantName: "audit-lab-interviewer-avatar",
					},
				);
				await avatar.start(session, ctx.room);
				avatarStarted = true;
			} catch (err) {
				const typed =
					err instanceof synthesia.SynthesiaError
						? { type: err.type, status: err.status, message: err.message }
						: err;
				console.error(
					"[voice-agent] Synthesia avatar failed; continuing audio-only",
					typed,
				);
			}
		} else if (process.env.NODE_ENV === "production") {
			console.error(
				"[voice-agent] SYNTHESIA_API_KEY / SYNTHESIA_AVATAR_ID unset; audio-only interviewer",
			);
		}

		await session.start({
			agent,
			room: ctx.room,
			// When Synthesia owns A/V, disable the agent's own room audio output.
			outputOptions: avatarStarted ? { audioEnabled: false } : undefined,
		});
	},
});

cli.runApp(
	new WorkerOptions({
		agent: import.meta.filename,
		agentName: "audit-lab-interviewer",
	}),
);
