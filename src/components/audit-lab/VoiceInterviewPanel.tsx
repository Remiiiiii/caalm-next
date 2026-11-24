"use client";

import { Clapperboard, Minimize2, PhoneOff, User, Video } from "lucide-react";
import { type DragEvent, useState } from "react";
import { createPortal } from "react-dom";
import { formatPracticeElapsed } from "@/components/audit-lab/PracticeChrome";
import { PracticeInterviewSetup } from "@/components/audit-lab/PracticeInterviewSetup";
import { ConsentCheckbox } from "@/components/audit-lab/voice/ConsentCheckbox";
import { ControlBar } from "@/components/audit-lab/voice/ControlBar";
import { GridOverlay } from "@/components/audit-lab/voice/GridOverlay";
import { RosterStrip } from "@/components/audit-lab/voice/RosterRow";
import { RubricPanel } from "@/components/audit-lab/voice/RubricPanel";
import { TranscriptPanel } from "@/components/audit-lab/voice/TranscriptPanel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAuditLabCall } from "@/contexts/AuditLabCallContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isSessionFacilitator } from "@/lib/audit-lab/access";
import {
	type AuditorPersona,
	INTERVIEWER_PROFILES,
} from "@/lib/audit-lab/roleplay";
import { parseParticipants, type ReviewSession } from "@/lib/audit-lab/types";
import { shouldForceAudioAnonymization } from "@/lib/audit-lab/voice/anonymize-audio";
import { cn } from "@/lib/utils";

