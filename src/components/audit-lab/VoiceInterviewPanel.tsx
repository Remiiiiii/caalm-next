"use client";

import {
	type RemoteTrack,
	Room,
	RoomEvent,
	Track,
	type TranscriptionSegment,
} from "livekit-client";
import { Mic, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AUDITOR_PERSONAS } from "@/lib/audit-lab/roleplay";
import type { ReviewSession } from "@/lib/audit-lab/types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

type Phase = "idle" | "consent" | "connecting" | "live" | "ended";

export function VoiceInterviewPanel({
	sessions,
	canPractice,
}: {
	sessions: ReviewSession[];
	canPractice: boolean;
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
	const roomRef = useRef<Room | null>(null);
	const audioContainerRef = useRef<HTMLDivElement | null>(null);
	const pendingRef = useRef<{
		roomName: string;
		token: string;
		livekitUrl: string;
	} | null>(null);

	useEffect(() => {
		if (phase !== "live" || !startedAt) return;
		const id = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startedAt) / 1000));
		}, 1000);
		return () => clearInterval(id);
	}, [phase, startedAt]);

	useEffect(() => {
		return () => {
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

	async function confirmConsentAndConnect() {
		if (!attemptId || !pendingRef.current) return;
		setPhase("connecting");
		try {
			await fetch("/api/audit-lab/practice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "consent", attemptId }),
			});

			const room = new Room();
			roomRef.current = room;
			room.on(
				RoomEvent.TranscriptionReceived,
				(segments: TranscriptionSegment[]) => {
					const latest = segments[segments.length - 1];
					if (latest?.text) setCaption(latest.text);
				},
			);
			room.on(RoomEvent.Disconnected, () => {
				setPhase((p) => (p === "live" ? "ended" : p));
			});
			// The agent's TTS speech arrives as a remote audio track — subscribing
			// to it doesn't play it, it still has to be attached to a media element.
			room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
				if (track.kind !== Track.Kind.Audio) return;
				const el = track.attach();
				audioContainerRef.current?.appendChild(el);
			});
			room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
				if (track.kind !== Track.Kind.Audio) return;
				for (const el of track.detach()) el.remove();
			});

			await room.connect(
				pendingRef.current.livekitUrl,
				pendingRef.current.token,
			);
			await room.localParticipant.setMicrophoneEnabled(true);
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
			{/* Remote audio tracks (the agent's TTS) get attached here — kept
			    mounted for the whole component so it exists before connect(). */}
			<div ref={audioContainerRef} className="sr-only" />
			{phase === "idle" ? (
				<div className="flex flex-wrap items-center gap-3">
					<select
						className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
						value={sessionId}
						onChange={(e) => setSessionId(e.target.value)}
						aria-label="Simulation"
					>
						{sessions.map((s) => (
							<option key={s.$id} value={s.$id}>
								{s.title}
							</option>
						))}
					</select>
					<select
						className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
						value={persona}
						onChange={(e) =>
							setPersona(e.target.value as (typeof AUDITOR_PERSONAS)[number])
						}
						aria-label="Auditor persona"
					>
						{AUDITOR_PERSONAS.map((p) => (
							<option key={p} value={p}>
								{p.replaceAll("_", " ")}
							</option>
						))}
					</select>
					<Button
						type="button"
						className="btn-primary"
						disabled={!sessionId}
						onClick={() => void requestVoiceInterview()}
					>
						<Mic className="h-4 w-4" aria-hidden />
						Start voice interview
					</Button>
				</div>
			) : null}

			{phase === "consent" ? (
				<div className="space-y-3 rounded-lg border border-orange/30 bg-orange/5 p-4">
					<p className="text-sm font-semibold text-slate-700">
						This session will be recorded
					</p>
					<p className="text-sm text-slate-600">
						Starting the interview turns on your microphone and records the call
						so it can be transcribed and graded afterward. The recording and
						transcript are stored on this practice attempt and visible to people
						with access to this simulation.
					</p>
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
				<div className="space-y-3 rounded-lg border border-slate-200 p-4">
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1.5 text-xs font-semibold text-green">
							<span className="h-2 w-2 rounded-full bg-green" aria-hidden />
							Live — {Math.floor(elapsed / 60)}:
							{String(elapsed % 60).padStart(2, "0")}
						</span>
						<Button
							type="button"
							variant="outline"
							className="text-red"
							onClick={() => void endInterview()}
						>
							<PhoneOff className="h-4 w-4" aria-hidden />
							End interview
						</Button>
					</div>
					<p className="min-h-12 text-sm text-slate-700">
						{caption || "Listening…"}
					</p>
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
