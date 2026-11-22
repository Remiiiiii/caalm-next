"use client";

import {
	type LocalTrack,
	type RemoteTrack,
	Room,
	RoomEvent,
	Track,
	type TranscriptionSegment,
} from "livekit-client";
import { Clapperboard, PhoneOff, User, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPracticeElapsed } from "@/components/audit-lab/PracticeChrome";
import { PracticeInterviewSetup } from "@/components/audit-lab/PracticeInterviewSetup";
import { ConsentCheckbox } from "@/components/audit-lab/voice/ConsentCheckbox";
import { ControlBar } from "@/components/audit-lab/voice/ControlBar";
import { RosterStrip } from "@/components/audit-lab/voice/RosterRow";
import { RubricPanel } from "@/components/audit-lab/voice/RubricPanel";
import {
	TranscriptPanel,
	type TranscriptTurn,
} from "@/components/audit-lab/voice/TranscriptPanel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import { appwriteConfig } from "@/lib/appwrite/config";
import { isSessionFacilitator } from "@/lib/audit-lab/access";
import {
	type AuditorPersona,
	INTERVIEWER_PROFILES,
} from "@/lib/audit-lab/roleplay";
import {
	parseParticipants,
	type ReviewSession,
	type ReviewSessionParticipantRow,
} from "@/lib/audit-lab/types";
import {
	createAnonymizedMicStream,
	shouldForceAudioAnonymization,
} from "@/lib/audit-lab/voice/anonymize-audio";
import {
	buildCoverageSnapshot,
	type CoverageSnapshot,
	VOICE_COVERAGE_TOPIC,
} from "@/lib/audit-lab/voice/coverage";
import { redactPii } from "@/lib/audit-lab/voice/pii";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { cn } from "@/lib/utils";

type Phase = "idle" | "consent" | "connecting" | "live" | "ended";

function parseCoveragePayload(payload: Uint8Array): CoverageSnapshot | null {
	try {
		const text = new TextDecoder().decode(payload);
		const data = JSON.parse(text) as CoverageSnapshot;
		if (!Array.isArray(data.items) || typeof data.total !== "number") {
			return null;
		}
		return data;
	} catch {
		return null;
	}
}

function isAvatarParticipant(attributes: Record<string, string> | undefined) {
	if (!attributes) return false;
	return Boolean(
		attributes["lk.publish_on_behalf"] ||
			attributes.lk_publish_on_behalf ||
			attributes["avatar"] === "true",
	);
}

/** Attach an already-subscribed remote video (e.g. Synthesia joined before the live UI mounted). */
function attachRemoteVideoTrack(
	track: RemoteTrack,
	participantAttributes: Record<string, string> | undefined,
	el: HTMLVideoElement | null,
	setHasRemoteVideo: (v: boolean) => void,
) {
	if (!el || track.kind !== Track.Kind.Video) return;
	const preferAvatar = isAvatarParticipant(participantAttributes);
	if (preferAvatar || !el.srcObject) {
		track.attach(el);
		setHasRemoteVideo(true);
	}
}