/** Full-stage live-interview UI — a thin consumer of `AuditLabCallContext`, which owns the LiveKit `Room` and survives navigation (see `FloatingCallWidget` for the minimized view shown on other routes). */
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
	const call = useAuditLabCall();
	const [sessionId, setSessionId] = useState(sessions[0]?.$id ?? "");
	const [persona, setPersona] = useState<AuditorPersona>("by_the_book");
	const [anonymizeAudio, setAnonymizeAudio] = useState(true);
	// User must actively tick this; unlike voice anonymization it does not default on.
	const [consentChecked, setConsentChecked] = useState(false);
	const [showTranscript, setShowTranscript] = useState(true);
	const [captionsOn, setCaptionsOn] = useState(true);
	const [showReconsent, setShowReconsent] = useState(false);
	const [pendingAnonymize, setPendingAnonymize] = useState(true);
	const [isStageDragOver, setIsStageDragOver] = useState(false);

	const forceAnon = shouldForceAudioAnonymization(canViewPracticePii);
	const effectiveAnonymize = forceAnon || anonymizeAudio;
	const selectedSession = sessions.find((s) => s.$id === sessionId);
	const invitedParticipants = parseParticipants(
		selectedSession?.participantsJson,
	);
	const isFacilitator = isSessionFacilitator(
		invitedParticipants,
		user?.$id ?? "",
		selectedSession?.createdByUserId,
	);

	/** Live roster rows win (they carry mic/cam/connection state); everyone else invited to this simulation still shows up, marked "invited". */
	const rosterParticipants = invitedParticipants.map(
		(inv) =>
			call.participants.find((p) => p.userId === inv.userId) ?? {
				$id: inv.userId,
				orgId: selectedSession?.orgId ?? "",
				sessionId: selectedSession?.$id ?? "",
				attemptId: call.attemptId ?? "",
				userId: inv.userId,
				name: inv.name,
				email: inv.email,
				role: inv.role,
				connectionState: "invited" as const,
			},
	);
	for (const live of call.participants) {
		if (!rosterParticipants.some((p) => p.userId === live.userId)) {
			rosterParticipants.push(live);
		}
	}

	const activeRubricItem = call.coverage?.items.find(
		(item) => item.questionId === call.coverage?.currentQuestionId,
	);
	const hasInterviewActivity =
		call.transcriptTurns.length > 0 || Boolean(call.caption);

	async function requestVoiceInterview() {
		if (!sessionId) return;
		const result = await call.prepareCall({
			sessionId,
			persona,
			isFacilitator,
			sessionMeta: {
				title: selectedSession?.title,
				department: selectedSession?.department,
				framework: selectedSession?.framework,
				auditorLabel: `Mock auditor · ${INTERVIEWER_PROFILES[persona].name}`,
			},
		});
		if (!result.ok) {
			toast({
				title: "Voice interview",
				description: result.error,
				variant: "destructive",
			});
			return;
		}
		setConsentChecked(false);
	}

	function openVoiceAnonToggle() {
		if (forceAnon) {
			toast({
				title: "Voice anonymization",
				description: "Required for your role — it can't be turned off here.",
			});
			return;
		}
		setPendingAnonymize(!call.audioAnonymized);
		setShowReconsent(true);
	}

	/**
	 * Re-opens the recording-consent flow mid-call rather than silently flipping
	 * the anonymization flag, per the spec's "changing it mid-session should
	 * re-prompt for consent" requirement.
	 */
	async function confirmReconsentAndSwapMic() {
		await call.setAudioAnonymized(pendingAnonymize);
		setShowReconsent(false);
	}

	function downloadTranscript() {
		const text = call.transcriptTurns
			.filter((t) => t.kind !== "attachment")
			.map((t) => `Q: ${t.question ?? ""}\nA: ${t.answer ?? ""}`)
			.join("\n\n");
		const blob = new Blob([text], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `interview-transcript-${call.attemptId ?? "attempt"}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleStageDragOver(e: DragEvent<HTMLDivElement>) {
		if (!e.dataTransfer.types.includes("Files")) return;
		e.preventDefault();
		setIsStageDragOver(true);
	}

	function handleStageDragLeave(e: DragEvent<HTMLDivElement>) {
		if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
		setIsStageDragOver(false);
	}

	function handleStageDrop(e: DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setIsStageDragOver(false);
		const file = e.dataTransfer.files?.[0];
		if (!file) return;
		void call.attachFile(
			file,
			"stage_drop",
			activeRubricItem?.questionId,
			activeRubricItem?.prompt,
		);
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
			{call.phase === "idle" || call.phase === "consent" ? (
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
							disabled={!sessionId || call.phase === "consent"}
							onClick={() => void requestVoiceInterview()}
						>
							<Clapperboard className="h-4 w-4" aria-hidden />
							Start interview
						</Button>
					}
				/>
			) : null}

			<Dialog
				open={call.phase === "consent"}
				onOpenChange={(open) => {
					if (open) return;
					call.cancelPendingCall();
				}}
			>
				<DialogContent
					className="voice-call-consent max-w-[460px] gap-4 overflow-hidden p-6 sm:rounded-2xl"
					overlayClassName="voice-call-scrim"
					closeButtonClassName="text-white/50 hover:bg-white/10 hover:text-white/80"
				>
					<GridOverlay opacity={0.18} />
					<div className="relative z-[1] grid gap-4">
						<div className="flex items-center gap-2.5">
							<div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[#078fab]/30 bg-[#078fab]/15 text-[#6fe0f5]">
								<Video className="h-[17px] w-[17px]" aria-hidden />
							</div>
							<DialogTitle className="voice-call-consent-title text-sm font-semibold">
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
								onClick={() => call.cancelPendingCall()}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="ghost"
								className="voice-consent-btn-primary"
								disabled={!consentChecked}
								onClick={() =>
									void call.confirmConsentAndConnect(effectiveAnonymize)
								}
							>
								Start recording
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{call.phase === "connecting" ? (
				<p className="text-sm text-slate-500">Connecting…</p>
			) : null}

			{call.phase === "live" &&
			!call.isMinimized &&
			typeof document !== "undefined"
				? createPortal(
						<div className="voice-call-scrim fixed inset-0 z-50 flex items-center justify-center p-4">
							<div
								role="dialog"
								aria-modal="true"
								aria-label="Live practice interview"
								className={cn(
									// Sizing is the single source of truth here (viewport-relative,
									// capped) — .voice-call-shell itself carries no width/height so
									// there's nothing else to conflict with it.
									"voice-call-shell h-[92vh] max-h-[1100px] w-[96vw] max-w-[1800px]",
									isStageDragOver &&
										"ring-2 ring-inset ring-[#078fab] ring-offset-0",
								)}
								onDragOver={handleStageDragOver}
								onDragLeave={handleStageDragLeave}
								onDrop={handleStageDrop}
							>
								<GridOverlay opacity={0.18} />
								<div className="relative z-[1] flex h-full flex-col">
									<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
										<div className="mb-3 flex items-center justify-between">
											{/* Reconnecting/degraded take visual priority over paused — a network
												hiccup is more urgent than an intentional facilitator pause. */}
											<span
												className={cn(
													"voice-call-live-status flex items-center gap-1.5",
													(call.connectionStatus !== "healthy" ||
														call.interviewStatus === "paused") &&
														"voice-call-live-status-degraded",
												)}
											>
												<span
													className={cn(
														"voice-call-live-dot",
														(call.connectionStatus !== "healthy" ||
															call.interviewStatus === "paused") &&
															"voice-call-live-dot-degraded",
													)}
													aria-hidden
												/>
												{call.connectionStatus === "reconnecting"
													? "Reconnecting…"
													: call.connectionStatus === "degraded"
														? "Unstable connection"
														: call.interviewStatus === "paused"
															? "Paused"
															: "Live"}{" "}
												— {formatPracticeElapsed(call.elapsed)}
											</span>
											<div className="flex items-center gap-2">
												<button
													type="button"
													title="Minimize — keep the call running while you look at other pages"
													aria-label="Minimize"
													className="voice-call-control-btn"
													onClick={() => call.minimizeCall()}
												>
													<Minimize2 className="h-4 w-4" aria-hidden />
												</button>
												<Button
													type="button"
													variant="outline"
													className="rounded-full border-white/15 bg-white/5 text-[#e2e8f0] hover:border-[#ef7a6d]/30 hover:bg-[#ef7a6d]/10 hover:text-[#ef7a6d]"
													onClick={() => void call.endOrLeaveCall()}
												>
													<PhoneOff className="h-4 w-4" aria-hidden />
													{isFacilitator ? "End interview" : "Leave"}
												</Button>
											</div>
										</div>

										<div className="mb-3 flex flex-wrap gap-2">
											{call.sessionMeta?.title ? (
												<span className="voice-call-badge">
													{call.sessionMeta.title}
												</span>
											) : null}
											{call.sessionMeta?.department ? (
												<span className="voice-call-badge">
													{call.sessionMeta.department}
												</span>
											) : null}
											{call.sessionMeta?.framework ? (
												<span className="voice-call-badge">
													{call.sessionMeta.framework}
												</span>
											) : null}
										</div>

										<div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[0.85fr_1.15fr]">
											<div className="flex min-h-0 flex-col gap-3">
												<div className="voice-call-stage aspect-[16/10]">
													{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
													<video
														ref={call.registerRemoteVideoEl}
														className={cn(
															"h-full w-full object-contain",
															!call.hasRemoteVideo && "hidden",
														)}
														autoPlay
														playsInline
														muted
													/>
													{!call.hasRemoteVideo ? (
														<div className="flex h-full flex-col items-center justify-center gap-2 text-[#7c8798]">
															<span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
																<User className="h-7 w-7" aria-hidden />
															</span>
														</div>
													) : null}
													<span className="voice-call-nameplate">
														{call.sessionMeta?.auditorLabel ??
															`Mock auditor · ${INTERVIEWER_PROFILES[persona].name}`}
													</span>
													{captionsOn && call.caption ? (
														<p className="voice-call-caption">{call.caption}</p>
													) : !hasInterviewActivity ? (
														<p className="voice-call-start-hint">
															Say &ldquo;Hello&rdquo; to start the interview.
														</p>
													) : null}
													<div className="voice-call-pip">
														{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
														<video
															ref={call.registerLocalVideoEl}
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
												<RosterStrip participants={rosterParticipants} />
											</div>

											<div className="flex min-h-0 flex-col gap-3">
												<div className="voice-call-panel flex min-h-0 flex-[0.9_1_0%] flex-col">
													<p className="voice-call-panel-title mb-2 shrink-0">
														Live transcript
													</p>
													{showTranscript ? (
														<TranscriptPanel
															turns={call.transcriptTurns}
															liveCaption={
																captionsOn ? call.caption : undefined
															}
															auditorLabel={
																call.sessionMeta?.auditorLabel ??
																`Mock auditor · ${INTERVIEWER_PROFILES[persona].name}`
															}
															onRetryAttachment={(turn, file) =>
																void call.retryAttachment(turn, file)
															}
														/>
													) : (
														<p className="voice-call-footnote">
															Transcript hidden.
														</p>
													)}
												</div>
												<div className="voice-call-panel flex min-h-0 flex-1 flex-col">
													<p className="voice-call-panel-title mb-2 shrink-0">
														Rubric coverage
													</p>
													<RubricPanel
														coverage={call.coverage}
														onAttach={(file, questionId, prompt) =>
															void call.attachFile(
																file,
																"rubric_item",
																questionId,
																prompt,
															)
														}
													/>
												</div>
												{/* Spacer: the 10% of height trimmed from the transcript panel above lands here instead of being absorbed by rubric growing. Rubric's own wrapper above keeps the exact original "flex-1" class, untouched, so its share of the column stays exactly what it was. */}
												<div className="flex-[0.1_1_0%]" aria-hidden />
											</div>
										</div>

										{call.interviewStatus === "paused" ? (
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
													Changing this mid-call needs a fresh confirmation
													before it takes effect.
												</p>
												<label className="flex items-center gap-2 text-sm text-[#e2e8f0]">
													<input
														type="checkbox"
														checked={pendingAnonymize}
														onChange={(e) =>
															setPendingAnonymize(e.target.checked)
														}
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
									</div>

									{/* shortcut: -mb-2 offsets .voice-call-shell's own 1rem padding so the toolbar lands ~8px from the window edge instead of 16px; re-derive if that shell padding changes. */}
									<div className="mt-3 flex shrink-0 justify-center -mb-2">
										<ControlBar
											participants={rosterParticipants}
											micOn={call.micOn}
											onToggleMic={call.toggleMic}
											camOn={call.camOn}
											onToggleCam={() => void call.toggleCam()}
											showTranscript={showTranscript}
											onToggleTranscript={() => setShowTranscript((v) => !v)}
											sessionTitle={call.sessionMeta?.title ?? ""}
											sessionDepartment={call.sessionMeta?.department}
											sessionFramework={call.sessionMeta?.framework}
											personaLabel={INTERVIEWER_PROFILES[persona].label}
											isFacilitator={isFacilitator}
											isPaused={call.interviewStatus === "paused"}
											onTogglePause={call.togglePause}
											captionsOn={captionsOn}
											onToggleCaptions={() => setCaptionsOn((v) => !v)}
											voiceAnonOn={call.audioAnonymized}
											onToggleVoiceAnon={openVoiceAnonToggle}
											onDownloadTranscript={downloadTranscript}
										/>
									</div>
								</div>
							</div>
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
