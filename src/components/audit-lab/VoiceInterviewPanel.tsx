"use client";

import {
	type LocalTrack,
	type RemoteTrack,
	Room,
	RoomEvent,
	Track,
	type TranscriptionSegment,
} from "livekit-client";
import { Check, Circle, Mic, PhoneOff, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	formatPracticeElapsed,
	PracticeLiveShell,
	PracticeProgressBar,
	PracticeSessionPersonaControls,
} from "@/components/audit-lab/PracticeChrome";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AUDITOR_PERSONAS } from "@/lib/audit-lab/roleplay";
import type { ReviewSession } from "@/lib/audit-lab/types";
import {
	createAnonymizedMicStream,
	shouldForceAudioAnonymization,
} from "@/lib/audit-lab/voice/anonymize-audio";
import {
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
	const [sessionId, setSessionId] = useState(sessions[0]?.$id ?? "");
	const [persona, setPersona] =
		useState<(typeof AUDITOR_PERSONAS)[number]>("by_the_book");
	const [phase, setPhase] = useState<Phase>("idle");
	const [attemptId, setAttemptId] = useState<string | null>(null);
	const [caption, setCaption] = useState("");
	const [startedAt, setStartedAt] = useState<number | null>(null);
	const [elapsed, setElapsed] = useState(0);
	const [coverage, setCoverage] = useState<CoverageSnapshot | null>(null);
	const [anonymizeAudio, setAnonymizeAudio] = useState(true);
	const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
	const roomRef = useRef<Room | null>(null);
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
		};
	}, []);

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
			setCoverage(null);
			setHasRemoteVideo(false);
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

	const coveredCount = coverage?.coveredIds.length ?? 0;
	const totalCount = coverage?.total ?? 0;

	return (
		<div className="space-y-4">
			<div ref={audioContainerRef} className="sr-only" />
			{phase === "idle" ? (
				<PracticeSessionPersonaControls
					sessions={sessions}
					sessionId={sessionId}
					onSessionId={setSessionId}
					persona={persona}
					onPersona={setPersona}
					actions={
						<Button
							type="button"
							className="btn-primary"
							disabled={!sessionId}
							onClick={() => void requestVoiceInterview()}
						>
							<Mic className="h-4 w-4" aria-hidden />
							Start interview
						</Button>
					}
				/>
			) : null}

			{phase === "consent" ? (
				<div className="space-y-3 rounded-lg border border-orange/30 bg-orange/5 p-4">
					<p className="text-sm font-semibold text-slate-700">
						This session will be recorded
					</p>
					<p className="text-sm text-slate-600">
						Starting turns on your camera and microphone, may show a talking-head
						interviewer, and stores the recording in CAALM for this organization.
						Live captions hide common personal details. Voice anonymization is
						{forceAnon ? " required for your role" : " on by default"}.
					</p>
					{!forceAnon ? (
						<label className="flex items-center gap-2 text-sm text-slate-700">
							<input
								type="checkbox"
								checked={anonymizeAudio}
								onChange={(e) => setAnonymizeAudio(e.target.checked)}
							/>
							Anonymize my voice during the call
						</label>
					) : null}
					<div className="flex gap-2">
						<Button
							type="button"
							className="btn-primary"
							onClick={() => void confirmConsentAndConnect()}
						>
							I consent — start recording
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								pendingRef.current = null;
								setAttemptId(null);
								setPhase("idle");
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			) : null}

			{phase === "connecting" ? (
				<p className="text-sm text-slate-500">Connecting…</p>
			) : null}

			{phase === "live" ? (
				<PracticeLiveShell
					headerLeft={
						<span className="flex items-center gap-1.5 text-xs font-semibold text-green">
							<span className="h-2 w-2 rounded-full bg-green" aria-hidden />
							Live — {formatPracticeElapsed(elapsed)}
						</span>
					}
					headerRight={
						<Button
							type="button"
							variant="outline"
							className="text-red"
							onClick={() => void endInterview()}
						>
							<PhoneOff className="h-4 w-4" aria-hidden />
							End interview
						</Button>
					}
				>
					{/* Square tiles match Synthesia's near-square feed so cover fills without pillarbox. */}
					<div className="grid gap-3 md:grid-cols-2">
						<div className="relative aspect-square overflow-hidden rounded-lg border border-white/60 bg-slate-900/80">
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
								<div className="flex h-full flex-col items-center justify-center gap-2 text-white/90">
									<span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
										<User className="h-7 w-7" aria-hidden />
									</span>
									<span className="text-xs font-medium">Interviewer</span>
								</div>
							) : null}
						</div>
						<div className="relative aspect-square overflow-hidden rounded-lg border border-white/60 bg-slate-900/80">
							{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
							<video
								ref={localVideoRef}
								className="h-full w-full object-cover scale-x-[-1]"
								autoPlay
								playsInline
								muted
							/>
							<span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
								You
							</span>
						</div>
					</div>

					{totalCount > 0 ? (
						<div className="space-y-2">
							<PracticeProgressBar
								label="Rubric coverage"
								current={coveredCount}
								total={totalCount}
							/>
							<ul className="max-h-48 space-y-1.5 overflow-y-auto review-hover-scroll">
								{(coverage?.items ?? []).map((item) => (
									<li
										key={item.questionId}
										className={cn(
											"flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
											item.status === "current" && "bg-[#078fab]/10",
											item.status === "covered" && "text-slate-500",
										)}
									>
										{item.status === "covered" ? (
											<Check
												className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green"
												aria-hidden
											/>
										) : (
											<Circle
												className={cn(
													"mt-0.5 h-3.5 w-3.5 shrink-0",
													item.status === "current"
														? "text-[#078fab]"
														: "text-slate-300",
												)}
												aria-hidden
											/>
										)}
										<span
											className={cn(
												item.status === "current" &&
													"font-medium text-slate-800",
												item.status === "covered" && "line-through",
											)}
										>
											{item.prompt}
										</span>
									</li>
								))}
							</ul>
						</div>
					) : (
						<p className="text-xs text-slate-500">
							Waiting for rubric coverage from the interviewer…
						</p>
					)}

					<p className="min-h-12 text-sm text-slate-700">
						{caption || "Listening…"}
					</p>
				</PracticeLiveShell>
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