export function VoiceInterviewPanel({
	sessions,
	canPractice,
	canViewPracticePii = false,
}: {
	sessions: ReviewSession[];
	canPractice: boolean;
	canViewPracticePii?: boolean;
}) {
	const { toast } = useToast();
	const { user } = useAuth();
	const [sessionId, setSessionId] = useState(sessions[0]?.$id ?? "");
	const [persona, setPersona] = useState<AuditorPersona>("by_the_book");
	const [phase, setPhase] = useState<Phase>("idle");
	const [attemptId, setAttemptId] = useState<string | null>(null);
	const [caption, setCaption] = useState("");
	const [startedAt, setStartedAt] = useState<number | null>(null);
	const [elapsed, setElapsed] = useState(0);
	const [coverage, setCoverage] = useState<CoverageSnapshot | null>(null);
	const [anonymizeAudio, setAnonymizeAudio] = useState(true);
	// User must actively tick this; unlike voice anonymization it does not default on.
	const [consentChecked, setConsentChecked] = useState(false);
	const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
	const [participants, setParticipants] = useState<
		ReviewSessionParticipantRow[]
	>([]);
	const [transcriptTurns, setTranscriptTurns] = useState<TranscriptTurn[]>([]);
	const [micOn, setMicOn] = useState(true);
	const [camOn, setCamOn] = useState(true);
	const [showTranscript, setShowTranscript] = useState(true);
	const [captionsOn, setCaptionsOn] = useState(true);
	const [interviewStatus, setInterviewStatus] = useState("live");
	const [showReconsent, setShowReconsent] = useState(false);
	const [pendingAnonymize, setPendingAnonymize] = useState(true);
	const rubricRef = useRef<
		Array<{ questionId: string; prompt: string; difficulty: string }>
	>([]);
	const roomRef = useRef<Room | null>(null);
	const attemptIdRef = useRef<string | null>(null);
	const audioContainerRef = useRef<HTMLDivElement | null>(null);
	const localVideoRef = useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
	const anonymizerStopRef = useRef<(() => void) | null>(null);
	const pendingRef = useRef<{
		roomName: string;
		token: string;
		livekitUrl: string;
	} | null>(null);

	const forceAnon = shouldForceAudioAnonymization(canViewPracticePii);
	const effectiveAnonymize = forceAnon || anonymizeAudio;
	const selectedSession = sessions.find((s) => s.$id === sessionId);
	const isFacilitator = isSessionFacilitator(
		parseParticipants(selectedSession?.participantsJson),
		user?.$id ?? "",
		selectedSession?.createdByUserId,
	);

	useEffect(() => {
		if (phase !== "live" || !startedAt) return;
		const id = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startedAt) / 1000));
		}, 1000);
		return () => clearInterval(id);
	}, [phase, startedAt]);

	// Avatar (and local camera) often publish while phase is still "connecting".
	// The <video> refs only exist in the live shell, so re-attach once they mount.
	useEffect(() => {
		if (phase !== "live") return;
		const room = roomRef.current;
		if (!room) return;

		for (const participant of room.remoteParticipants.values()) {
			for (const pub of participant.trackPublications.values()) {
				const track = pub.track as RemoteTrack | undefined;
				if (!track || track.kind !== Track.Kind.Video || !pub.isSubscribed) {
					continue;
				}
				attachRemoteVideoTrack(
					track,
					participant.attributes as Record<string, string>,
					remoteVideoRef.current,
					setHasRemoteVideo,
				);
			}
		}

		for (const pub of room.localParticipant.trackPublications.values()) {
			const track = pub.track as LocalTrack | undefined;
			if (!track || track.kind !== Track.Kind.Video) continue;
			if (localVideoRef.current) track.attach(localVideoRef.current);
		}
	}, [phase]);

	useEffect(() => {
		return () => {
			anonymizerStopRef.current?.();
			void roomRef.current?.disconnect();
			if (attemptIdRef.current) void leaveSession(attemptIdRef.current);
		};
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
			setTranscriptTurns((prev) => {
				if (prev.some((t) => t.$id === payload.$id)) return prev;
				return [...prev, payload];
			});
			if (payload.questionId && rubricRef.current.length > 0) {
				setCoverage((prev) => {
					const coveredIds = new Set(prev?.coveredIds ?? []);
					coveredIds.add(payload.questionId as string);
					return buildCoverageSnapshot({
						rubric: rubricRef.current,
						coveredIds,
						currentQuestionId: prev?.currentQuestionId ?? null,
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

	async function postPracticeAction(action: string, extra?: Record<string, unknown>) {
		if (!attemptIdRef.current) return;
		await fetch("/api/audit-lab/practice", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action, attemptId: attemptIdRef.current, ...extra }),
		});
	}

	function toggleMic() {
		const room = roomRef.current;
		const next = !micOn;
		for (const pub of room?.localParticipant.trackPublications.values() ?? []) {
			if (pub.track?.kind === Track.Kind.Audio) {
				if (next) pub.track.unmute();
				else pub.track.mute();
			}
		}
		setMicOn(next);
		void postPracticeAction("set_av_state", { micOn: next });
	}

	async function toggleCam() {
		const room = roomRef.current;
		const next = !camOn;
		try {
			await room?.localParticipant.setCameraEnabled(next);
		} catch {
			/* camera toggle failures already surface via the initial enable attempt */
		}
		setCamOn(next);
		void postPracticeAction("set_av_state", { camOn: next });
	}

	function togglePause() {
		void postPracticeAction(interviewStatus === "paused" ? "resume" : "pause");
	}

	function downloadTranscript() {
		const text = transcriptTurns
			.map((t) => `Q: ${t.question ?? ""}\nA: ${t.answer ?? ""}`)
			.join("\n\n");
		const blob = new Blob([text], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `interview-transcript-${attemptIdRef.current ?? "attempt"}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function endOrLeave() {
		if (isFacilitator) await postPracticeAction("end_voice");
		await endInterview();
	}

	function openVoiceAnonToggle() {
		if (forceAnon) {
			toast({
				title: "Voice anonymization",
				description: "Required for your role — it can't be turned off here.",
			});
			return;
		}
		setPendingAnonymize(!effectiveAnonymize);
		setShowReconsent(true);
	}

	/**
	 * Re-opens the recording-consent flow mid-call rather than silently flipping
	 * the anonymization flag, per the spec's "changing it mid-session should
	 * re-prompt for consent" requirement — then swaps the published mic track
	 * to match.
	 */
	async function confirmReconsentAndSwapMic() {
		const room = roomRef.current;
		if (!room) return;
		await postPracticeAction("consent", { audioAnonymized: pendingAnonymize });

		anonymizerStopRef.current?.();
		anonymizerStopRef.current = null;
		for (const pub of [...room.localParticipant.trackPublications.values()]) {
			if (pub.track?.kind === Track.Kind.Audio) {
				await room.localParticipant.unpublishTrack(pub.track);
			}
		}
		if (pendingAnonymize) {
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
		setAnonymizeAudio(pendingAnonymize);
		setShowReconsent(false);
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
					}>;
				};
			};
			if (!res.ok || !json.data) return;
			rubricRef.current = json.data.rubric;
			setParticipants(json.data.participants);
			setTranscriptTurns(json.data.transcriptTurns);
			if (json.data.rubric.length > 0) {
				setCoverage((prev) =>
					prev
						? prev
						: buildCoverageSnapshot({
								rubric: json.data?.rubric ?? [],
								coveredIds: (json.data?.transcriptTurns ?? [])
									.map((t) => t.questionId)
									.filter((id): id is string => Boolean(id)),
								currentQuestionId: json.data?.currentQuestionId ?? null,
							}),
				);
			}
		} catch (err) {
			console.error("[VoiceInterviewPanel] seedSessionState", err);
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
			console.error("[VoiceInterviewPanel] join", err);
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
			console.error("[VoiceInterviewPanel] leave", err);
		}
	}

	async function requestVoiceInterview() {
		if (!sessionId) return;
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
					roomName?: string;
					token?: string;
					livekitUrl?: string;
				};
			};
			if (!res.ok)
				throw new Error(json.error || "Could not start the interview.");
			const data = json.data;
			if (!data?.attempt || !data.roomName || !data.token || !data.livekitUrl) {
				throw new Error("The interview didn't come back fully set up.");
			}
			setAttemptId(data.attempt.$id);
			attemptIdRef.current = data.attempt.$id;
			setParticipants([]);
			setTranscriptTurns([]);
			rubricRef.current = [];
			setCoverage(null);
			setHasRemoteVideo(false);
			setMicOn(true);
			setCamOn(true);
			setInterviewStatus("live");
			setConsentChecked(false);
			pendingRef.current = {
				roomName: data.roomName,
				token: data.token,
				livekitUrl: data.livekitUrl,
			};
			setPhase("consent");
		} catch (err) {
			toast({
				title: "Voice interview",
				description: toUserFacingErrorMessage(
					err,
					"Could not start the interview.",
				),
				variant: "destructive",
			});
		}
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

	async function confirmConsentAndConnect() {
		if (!attemptId || !pendingRef.current) return;
		setPhase("connecting");
		try {
			await fetch("/api/audit-lab/practice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "consent",
					attemptId,
					audioAnonymized: effectiveAnonymize,
				}),
			});

			const room = new Room();
			roomRef.current = room;
			room.on(
				RoomEvent.TranscriptionReceived,
				(segments: TranscriptionSegment[]) => {
					const latest = segments[segments.length - 1];
					if (latest?.text) setCaption(redactPii(latest.text));
				},
			);
			room.on(RoomEvent.Disconnected, () => {
				anonymizerStopRef.current?.();
				anonymizerStopRef.current = null;
				if (attemptIdRef.current) void leaveSession(attemptIdRef.current);
				setPhase((p) => (p === "live" ? "ended" : p));
			});
			room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
				if (topic && topic !== VOICE_COVERAGE_TOPIC) return;
				const next = parseCoveragePayload(payload);
				if (next) setCoverage(next);
			});
			room.on(
				RoomEvent.TrackSubscribed,
				(track: RemoteTrack, _pub, participant) => {
					if (track.kind === Track.Kind.Audio) {
						const el = track.attach();
						audioContainerRef.current?.appendChild(el);
						return;
					}
					attachRemoteVideoTrack(
						track,
						participant.attributes as Record<string, string>,
						remoteVideoRef.current,
						setHasRemoteVideo,
					);
				},
			);
			room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
				if (track.kind === Track.Kind.Audio) {
					for (const el of track.detach()) el.remove();
					return;
				}
				if (track.kind === Track.Kind.Video) {
					track.detach();
					setHasRemoteVideo(false);
				}
			});
			room.on(RoomEvent.LocalTrackPublished, (pub) => {
				const track = pub.track as LocalTrack | undefined;
				if (!track || track.kind !== Track.Kind.Video) return;
				if (localVideoRef.current) track.attach(localVideoRef.current);
			});

			await room.connect(
				pendingRef.current.livekitUrl,
				pendingRef.current.token,
			);

			if (effectiveAnonymize) {
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
					description:
						"Camera could not start. Continuing with audio only.",
				});
			}

			setStartedAt(Date.now());
			setPhase("live");
			void joinSession(attemptId);
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

	async function endInterview() {
		anonymizerStopRef.current?.();
		anonymizerStopRef.current = null;
		await roomRef.current?.disconnect();
		setPhase("ended");
	}

	if (!canPractice) {
		return (
			<p className="text-sm text-slate-600">
				Practice needs the run practice permission.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<div ref={audioContainerRef} className="sr-only" />
			{phase === "idle" || phase === "consent" ? (
				<PracticeInterviewSetup
					sessions={sessions}
					sessionId={sessionId}
					onSessionId={setSessionId}
					persona={persona}
					onPersona={setPersona}
					actions={
						<Button
							type="button"
							className="btn-primary"
							disabled={!sessionId || phase === "consent"}
							onClick={() => void requestVoiceInterview()}
						>
							<Clapperboard className="h-4 w-4" aria-hidden />
							Start interview
						</Button>
					}
				/>
			) : null}

			<Dialog
				open={phase === "consent"}
				onOpenChange={(open) => {
					if (open) return;
					pendingRef.current = null;
					setAttemptId(null);
					setPhase("idle");
				}}
			>
				<DialogContent
					className="voice-call-consent max-w-[460px] gap-4 p-6 sm:rounded-2xl"
					overlayClassName="voice-call-scrim"
					closeButtonClassName="text-white/50 hover:bg-white/10 hover:text-white/80"
				>
					<div className="flex items-center gap-2.5">
						<div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[#078fab]/30 bg-[#078fab]/15 text-[#6fe0f5]">
							<Video className="h-[17px] w-[17px]" aria-hidden />
						</div>
						<DialogTitle className="text-sm font-semibold text-[#e2e8f0]">
							This session will be recorded
						</DialogTitle>
					</div>
					<DialogDescription className="text-[13px] leading-[1.55] text-[#9aa4b2]">
						{`Starting turns on your camera and microphone, may show a talking-head interviewer, and stores the recording in CAALM for this organization. Live captions hide common personal details. Voice anonymization is${forceAnon ? " required for your role" : " on by default"}.`}
					</DialogDescription>
					<div className="space-y-2.5">
						<ConsentCheckbox
							id="voice-consent-i-consent"
							label="I consent"
							checked={consentChecked}
							onChange={setConsentChecked}
						/>
						{!forceAnon ? (
							<ConsentCheckbox
								id="voice-consent-anonymize"
								label="Anonymize my voice during the call"
								checked={anonymizeAudio}
								onChange={setAnonymizeAudio}
							/>
						) : null}
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="ghost"
							className="voice-consent-btn-cancel"
							onClick={() => {
								pendingRef.current = null;
								setAttemptId(null);
								setPhase("idle");
							}}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="ghost"
							className="voice-consent-btn-primary"
							onClick={() => void confirmConsentAndConnect()}
						>
							Start recording
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{phase === "connecting" ? (
				<p className="text-sm text-slate-500">Connecting…</p>
			) : null}

			{phase === "live" ? (
				<div className="voice-call-shell">
					<div className="mb-3 flex items-center justify-between">
						<span
							className={cn(
								"voice-call-live-status flex items-center gap-1.5",
								interviewStatus === "paused" &&
									"voice-call-live-status-paused",
							)}
						>
							<span
								className={cn(
									"voice-call-live-dot",
									interviewStatus === "paused" &&
										"voice-call-live-dot-paused",
								)}
								aria-hidden
							/>
							{interviewStatus === "paused" ? "Paused" : "Live"} —{" "}
							{formatPracticeElapsed(elapsed)}
						</span>
						<Button
							type="button"
							variant="outline"
							className="border-[#ef7a6d]/30 bg-[#ef7a6d]/10 text-[#ef7a6d] hover:bg-[#ef7a6d]/20"
							onClick={() => void endOrLeave()}
						>
							<PhoneOff className="h-4 w-4" aria-hidden />
							{isFacilitator ? "End interview" : "Leave"}
						</Button>
					</div>

					<div className="mb-3 flex flex-wrap gap-2">
						{selectedSession?.title ? (
							<span className="voice-call-badge">{selectedSession.title}</span>
						) : null}
						{selectedSession?.department ? (
							<span className="voice-call-badge">
								{selectedSession.department}
							</span>
						) : null}
						{selectedSession?.framework ? (
							<span className="voice-call-badge">
								{selectedSession.framework}
							</span>
						) : null}
					</div>

					<div className="grid gap-3 lg:grid-cols-3">
						<div className="voice-call-stage aspect-video lg:col-span-2">
							{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
							<video
								ref={remoteVideoRef}
								className={cn(
									"h-full w-full object-cover object-top",
									!hasRemoteVideo && "hidden",
								)}
								autoPlay
								playsInline
								muted
							/>
							{!hasRemoteVideo ? (
								<div className="flex h-full flex-col items-center justify-center gap-2 text-[#7c8798]">
									<span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
										<User className="h-7 w-7" aria-hidden />
									</span>
								</div>
							) : null}
							<span className="voice-call-nameplate">
								Mock auditor · {INTERVIEWER_PROFILES[persona].name}
							</span>
							{captionsOn && caption ? (
								<p className="voice-call-caption">{caption}</p>
							) : null}
							<div className="voice-call-pip">
								{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
								<video
									ref={localVideoRef}
									className="h-full w-full object-cover scale-x-[-1]"
									autoPlay
									playsInline
									muted
								/>
								<span className="absolute bottom-1 left-1 text-[10px] font-semibold uppercase tracking-wide text-[#e2e8f0]/80">
									You
								</span>
							</div>
						</div>

						<div className="flex flex-col gap-3">
							<div className="voice-call-panel">
								<p className="voice-call-panel-title mb-2">Live transcript</p>
								{showTranscript ? (
									<TranscriptPanel
										turns={transcriptTurns}
										liveCaption={captionsOn ? caption : undefined}
										auditorLabel={`Mock auditor · ${INTERVIEWER_PROFILES[persona].name}`}
									/>
								) : (
									<p className="voice-call-footnote">Transcript hidden.</p>
								)}
							</div>
							<div className="voice-call-panel">
								<p className="voice-call-panel-title mb-2">Rubric coverage</p>
								<RubricPanel coverage={coverage} />
							</div>
						</div>
					</div>

					{interviewStatus === "paused" ? (
						<p className="mt-3 rounded-md bg-[#f9ab72]/15 px-3 py-2 text-sm font-medium text-[#f9ab72]">
							Interview paused by the facilitator.
						</p>
					) : null}

					{showReconsent ? (
						<div className="mt-3 space-y-3 rounded-[0.875rem] border border-[#f9ab72]/30 bg-[#f9ab72]/10 p-4">
							<p className="text-sm font-semibold text-[#e2e8f0]">
								Confirm voice anonymization change
							</p>
							<p className="voice-call-footnote">
								Changing this mid-call needs a fresh confirmation before it takes
								effect.
							</p>
							<label className="flex items-center gap-2 text-sm text-[#e2e8f0]">
								<input
									type="checkbox"
									checked={pendingAnonymize}
									onChange={(e) => setPendingAnonymize(e.target.checked)}
								/>
								Anonymize my voice during the call
							</label>
							<div className="flex gap-2">
								<Button
									type="button"
									className="btn-primary"
									onClick={() => void confirmReconsentAndSwapMic()}
								>
									Confirm change
								</Button>
								<Button
									type="button"
									variant="outline"
									className="border-white/15 bg-transparent text-[#e2e8f0] hover:bg-white/10"
									onClick={() => setShowReconsent(false)}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : null}

					<div className="mt-3">
						<RosterStrip participants={participants} />
					</div>

					<div className="mt-3 flex justify-center">
						<ControlBar
							participants={participants}
							micOn={micOn}
							onToggleMic={toggleMic}
							camOn={camOn}
							onToggleCam={() => void toggleCam()}
							showTranscript={showTranscript}
							onToggleTranscript={() => setShowTranscript((v) => !v)}
							sessionTitle={selectedSession?.title ?? ""}
							sessionDepartment={selectedSession?.department}
							sessionFramework={selectedSession?.framework}
							personaLabel={INTERVIEWER_PROFILES[persona].label}
							isFacilitator={isFacilitator}
							isPaused={interviewStatus === "paused"}
							onTogglePause={togglePause}
							captionsOn={captionsOn}
							onToggleCaptions={() => setCaptionsOn((v) => !v)}
							voiceAnonOn={effectiveAnonymize}
							onToggleVoiceAnon={openVoiceAnonToggle}
							onDownloadTranscript={downloadTranscript}
						/>
					</div>
				</div>
			) : null}

			{phase === "ended" ? (
				<div className="space-y-2 rounded-lg border border-slate-200 p-4">
					<p className="text-sm text-slate-600">
						Interview ended. Grading usually finishes within a minute.
					</p>
					{attemptId ? (
						<Button type="button" variant="outline" asChild>
							<a href={`/audit-lab/practice/${attemptId}`}>View scorecard</a>
						</Button>
					) : null}
				</div>
			) : null}
		</div>
	);
}
