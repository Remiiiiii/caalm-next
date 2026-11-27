"use client";

/**
 * Owns the live Audit Lab practice-interview call (LiveKit `Room`, transcript
 * log, rubric coverage, roster) above the router so navigating away from the
 * interview page does not end the call. The full stage (`VoiceInterviewPanel`)
 * and the minimized `FloatingCallWidget` are both thin consumers of this
 * context — there is exactly one `Room`/transcript array for the life of the
 * call, never a separate one per mounted UI.
 */

import {
	createNuanceConversation,
	type Conversation as NuanceConversation,
	type ToolCall as NuanceToolCall,
} from "@nuancelabs/js-sdk";
import {
	ConnectionQuality,
	type LocalTrack,
	type RemoteTrack,
	Room,
	RoomEvent,
	Track,
	type TranscriptionSegment,
} from "livekit-client";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import type { TranscriptTurn } from "@/components/audit-lab/voice/TranscriptPanel";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	AttachmentSource,
	ReviewSessionParticipantRow,
} from "@/lib/audit-lab/types";
import { createAnonymizedMicStream } from "@/lib/audit-lab/voice/anonymize-audio";
import {
	retryInterviewAttachment,
	uploadInterviewAttachment,
} from "@/lib/audit-lab/voice/attachments-client";
import {
	type InterviewAdvanceState,
	buildInterviewCoverage,
	createEmptyInterviewState,
	decideRecordAndAdvance,
	decideSkipQuestion,
	markEvidenceAttached,
	unlockAttachAfterAuditorFinishedAsking,
} from "@/lib/audit-lab/voice/advance-interview";
import {
	type AnswerQuality,
	buildCoverageSnapshot,
	type CoverageSnapshot,
	isAttachControlVisible,
	MIN_AUDITOR_QUESTION_SPEAK_MS,
	VOICE_COVERAGE_TOPIC,
	VOICE_EVIDENCE_ATTACHED_TOPIC,
} from "@/lib/audit-lab/voice/coverage";
import {
	NUANCE_FLAG_CLARIFICATION_TOOL,
	NUANCE_RECORD_RESPONSE_TOOL,
	NUANCE_SKIP_QUESTION_TOOL,
} from "@/lib/audit-lab/voice/nuance";
import { redactPii } from "@/lib/audit-lab/voice/pii";
import {
	buildEvidenceAttachedThinkingNote,
	buildInterviewWrapUpThinkingNote,
} from "@/lib/audit-lab/voice/thinking-notes";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

export type CallPhase = "idle" | "consent" | "connecting" | "live" | "ended";

/** The common shape of LiveKit's LocalTrack/RemoteTrack and Nuance's VideoTrack/AudioTrack — enough to attach/detach without caring which backend produced the track. */
type AttachableVideoTrack = {
	attach: (el: HTMLVideoElement) => unknown;
	detach: () => unknown;
};

/**
 * Mirrors LiveKit's own Reconnecting/Reconnected/ConnectionQualityChanged
 * events as a parallel status, same pattern as `interviewStatus` — the
 * engine already retries the connection internally, so this is UI feedback
 * only and never overrides `phase` except on a real `Disconnected`.
 */
export type ConnectionStatus = "healthy" | "reconnecting" | "degraded";

export type CallSessionMeta = {
	title?: string;
	department?: string;
	framework?: string;
	auditorLabel: string;
};

function parseCoveragePayload(payload: Uint8Array): CoverageSnapshot | null {
	try {
		const text = new TextDecoder().decode(payload);
		const data = JSON.parse(text) as CoverageSnapshot;
		if (!Array.isArray(data.items) || typeof data.total !== "number") {
			return null;
		}
		// Older workers may omit attachOpen / hasDocument — default closed.
		data.items = data.items.map((item) => ({
			...item,
			hasDocument: Boolean(item.hasDocument),
			attachOpen: Boolean(item.attachOpen),
			requiresEvidence: Boolean(item.requiresEvidence),
		}));
		return data;
	} catch {
		return null;
	}
}

/** questionIds with a landed, scanned-clean attachment — feeds the RubricPanel "document ✓ / statement only" chip via `buildCoverageSnapshot`'s `documentedIds`. */
function documentedQuestionIds(turns: TranscriptTurn[]): string[] {
	return turns
		.filter((t) => t.kind === "attachment" && t.attachmentStatus === "attached")
		.map((t) => t.questionId)
		.filter((id): id is string => Boolean(id));
}

function isAvatarParticipant(attributes: Record<string, string> | undefined) {
	if (!attributes) return false;
	return Boolean(
		attributes["lk.publish_on_behalf"] ||
			attributes.lk_publish_on_behalf ||
			attributes.avatar === "true",
	);
}

