import { cli, defineAgent, voice, WorkerOptions } from "@livekit/agents";
import * as anthropic from "@livekit/agents-plugin-anthropic";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import * as silero from "@livekit/agents-plugin-silero";
import { config as loadEnv } from "dotenv";
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
		.map((r, i) => `${i + 1}. [${r.questionId}] ${r.prompt}`)
		.join("\n");
	return `You are a mock auditor conducting a practice interview for "${metadata.sessionTitle}", playing the "${metadata.persona}" persona. Ask ONLY the questions listed below, one at a time, in a natural conversational voice — never invent a new criterion that isn't on this list.

Rubric (ask about every item before concluding):
${rubricList}

Rules:
- After the interviewee answers, call record_response_and_advance with a concise summary and any specific record/evidence they cited.
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

		const userData: SessionUserData = {
			attemptId: metadata.attemptId,
			rubric: metadata.rubric,
			covered: new Set<string>(),
		};

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
				voiceId: process.env.ELEVENLABS_VOICE_ID,
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

		await session.start({ agent, room: ctx.room });
	},
});

cli.runApp(
	new WorkerOptions({
		agent: import.meta.filename,
		agentName: "audit-lab-interviewer",
	}),
);
