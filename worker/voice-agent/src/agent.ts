import { cli, defineAgent, voice, WorkerOptions } from "@livekit/agents";
import * as anthropic from "@livekit/agents-plugin-anthropic";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";
import * as silero from "@livekit/agents-plugin-silero";
import * as synthesia from "@livekit/agents-plugin-synthesia";
import { RoomEvent } from "@livekit/rtc-node";
import { config as loadEnv } from "dotenv";
import {
	buildCoverageSnapshot,
	type CoverageSnapshot,
	MIN_AUDITOR_QUESTION_SPEAK_MS,
	VOICE_COVERAGE_TOPIC,
	VOICE_EVIDENCE_ATTACHED_TOPIC,
} from "./coverage.js";
import {
	buildEvidenceAttachedThinkingNote,
} from "./thinking-notes.js";
import {
	buildInterviewTools,
	publishUserCoverage,
	type SessionUserData,
	unlockAttachAfterAuditorFinishedAsking,
} from "./tools.js";
import type { VoiceAgentJobMetadata } from "./types.js";

/** LiveKit personas (Amara / David). Keep labels aligned with INTERVIEWER_PROFILES. */
const LIVEKIT_PERSONA_PROFILE: Record<
	string,
	{ name: string; behavior: string }
> = {
	by_the_book: {
		name: "Amara",
		behavior:
			"Work through the control framework in order and do not skip steps. Ask precise questions, request the exact policy or evidence, and push politely but firmly when an answer stays general.",
	},
	regulator_style: {
		name: "David",
		behavior:
			"Cite the clause or control before you ask. Want the control owner named, not just the control. If a response would not satisfy an external examiner, say so directly.",
	},
};

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
	const profile = LIVEKIT_PERSONA_PROFILE[metadata.persona];
	const name = profile?.name ?? "the mock auditor";
	const behavior =
		profile?.behavior ??
		"Ask every rubric question in order and follow up on vague answers.";
	const rubricList = metadata.rubric
		.map((r, i) => {
			const evidenceNote = r.requiresEvidence ? " [needs evidence file]" : "";
			return `${i + 1}. [${r.questionId}] (${r.difficulty}) ${r.prompt}${evidenceNote}`;
		})
		.join("\n");
	const first = metadata.rubric[0];
	return `You are ${name}, an AI auditor conducting a practice compliance interview for "${metadata.sessionTitle}". ${behavior}

Ask ONLY the questions listed below, one at a time, in a natural conversational voice — never invent a new criterion that isn't on this list.

Rubric (cover every item before concluding — order may change based on answer quality):
${rubricList}

Start with this first question (questionId: ${first.questionId}): "${first.prompt}"

Rules:
- After the interviewee answers, call record_response_and_advance with a concise summary, answerQuality (strong|adequate|weak), any cited evidence, and evidenceAccepted true/false when a file was attached for an evidence question.
- If evidenceAccepted is false, stay on that question so they can upload a different file. Do not ask the next rubric item yet.
- When you receive a system note that an evidence file was attached (it includes questionId and file name), judge that file against that rubric item and call record_response_and_advance with evidenceAccepted true or false. Do not ignore the attachment.
- The tool may refuse to advance: wait for an attachment, ask a short follow-up after a wrong answer (up to 2 failed attempts), or call skip_current_question when they say they have no answer/evidence and want to move on.
- The tool reply tells you the exact next prompt and questionId — ask that next. Do not invent a different question or reorder on your own.
- If an answer is too vague to grade, call flag_clarification_needed instead and ask ONE bounded follow-up — never ask more than one clarification per item.
- Once every rubric item is recorded (or a wrap-up note arrives listing covered questionIds), thank them briefly and call conclude_interview. Do not invent more questions.
- Keep your own turns short — this is a spoken conversation, not an essay.
- Speak only English. Never claim to be human, and never name the AI model or company behind you.`;
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
			documented: new Set<string>(),
			attachOpen: new Set<string>(),
			failedAttempts: new Map(),
			posed: new Set<string>(),
		};
		let speakStartedAt: number | null = null;
		let speakQuestionId: string | null = null;
		/** Set after AgentSession starts so evidence uploads can nudge the LLM. */
		let sessionRef: voice.AgentSession<SessionUserData> | null = null;
		ctx.room.on(RoomEvent.RoomMetadataChanged, (raw: string) => {
			userData.paused = readPausedFromMetadata(raw);
		});
		// Browser notifies when an evidence upload finishes scanning clean.
		ctx.room.on(
			RoomEvent.DataReceived,
			(payload, _participant, _kind, topic) => {
				if (topic !== VOICE_EVIDENCE_ATTACHED_TOPIC) return;
				try {
					const text = new TextDecoder().decode(payload);
					const data = JSON.parse(text) as {
						questionId?: string;
						fileName?: string;
						prompt?: string;
					};
					const qid = data.questionId?.trim();
					if (!qid) return;
					userData.documented.add(qid);
					// Keep attachOpen so they can replace until accept/advance.
					void publishUserCoverage(userData);
					const rubricItem = userData.rubric.find((r) => r.questionId === qid);
					const prompt =
						rubricItem?.prompt?.trim() ||
						data.prompt?.trim() ||
						"(unknown prompt)";
					const fileName = data.fileName?.trim() || "unknown file";
					sessionRef?.generateReply({
						userInput: buildEvidenceAttachedThinkingNote({
							questionId: qid,
							prompt,
							fileName,
						}),
						allowInterruptions: true,
					});
				} catch (err) {
					console.error("[voice-agent] evidence-attached parse failed", err);
				}
			},
		);

		await publishCoverage(
			buildCoverageSnapshot({
				rubric: metadata.rubric,
				coveredIds: userData.covered,
				currentQuestionId: firstId,
				documentedIds: userData.documented,
				attachOpenIds: userData.attachOpen,
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
			// SDK defaults (500ms/3000ms) assume casual chat. An audit interview
			// expects the interviewee to pause and recall a specific policy or
			// figure — a longer floor avoids cutting them off mid-thought, while
			// adaptive interruption (rather than leaving it to auto-detect) keeps
			// backchannel sounds ("mm-hmm") from being treated as a real interrupt.
			turnHandling: {
				endpointing: { minDelay: 700, maxDelay: 4000 },
				interruption: { mode: "adaptive" },
			},
		});
		sessionRef = session;

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

		// Unlock attach only after a real ask (ignore short connect/hello blips).
		session.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev) => {
			if (ev.newState === "speaking") {
				const qid = userData.currentQuestionId;
				if (qid && !userData.covered.has(qid)) {
					speakStartedAt = Date.now();
					speakQuestionId = qid;
				}
				return;
			}
			if (ev.oldState === "speaking" && ev.newState !== "speaking") {
				const qid = userData.currentQuestionId;
				const spokeLongEnough =
					speakStartedAt != null &&
					speakQuestionId === qid &&
					Date.now() - speakStartedAt >= MIN_AUDITOR_QUESTION_SPEAK_MS;
				speakStartedAt = null;
				speakQuestionId = null;
				if (spokeLongEnough) {
					void unlockAttachAfterAuditorFinishedAsking(userData);
				}
			}
		});

		await session.start({
			agent,
			room: ctx.room,
			// Also strips secondary background voices, which otherwise confuse
			// transcription and turn detection — the interviewee is rarely alone
			// in a quiet room during a real audit interview.
			inputOptions: { noiseCancellation: BackgroundVoiceCancellation() },
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