type AuditLabCallContextValue = {
	phase: CallPhase;
	attemptId: string | null;
	elapsed: number;
	caption: string;
	coverage: CoverageSnapshot | null;
	participants: ReviewSessionParticipantRow[];
	transcriptTurns: TranscriptTurn[];
	micOn: boolean;
	camOn: boolean;
	hasRemoteVideo: boolean;
	interviewStatus: string;
	connectionStatus: ConnectionStatus;
	isFacilitator: boolean;
	audioAnonymized: boolean;
	sessionMeta: CallSessionMeta | null;
	isMinimized: boolean;

	minimizeCall: () => void;
	restoreCall: () => void;
	prepareCall: (params: {
		sessionId: string;
		persona: string;
		isFacilitator: boolean;
		sessionMeta: CallSessionMeta;
	}) => Promise<{ ok: true } | { ok: false; error: string }>;
	cancelPendingCall: () => void;
	confirmConsentAndConnect: (audioAnonymized: boolean) => Promise<void>;
	endOrLeaveCall: () => Promise<void>;
	toggleMic: () => void;
	toggleCam: () => Promise<void>;
	togglePause: () => void;
	setAudioAnonymized: (next: boolean) => Promise<void>;

	registerLocalVideoEl: (el: HTMLVideoElement | null) => void;
	registerRemoteVideoEl: (el: HTMLVideoElement | null) => void;

	attachFile: (
		file: File,
		source: AttachmentSource,
		questionId?: string,
		replyToText?: string,
	) => Promise<void>;
	retryAttachment: (turn: TranscriptTurn, file: File) => Promise<void>;
};

const AuditLabCallContext = createContext<AuditLabCallContextValue | null>(
	null,
);

export function useAuditLabCall(): AuditLabCallContextValue {
	const ctx = useContext(AuditLabCallContext);
	if (!ctx) {
		throw new Error("useAuditLabCall must be used within AuditLabCallProvider");
	}
	return ctx;
}

export function AuditLabCallProvider({ children }: { children: ReactNode }) {
	const { toast } = useToast();
	const [phase, setPhase] = useState<CallPhase>("idle");
	const [attemptId, setAttemptId] = useState<string | null>(null);
	const [caption, setCaption] = useState("");
	const [startedAt, setStartedAt] = useState<number | null>(null);
	const [elapsed, setElapsed] = useState(0);
	const [coverage, setCoverage] = useState<CoverageSnapshot | null>(null);
	const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
	const [participants, setParticipants] = useState<
		ReviewSessionParticipantRow[]
	>([]);
	const [transcriptTurns, setTranscriptTurns] = useState<TranscriptTurn[]>([]);
	const [micOn, setMicOn] = useState(true);
	const [camOn, setCamOn] = useState(true);
	const [interviewStatus, setInterviewStatus] = useState("live");
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>("healthy");
	const [isFacilitator, setIsFacilitator] = useState(false);
	const [audioAnonymized, setAudioAnonymizedState] = useState(true);
	const [sessionMeta, setSessionMeta] = useState<CallSessionMeta | null>(null);
	/** True once the user minimizes the live overlay from its own header — distinct from route (`FloatingCallWidget` already covers leaving the page); reset on every new call so a stale minimize doesn't carry into the next one. */
	const [isMinimized, setIsMinimized] = useState(false);

	const rubricRef = useRef<
		Array<{
			questionId: string;
			prompt: string;
			difficulty: string;
			requiresEvidence?: boolean;
		}>
	>([]);
	/** Nuance-path advance gate state (LiveKit worker owns its own copy). */
	const interviewStateRef = useRef<InterviewAdvanceState>(
		createEmptyInterviewState(),
	);
	/** When the avatar started speaking the current question (Nuance unlock gate). */
	const nuanceSpeakStartRef = useRef<{
		questionId: string;
		startedAt: number;
	} | null>(null);
	const roomRef = useRef<Room | null>(null);
	const attemptIdRef = useRef<string | null>(null);
	const audioContainerRef = useRef<HTMLDivElement | null>(null);
	const localVideoElRef = useRef<HTMLVideoElement | null>(null);
	const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
	// LiveKit's LocalTrack/RemoteTrack and Nuance's VideoTrack both expose
	// attach(el)/detach(), so one pair of refs serves both call backends.
	const localVideoTrackRef = useRef<AttachableVideoTrack | null>(null);
	const remoteVideoTrackRef = useRef<{
		track: AttachableVideoTrack;
		attributes?: Record<string, string>;
	} | null>(null);
	const anonymizerStopRef = useRef<(() => void) | null>(null);
	const captionSegmentIdRef = useRef<string | null>(null);
	const pendingRef = useRef<{
		roomName: string;
		token: string;
		livekitUrl: string;
	} | null>(null);

	/** "nuance" for Simone/Valentina (see roleplay.ts `backend`); otherwise the LiveKit room + worker path. */
	const backendRef = useRef<"livekit" | "nuance">("livekit");
	const nuanceConversationRef = useRef<NuanceConversation | null>(null);
	const nuanceUnsubsRef = useRef<Array<() => void>>([]);
	const nuanceAudioElRef = useRef<HTMLAudioElement | null>(null);
	const notifyEvidenceAttachedRef = useRef<
		(meta: {
			questionId: string;
			fileName?: string;
			replyToText?: string;
		}) => Promise<void>
	>(async () => undefined);

	const registerLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
		localVideoElRef.current = el;
		if (el && localVideoTrackRef.current) {
			localVideoTrackRef.current.attach(el);
		}
	}, []);

	const registerRemoteVideoEl = useCallback((el: HTMLVideoElement | null) => {
		remoteVideoElRef.current = el;
		const pending = remoteVideoTrackRef.current;
		if (el && pending) {
			const preferAvatar = isAvatarParticipant(pending.attributes);
			if (preferAvatar || !el.srcObject) {
				pending.track.attach(el);
				setHasRemoteVideo(true);
			}
		}
	}, []);

	useEffect(() => {
		if (phase !== "live" || !startedAt) return;
		const id = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startedAt) / 1000));
		}, 1000);
		return () => clearInterval(id);
	}, [phase, startedAt]);

	// Call object lives for the whole app session; only disconnects on full teardown.
	useEffect(() => {
		return () => {
			anonymizerStopRef.current?.();
			void roomRef.current?.disconnect();
			for (const unsub of nuanceUnsubsRef.current) unsub();
			void nuanceConversationRef.current?.disconnect();
			if (attemptIdRef.current) void leaveSession(attemptIdRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onParticipantsUpdate = useCallback(
		(payload: ReviewSessionParticipantRow) => {
			if (!payload?.$id || payload.attemptId !== attemptIdRef.current) return;
			setParticipants((prev) => {
				const idx = prev.findIndex((p) => p.$id === payload.$id);
				if (idx < 0) return [...prev, payload];
				const next = [...prev];
				next[idx] = payload;
				return next;
			});
		},
		[],
	);
	useRealtime({
		collectionId: appwriteConfig.reviewSessionParticipantsCollectionId,
		enabled: phase === "live",
		onUpdate: onParticipantsUpdate,
	});

	const onTranscriptUpdate = useCallback(
		(payload: TranscriptTurn & { attemptId?: string }) => {
			if (!payload?.$id || payload.attemptId !== attemptIdRef.current) return;
			let merged: TranscriptTurn[] = [];
			setTranscriptTurns((prev) => {
				const idx = prev.findIndex((t) => t.$id === payload.$id);
				merged = idx < 0 ? [...prev, payload] : prev.map((t, i) => (i === idx ? payload : t));
				return merged;
			});
			if (payload.questionId && rubricRef.current.length > 0) {
				const documented = documentedQuestionIds(merged);
				if (
					payload.kind === "attachment" &&
					payload.attachmentStatus === "attached"
				) {
					markEvidenceAttached(
						interviewStateRef.current,
						payload.questionId,
					);
					void notifyEvidenceAttachedRef.current({
						questionId: payload.questionId,
						fileName: payload.fileName,
						replyToText: payload.replyToText,
					});
				}
				setCoverage((prev) => {
					const coveredIds = new Set(prev?.coveredIds ?? []);
					if (payload.kind !== "attachment") {
						coveredIds.add(payload.questionId as string);
					}
					const state = interviewStateRef.current;
					return buildCoverageSnapshot({
						rubric: rubricRef.current,
						coveredIds:
							backendRef.current === "nuance"
								? state.covered
								: coveredIds,
						currentQuestionId:
							backendRef.current === "nuance"
								? state.currentQuestionId
								: (prev?.currentQuestionId ?? null),
						documentedIds: documented,
						attachOpenIds: state.attachOpen,
					});
				});
			}
		},
		[],
	);
	useRealtime({
		collectionId: appwriteConfig.reviewTranscriptTurnsCollectionId,
		enabled: phase === "live",
		onUpdate: onTranscriptUpdate,
	});

	const onAttemptUpdate = useCallback(
		(payload: { $id?: string; status?: string }) => {
			if (!payload?.$id || payload.$id !== attemptIdRef.current) return;
			if (payload.status) setInterviewStatus(payload.status);
		},
		[],
	);
	useRealtime({
		collectionId: appwriteConfig.reviewAttemptsCollectionId,
		enabled: phase === "live",
		onUpdate: onAttemptUpdate,
	});

	async function postPracticeAction(
		action: string,
		extra?: Record<string, unknown>,
	) {
		if (!attemptIdRef.current) return;
		await fetch("/api/audit-lab/practice", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action,
				attemptId: attemptIdRef.current,
				...extra,
			}),
		});
	}

	function toggleMic() {
		const next = !micOn;
		if (backendRef.current === "nuance") {
			const user = nuanceConversationRef.current?.user;
			if (user) void (next ? user.unmuteAudio() : user.muteAudio());
		} else {
			const room = roomRef.current;
			for (const pub of room?.localParticipant.trackPublications.values() ??
				[]) {
				if (pub.track?.kind === Track.Kind.Audio) {
					if (next) pub.track.unmute();
					else pub.track.mute();
				}
			}
		}
		setMicOn(next);
		void postPracticeAction("set_av_state", { micOn: next });
	}

	async function toggleCam() {
		const next = !camOn;
		try {
			if (backendRef.current === "nuance") {
				const user = nuanceConversationRef.current?.user;
				if (user) await (next ? user.enableVideo() : user.disableVideo());
			} else {
				await roomRef.current?.localParticipant.setCameraEnabled(next);
			}
		} catch {
			/* camera toggle failures already surface via the initial enable attempt */
		}
		setCamOn(next);
		void postPracticeAction("set_av_state", { camOn: next });
	}

	function togglePause() {
		void postPracticeAction(interviewStatus === "paused" ? "resume" : "pause");
	}

	function minimizeCall() {
		setIsMinimized(true);
	}

	function restoreCall() {
		setIsMinimized(false);
	}

	async function endInterview() {
		anonymizerStopRef.current?.();
		anonymizerStopRef.current = null;
		if (backendRef.current === "nuance") {
			for (const unsub of nuanceUnsubsRef.current) unsub();
			nuanceUnsubsRef.current = [];
			await nuanceConversationRef.current?.disconnect();
			nuanceConversationRef.current = null;
			nuanceAudioElRef.current?.remove();
			nuanceAudioElRef.current = null;
		} else {
			await roomRef.current?.disconnect();
		}
		setPhase("ended");
	}

	/** No LiveKit `room_finished` webhook exists for a Nuance call, so grading has to be triggered from here instead. */
	async function postNuanceEnd(attemptId: string) {
		try {
			await fetch("/api/audit-lab/practice/voice/nuance-end", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ attemptId }),
			});
		} catch (err) {
			console.error("[AuditLabCallContext] nuance-end", err);
		} finally {
			void leaveSession(attemptId);
		}
	}

	async function endOrLeaveCall() {
		if (isFacilitator) await postPracticeAction("end_voice");
		if (backendRef.current === "nuance" && attemptIdRef.current) {
			void postNuanceEnd(attemptIdRef.current);
		}
		await endInterview();
	}

	async function publishAnonymizedMic(room: Room) {
		const raw = await navigator.mediaDevices.getUserMedia({ audio: true });
		const anon = await createAnonymizedMicStream(raw);
		if (!anon) {
			for (const t of raw.getTracks()) t.stop();
			await room.localParticipant.setMicrophoneEnabled(true);
			return false;
		}
		anonymizerStopRef.current = () => {
			anon.stop();
			for (const t of raw.getTracks()) t.stop();
		};
		const track = anon.stream.getAudioTracks()[0];
		if (!track) {
			anonymizerStopRef.current();
			await room.localParticipant.setMicrophoneEnabled(true);
			return false;
		}
		await room.localParticipant.publishTrack(track, {
			name: "anonymized-mic",
			source: Track.Source.Microphone,
		});
		return true;
	}

	async function setAudioAnonymized(next: boolean) {
		const room = roomRef.current;
		if (!room) {
			setAudioAnonymizedState(next);
			return;
		}
		await postPracticeAction("consent", { audioAnonymized: next });
		anonymizerStopRef.current?.();
		anonymizerStopRef.current = null;
		for (const pub of [...room.localParticipant.trackPublications.values()]) {
			if (pub.track?.kind === Track.Kind.Audio) {
				await room.localParticipant.unpublishTrack(pub.track);
			}
		}
		if (next) {
			const ok = await publishAnonymizedMic(room);
			if (!ok) {
				toast({
					title: "Voice anonymization",
					description:
						"Could not anonymize your mic. Using the normal microphone instead.",
				});
			}
		} else {
			await room.localParticipant.setMicrophoneEnabled(true);
		}
		setAudioAnonymizedState(next);
	}

	/** Seeds roster/transcript/rubric from Appwrite right after joining, so a refresh mid-call doesn't start blank. */
	async function seedSessionState(id: string) {
		try {
			const res = await fetch(`/api/audit-lab/practice/${id}/session`);
			const json = (await res.json()) as {
				data?: {
					currentQuestionId: string | null;
					participants: ReviewSessionParticipantRow[];
					transcriptTurns: TranscriptTurn[];
					rubric: Array<{
						questionId: string;
						prompt: string;
						difficulty: string;
						requiresEvidence?: boolean;
					}>;
				};
			};
			if (!res.ok || !json.data) return;
			rubricRef.current = json.data.rubric;
			const documented = documentedQuestionIds(json.data.transcriptTurns);
			const coveredIds = (json.data.transcriptTurns ?? [])
				.filter((t) => (t as TranscriptTurn).kind !== "attachment")
				.map((t) => t.questionId)
				.filter((id): id is string => Boolean(id));
			interviewStateRef.current = {
				...createEmptyInterviewState(
					json.data.rubric,
					json.data.currentQuestionId ?? null,
				),
				covered: new Set(coveredIds),
				documented: new Set(documented),
			};
			nuanceSpeakStartRef.current = null;
			setParticipants(json.data.participants);
			setTranscriptTurns(json.data.transcriptTurns);
			if (json.data.rubric.length > 0) {
				setCoverage((prev) =>
					prev
						? prev
						: buildInterviewCoverage(interviewStateRef.current),
				);
			}
		} catch (err) {
			console.error("[AuditLabCallContext] seedSessionState", err);
		}
	}

	async function joinSession(id: string) {
		try {
			await fetch("/api/audit-lab/practice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "join", attemptId: id }),
			});
			await seedSessionState(id);
		} catch (err) {
			console.error("[AuditLabCallContext] join", err);
		}
	}

	async function leaveSession(id: string) {
		try {
			await fetch("/api/audit-lab/practice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "leave", attemptId: id }),
			});
		} catch (err) {
			console.error("[AuditLabCallContext] leave", err);
		}
	}

	async function prepareCall({
		sessionId,
		persona,
		isFacilitator: facilitator,
		sessionMeta: meta,
	}: {
		sessionId: string;
		persona: string;
		isFacilitator: boolean;
		sessionMeta: CallSessionMeta;
	}): Promise<{ ok: true } | { ok: false; error: string }> {
		try {
			const res = await fetch("/api/audit-lab/practice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "start_voice", sessionId, persona }),
			});
			const json = (await res.json()) as {
				error?: string;
				data?: {
					attempt?: { $id: string };
					backend?: "nuance";
					roomName?: string;
					token?: string;
					livekitUrl?: string;
				};
			};
			if (!res.ok)
				throw new Error(json.error || "Could not start the interview.");
			const data = json.data;
			const isNuance = data?.backend === "nuance";
			if (
				!data?.attempt ||
				(!isNuance && (!data.roomName || !data.token || !data.livekitUrl))
			) {
				throw new Error("The interview didn't come back fully set up.");
			}
			backendRef.current = isNuance ? "nuance" : "livekit";
			setAttemptId(data.attempt.$id);
			attemptIdRef.current = data.attempt.$id;
			setParticipants([]);
			setTranscriptTurns([]);
			rubricRef.current = [];
			setCoverage(null);
			setHasRemoteVideo(false);
			setMicOn(true);
			setCamOn(true);
			setIsMinimized(false);
			setInterviewStatus("live");
			setConnectionStatus("healthy");
			setIsFacilitator(facilitator);
			setSessionMeta(meta);
			pendingRef.current = isNuance
				? null
				: {
						roomName: data.roomName as string,
						token: data.token as string,
						livekitUrl: data.livekitUrl as string,
					};
			setPhase("consent");
			return { ok: true };
		} catch (err) {
			return {
				ok: false,
				error: toUserFacingErrorMessage(err, "Could not start the interview."),
			};
		}
	}

	function cancelPendingCall() {
		pendingRef.current = null;
		setAttemptId(null);
		setPhase("idle");
	}

	/**
	 * Nuance manages microphone capture internally with no raw-stream hook, so
	 * the anonymized-mic pipeline (`publishAnonymizedMic`) doesn't carry over —
	 * record consent truthfully and tell the user instead of silently ignoring it.
	 */
	async function connectNuance(initialAudioAnonymized: boolean) {
		if (initialAudioAnonymized) {
			toast({
				title: "Voice anonymization",
				description:
					"This interviewer doesn't support voice anonymization yet. Continuing with your normal microphone.",
			});
		}
		await fetch("/api/audit-lab/practice", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "consent",
				attemptId: attemptIdRef.current,
				audioAnonymized: false,
			}),
		});

		const conversation = createNuanceConversation({
			token: async () => {
				const res = await fetch("/api/audit-lab/practice/voice/nuance-token", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ attemptId: attemptIdRef.current }),
				});
				const json = (await res.json()) as {
					error?: string;
					data?: { token: string };
				};
				if (!res.ok || !json.data) {
					throw new Error(
						json.error || "Could not start the voice interviewer.",
					);
				}
				return json.data.token;
			},
		});
		nuanceConversationRef.current = conversation;

		const unsubs: Array<() => void> = [];
		unsubs.push(
			conversation.onChange((event) => {
				if (event.type === "tracks-changed") {
					const { videoTrack, audioTrack } = conversation.avatar;
					if (videoTrack) {
						remoteVideoTrackRef.current = { track: videoTrack };
						if (remoteVideoElRef.current) {
							videoTrack.attach(remoteVideoElRef.current);
							setHasRemoteVideo(true);
						}
					}
					if (audioTrack && !nuanceAudioElRef.current) {
						const el = document.createElement("audio");
						el.autoplay = true;
						audioTrack.attach(el);
						audioContainerRef.current?.appendChild(el);
						nuanceAudioElRef.current = el;
					}
					const userVideoTrack = conversation.user.videoTrack;
					if (userVideoTrack) {
						localVideoTrackRef.current = userVideoTrack;
						if (localVideoElRef.current)
							userVideoTrack.attach(localVideoElRef.current);
					}
				} else if (
					event.type === "speaking-changed" &&
					event.participant === "avatar"
				) {
					const state = interviewStateRef.current;
					const qid = state.currentQuestionId;
					if (event.isSpeaking) {
						// Start (or refresh) the ask timer only for the active question.
						if (qid && !state.covered.has(qid)) {
							nuanceSpeakStartRef.current = {
								questionId: qid,
								startedAt: Date.now(),
							};
						}
					} else {
						const speak = nuanceSpeakStartRef.current;
						nuanceSpeakStartRef.current = null;
						const spokeLongEnough =
							speak &&
							speak.questionId === qid &&
							Date.now() - speak.startedAt >= MIN_AUDITOR_QUESTION_SPEAK_MS;
						// Ignore connect blips / short hellos — attach stays locked until a real ask.
						if (
							spokeLongEnough &&
							unlockAttachAfterAuditorFinishedAsking(state)
						) {
							setCoverage(buildInterviewCoverage(state));
						}
					}
				} else if (event.type === "session-ended") {
					setPhase((p) => (p === "live" ? "ended" : p));
					if (attemptIdRef.current) void postNuanceEnd(attemptIdRef.current);
				}
			}),
		);
		unsubs.push(
			conversation.onToolCall(async (call) => {
				try {
					const result = await handleNuanceToolCall(call);
					await conversation.sendToolResult(call.callId, result);
				} catch (err) {
					await conversation.sendToolResult(call.callId, {
						error: {
							message:
								err instanceof Error
									? err.message
									: "Could not record that turn.",
						},
					});
				}
			}),
		);
		const handleBeforeUnload = () => {
			if (!attemptIdRef.current) return;
			fetch("/api/audit-lab/practice/voice/nuance-end", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ attemptId: attemptIdRef.current }),
				keepalive: true,
			}).catch(() => undefined);
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		unsubs.push(() =>
			window.removeEventListener("beforeunload", handleBeforeUnload),
		);
		nuanceUnsubsRef.current = unsubs;

		await conversation.connect();

		setStartedAt(Date.now());
		setPhase("live");
		void joinSession(attemptIdRef.current as string);
	}

	async function persistNuanceTurn(params: {
		questionId: string;
		answerSummary: string;
		citedEvidence?: string;
		answerQuality: AnswerQuality;
	}): Promise<{ error?: string }> {
		const attemptId = attemptIdRef.current;
		if (!attemptId) return { error: "No active attempt." };
		const res = await fetch("/api/audit-lab/practice/voice/nuance-turn", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				attemptId,
				questionId: params.questionId,
				answerSummary: params.answerSummary,
				citedEvidence: params.citedEvidence,
				answerQuality: params.answerQuality,
			}),
		});
		const json = (await res.json()) as { error?: string };
		if (!res.ok) return { error: json.error || "Could not record that turn." };
		return {};
	}

	async function handleNuanceToolCall(call: NuanceToolCall): Promise<string> {
		if (!attemptIdRef.current) return "No active attempt.";
		const state = interviewStateRef.current;

		if (call.name === NUANCE_FLAG_CLARIFICATION_TOOL) {
			const reason = String(call.arguments?.reason ?? "that answer");
			const questionId = String(call.arguments?.questionId ?? "");
			if (questionId) {
				state.currentQuestionId = questionId;
				setCoverage(buildInterviewCoverage(state));
			}
			return `Ask a single, specific follow-up addressing: ${reason}. Do not move to a new rubric item yet.`;
		}

		if (call.name === NUANCE_SKIP_QUESTION_TOOL) {
			const questionId = String(call.arguments?.questionId ?? "");
			const reason = String(
				call.arguments?.reason ?? "interviewee asked to move on",
			);
			const decision = decideSkipQuestion(state, { questionId, reason });
			if (decision.action === "blocked") return decision.message;
			const persisted = await persistNuanceTurn({
				questionId,
				answerSummary: `Skipped by interviewee: ${reason}`,
				answerQuality: decision.quality,
			});
			if (persisted.error) return persisted.error;
			setCoverage(buildInterviewCoverage(state));
			await nudgeNuanceWrapUpIfDone(state);
			return decision.message;
		}

		if (call.name === NUANCE_RECORD_RESPONSE_TOOL) {
			const questionId = String(call.arguments?.questionId ?? "");
			const qualityRaw = String(call.arguments?.answerQuality ?? "adequate");
			const answerQuality: AnswerQuality =
				qualityRaw === "strong" ||
				qualityRaw === "adequate" ||
				qualityRaw === "weak"
					? qualityRaw
					: "adequate";
			const evidenceAcceptedRaw = call.arguments?.evidenceAccepted;
			const evidenceAccepted =
				typeof evidenceAcceptedRaw === "boolean"
					? evidenceAcceptedRaw
					: undefined;
			const decision = decideRecordAndAdvance(state, {
				questionId,
				answerQuality,
				evidenceAccepted,
			});
			if (decision.action === "blocked") {
				// Wrong evidence reopens the paperclip — refresh coverage even when blocked.
				setCoverage(buildInterviewCoverage(state));
				return decision.message;
			}
			const persisted = await persistNuanceTurn({
				questionId,
				answerSummary: String(call.arguments?.answerSummary ?? ""),
				citedEvidence:
					typeof call.arguments?.citedEvidence === "string"
						? call.arguments.citedEvidence
						: undefined,
				answerQuality: decision.quality,
			});
			if (persisted.error) return persisted.error;
			setCoverage(buildInterviewCoverage(state));
			await nudgeNuanceWrapUpIfDone(state);
			return decision.message;
		}

		return `Unknown tool "${call.name}".`;
	}

	async function nudgeNuanceWrapUpIfDone(state: InterviewAdvanceState) {
		if (state.currentQuestionId) return;
		if (state.covered.size === 0) return;
		const conversation = nuanceConversationRef.current;
		if (!conversation) return;
		try {
			await conversation.append(
				"thinking",
				buildInterviewWrapUpThinkingNote({
					wrapUpTool: "end_call",
					coveredQuestionIds: [...state.covered],
				}),
			);
		} catch (err) {
			console.error("[AuditLabCallContext] nuance wrap-up notify", err);
		}
	}

	notifyEvidenceAttachedRef.current = async (meta) => {
		const rubricItem = interviewStateRef.current.rubric.find(
			(r) => r.questionId === meta.questionId,
		);
		const prompt =
			rubricItem?.prompt?.trim() || meta.replyToText?.trim() || "(unknown prompt)";
		const fileName = meta.fileName?.trim() || "unknown file";
		if (backendRef.current === "nuance") {
			const conversation = nuanceConversationRef.current;
			if (!conversation) return;
			try {
				await conversation.append(
					"thinking",
					buildEvidenceAttachedThinkingNote({
						questionId: meta.questionId,
						prompt,
						fileName,
						wrapUpTool: "end_call",
					}),
				);
			} catch (err) {
				console.error("[AuditLabCallContext] nuance evidence notify", err);
			}
			return;
		}
		const room = roomRef.current;
		if (!room?.localParticipant) return;
		try {
			const payload = new TextEncoder().encode(
				JSON.stringify({
					questionId: meta.questionId,
					fileName,
					prompt,
				}),
			);
			await room.localParticipant.publishData(payload, {
				reliable: true,
				topic: VOICE_EVIDENCE_ATTACHED_TOPIC,
			});
		} catch (err) {
			console.error("[AuditLabCallContext] livekit evidence notify", err);
		}
	};

	async function confirmConsentAndConnect(initialAudioAnonymized: boolean) {
		if (!attemptIdRef.current) return;
		setPhase("connecting");
		setAudioAnonymizedState(initialAudioAnonymized);
		if (backendRef.current === "nuance") {
			try {
				await connectNuance(initialAudioAnonymized);
			} catch (err) {
				setPhase("idle");
				toast({
					title: "Voice interview",
					description: toUserFacingErrorMessage(
						err,
						"Could not connect to the voice interviewer. Check your microphone permission.",
					),
					variant: "destructive",
				});
			}
			return;
		}
		if (!pendingRef.current) return;
		try {
			await fetch("/api/audit-lab/practice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "consent",
					attemptId: attemptIdRef.current,
					audioAnonymized: initialAudioAnonymized,
				}),
			});

			const room = new Room();
			roomRef.current = room;
			room.on(
				RoomEvent.TranscriptionReceived,
				(segments: TranscriptionSegment[]) => {
					for (const seg of segments) {
						if (seg.final) {
							if (captionSegmentIdRef.current === seg.id) {
								captionSegmentIdRef.current = null;
								setCaption("");
							}
							continue;
						}
						if (!seg.text) continue;
						captionSegmentIdRef.current = seg.id;
						setCaption(redactPii(seg.text));
					}
				},
			);
			room.on(RoomEvent.Disconnected, () => {
				anonymizerStopRef.current?.();
				anonymizerStopRef.current = null;
				if (attemptIdRef.current) void leaveSession(attemptIdRef.current);
				setPhase((p) => (p === "live" ? "ended" : p));
			});
			room.on(RoomEvent.Reconnecting, () => {
				setConnectionStatus("reconnecting");
			});
			room.on(RoomEvent.Reconnected, () => {
				setConnectionStatus("healthy");
			});
			room.on(
				RoomEvent.ConnectionQualityChanged,
				(quality: ConnectionQuality, participant) => {
					if (!participant.isLocal) return;
					setConnectionStatus((current) => {
						if (current === "reconnecting") return current;
						if (
							quality === ConnectionQuality.Poor ||
							quality === ConnectionQuality.Lost
						) {
							return "degraded";
						}
						return "healthy";
					});
				},
			);
			room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
				if (topic && topic !== VOICE_COVERAGE_TOPIC) return;
				const next = parseCoveragePayload(payload);
				if (!next) return;
				// Keep local gate sets aligned with the worker snapshot for attach checks.
				interviewStateRef.current.currentQuestionId = next.currentQuestionId;
				interviewStateRef.current.covered = new Set(next.coveredIds);
				interviewStateRef.current.documented = new Set(
					next.items.filter((i) => i.hasDocument).map((i) => i.questionId),
				);
				interviewStateRef.current.attachOpen = new Set(
					next.items.filter((i) => i.attachOpen).map((i) => i.questionId),
				);
				setCoverage(next);
			});
			room.on(
				RoomEvent.TrackSubscribed,
				(track: RemoteTrack, _pub, participant) => {
					if (track.kind === Track.Kind.Audio) {
						const el = track.attach();
						audioContainerRef.current?.appendChild(el);
						return;
					}
					const attributes = participant.attributes as Record<string, string>;
					remoteVideoTrackRef.current = { track, attributes };
					const el = remoteVideoElRef.current;
					if (!el) return;
					const preferAvatar = isAvatarParticipant(attributes);
					if (preferAvatar || !el.srcObject) {
						track.attach(el);
						setHasRemoteVideo(true);
					}
				},
			);
			room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
				if (track.kind === Track.Kind.Audio) {
					for (const el of track.detach()) el.remove();
					return;
				}
				if (track.kind === Track.Kind.Video) {
					track.detach();
					remoteVideoTrackRef.current = null;
					setHasRemoteVideo(false);
				}
			});
			room.on(RoomEvent.LocalTrackPublished, (pub) => {
				const track = pub.track as LocalTrack | undefined;
				if (!track || track.kind !== Track.Kind.Video) return;
				localVideoTrackRef.current = track;
				if (localVideoElRef.current) track.attach(localVideoElRef.current);
			});

			await room.connect(
				pendingRef.current.livekitUrl,
				pendingRef.current.token,
			);

			if (initialAudioAnonymized) {
				const ok = await publishAnonymizedMic(room);
				if (!ok) {
					toast({
						title: "Voice anonymization",
						description:
							"Could not anonymize your mic. Using the normal microphone instead.",
					});
				}
			} else {
				await room.localParticipant.setMicrophoneEnabled(true);
			}

			try {
				await room.localParticipant.setCameraEnabled(true);
			} catch {
				toast({
					title: "Camera",
					description: "Camera could not start. Continuing with audio only.",
				});
			}

			setStartedAt(Date.now());
			setPhase("live");
			void joinSession(attemptIdRef.current);
		} catch (err) {
			setPhase("idle");
			toast({
				title: "Voice interview",
				description: toUserFacingErrorMessage(
					err,
					"Could not connect to the interview room. Check your microphone permission.",
				),
				variant: "destructive",
			});
		}
	}

	async function attachFile(
		file: File,
		source: AttachmentSource,
		questionId?: string,
		replyToText?: string,
	) {
		if (!attemptIdRef.current) return;
		const state = interviewStateRef.current;
		const targetId = questionId ?? state.currentQuestionId ?? undefined;
		const rubricItem = state.rubric.find((r) => r.questionId === targetId);
		const requiresEvidence = Boolean(rubricItem?.requiresEvidence);
		const hasDocument = Boolean(
			targetId && state.documented.has(targetId),
		);
		const attachOpen = Boolean(targetId && state.attachOpen.has(targetId));
		if (!targetId || !requiresEvidence) {
			toast({
				title: "Attachment",
				description: "This question does not need an evidence file.",
			});
			return;
		}
		// Locked until the auditor finishes asking; paperclip stays for replace until advance.
		if (!isAttachControlVisible({ attachOpen, hasDocument })) {
			toast({
				title: "Attachment",
				description:
					"Wait until the auditor finishes asking this question before attaching evidence.",
			});
			return;
		}
		const result = await uploadInterviewAttachment(attemptIdRef.current, file, {
			source,
			questionId: targetId,
			replyToText,
		});
		if ("error" in result) {
			toast({
				title: "Attachment",
				description: result.error,
				variant: "destructive",
			});
		}
	}

	async function retryAttachment(turn: TranscriptTurn, file: File) {
		if (!attemptIdRef.current || !turn.$id) return;
		const result = await retryInterviewAttachment(
			attemptIdRef.current,
			turn.$id,
			file,
		);
		if ("error" in result) {
			toast({
				title: "Attachment",
				description: result.error,
				variant: "destructive",
			});
		}
	}

	return (
		<AuditLabCallContext.Provider
			value={{
				phase,
				attemptId,
				elapsed,
				caption,
				coverage,
				participants,
				transcriptTurns,
				micOn,
				camOn,
				hasRemoteVideo,
				interviewStatus,
				connectionStatus,
				isFacilitator,
				audioAnonymized,
				sessionMeta,
				isMinimized,
				minimizeCall,
				restoreCall,
				prepareCall,
				cancelPendingCall,
				confirmConsentAndConnect,
				endOrLeaveCall,
				toggleMic,
				toggleCam,
				togglePause,
				setAudioAnonymized,
				registerLocalVideoEl,
				registerRemoteVideoEl,
				attachFile,
				retryAttachment,
			}}
		>
			{children}
			<div ref={audioContainerRef} className="sr-only" />
		</AuditLabCallContext.Provider>
	);
}
