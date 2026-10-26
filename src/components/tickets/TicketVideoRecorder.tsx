"use client";

import { Check, Mic, MicOff, Play, Video, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTicketRecording } from "@/contexts/TicketRecordingContext";
import { parseProblemPageUrl } from "@/lib/tickets/problem-page-url";
import {
	formatRecordingDuration,
	isScreenRecordingSupported,
	MAX_RECORDING_BYTES,
	repairPreviewDuration,
	type TicketRecording,
	ticketRecordingToFile,
} from "@/lib/tickets/ticket-recording";
import { cn } from "@/lib/utils";

interface Props {
	problemPageUrl: string;
	onBeforeNavigate?: () => void;
	disabled?: boolean;
}

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:ring-offset-2";
const STAGE_BOX =
	"aspect-video w-full shrink-0 rounded-md @[500px]:aspect-auto @[500px]:w-[48%]";
const ROW = "flex h-full min-h-[280px] flex-col gap-5 @[500px]:flex-row";
const RECORD_STEPS = [
	"Click Record",
	"Choose what Chrome shares",
	"Press Stop",
] as const;
const COLUMN = "flex min-w-0 flex-1 flex-col justify-between gap-4";
const FOOT = "border-t border-slate-200 pt-3";

export default function TicketVideoRecorder({
	problemPageUrl,
	onBeforeNavigate,
	disabled,
}: Props) {
	const [withMic, setWithMic] = useState(true);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const {
		draftRecording,
		setDraftRecording,
		isRecording,
		error,
		startRecording,
		clearError,
	} = useTicketRecording();
	const supported = isScreenRecordingSupported();
	const pageValid = parseProblemPageUrl(problemPageUrl).ok;
	const shownError = uploadError ?? error;

	const discard = () => {
		setDraftRecording(null);
		setUploadError(null);
		clearError();
	};

	const onPickFile = (f: File | undefined) => {
		if (!f) return;
		if (f.size > MAX_RECORDING_BYTES) {
			setUploadError("That video is over 10 MB. Pick a shorter clip.");
			return;
		}
		setUploadError(null);
		setDraftRecording({
			blob: f,
			url: URL.createObjectURL(f),
			mime: f.type,
			bytes: f.size,
			durationMs: 0,
			hasAudio: true,
		});
	};

	const onRecord = useCallback(async () => {
		const parsed = parseProblemPageUrl(problemPageUrl);
		if (!parsed.ok) {
			clearError();
			return;
		}
		setUploadError(null);
		clearError();
		await startRecording({
			problemPageUrl,
			withMic,
			onBeforeNavigate,
		});
	}, [clearError, onBeforeNavigate, problemPageUrl, startRecording, withMic]);

	return (
		<section
			className="@container flex h-full min-h-0 flex-col rounded-md border-2 border-dashed border-slate-200 bg-white/65 px-4 py-4 text-slate-700 transition-colors duration-200 hover:border-blue-300"
			aria-label="Show us the problem"
		>
			{draftRecording ? (
				<DraftReview
					key={draftRecording.url}
					value={draftRecording}
					disabled={disabled}
					onDiscard={discard}
					onRerecord={() => {
						discard();
						if (supported) void onRecord();
						else fileInputRef.current?.click();
					}}
				/>
			) : (
				<div className={ROW}>
					<div
						className={cn(
							STAGE_BOX,
							"flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center",
						)}
					>
						<Video
							className="h-10 w-10 text-[#0f5384]"
							strokeWidth={1.5}
							aria-hidden
						/>
						<span className="text-sm text-slate-500">
							Your clip appears here
						</span>
						<span className="mt-1 w-full border-t border-slate-200 pt-2 text-xs text-slate-500">
							Up to 60 s · 10 MB · 1 of your 5 files
						</span>
					</div>

					<div className={COLUMN}>
						<div className="flex flex-col gap-3">
							<p className="text-sm leading-normal text-slate-600">
								A short clip of what went wrong, attached to this ticket.
							</p>
							{isRecording ? (
								<p className="text-xs text-slate-500" role="status">
									Recording… Use Stop at the bottom of the screen or Stop
									sharing in Chrome.
								</p>
							) : supported ? (
								<ol className="flex flex-col gap-1.5 text-xs text-slate-700">
									{RECORD_STEPS.map((step, index) => (
										<li key={step} className="flex items-center gap-2">
											<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[11px] font-semibold text-[#0f5384]">
												{index + 1}
											</span>
											{step}
										</li>
									))}
								</ol>
							) : null}
						</div>

						{isRecording ? null : (
							<div className="flex flex-col gap-2">
								<div className="flex flex-wrap items-center gap-3">
									{supported ? (
										<>
											<Button
												type="button"
												className="btn-primary px-3 sm:px-4"
												disabled={disabled || !pageValid}
												onClick={() => void onRecord()}
											>
												<Video className="h-4 w-4" aria-hidden />
												Record screen
											</Button>
											<div className="flex items-center gap-2">
												<Checkbox
													id="tvr-mic"
													checked={withMic}
													onCheckedChange={(c) => setWithMic(c === true)}
												/>
												<Label
													htmlFor="tvr-mic"
													className="flex cursor-pointer items-center gap-1.5 text-xs font-normal text-slate-700"
												>
													{withMic ? (
														<Mic
															className="h-3.5 w-3.5 text-green"
															aria-hidden
														/>
													) : (
														<MicOff
															className="h-3.5 w-3.5 text-red"
															aria-hidden
														/>
													)}
													Record my voice
												</Label>
											</div>
										</>
									) : (
										<Button
											type="button"
											variant="outline"
											className="border-[0.25px] border-slate-300 text-slate-700"
											disabled={disabled}
											onClick={() => fileInputRef.current?.click()}
										>
											<Video className="h-4 w-4" aria-hidden />
											Upload a video
										</Button>
									)}
								</div>
								{shownError ? (
									<p role="alert" className="text-xs text-red">
										{shownError}
									</p>
								) : null}
							</div>
						)}

						<div
							className={cn(
								FOOT,
								"flex flex-col items-start gap-1 text-[11px] text-slate-500",
							)}
						>
							<span>
								{supported
									? "On another page? We save your draft, take you there, then the browser asks what to share."
									: "Screen recording isn't available in this browser. Upload a short video instead."}
							</span>
							{supported ? (
								<button
									type="button"
									className={cn(
										"cursor-pointer rounded-sm text-[#0f5384] underline underline-offset-2",
										FOCUS_RING,
									)}
									disabled={disabled}
									onClick={() => fileInputRef.current?.click()}
								>
									Upload a video instead
								</button>
							) : null}
						</div>
					</div>
				</div>
			)}
			<input
				ref={fileInputRef}
				type="file"
				accept="video/mp4,video/webm,video/quicktime"
				className="hidden"
				tabIndex={-1}
				onChange={(e) => {
					onPickFile(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>
		</section>
	);
}

function DraftReview({
	value,
	disabled,
	onDiscard,
	onRerecord,
}: {
	value: TicketRecording;
	disabled?: boolean;
	onDiscard: () => void;
	onRerecord: () => void;
}) {
	const [playing, setPlaying] = useState(false);
	const [kept, setKept] = useState(false);
	const fileName = useMemo(() => ticketRecordingToFile(value).name, [value]);
	const duration = value.durationMs
		? formatRecordingDuration(value.durationMs)
		: "Video";
	const meta = [
		duration,
		`${(value.bytes / 1024 / 1024).toFixed(1)} MB`,
		value.hasAudio ? "with voice" : "no voice",
		fileName,
	].join(" · ");

	return (
		<div className={ROW}>
			<div className={cn(STAGE_BOX, "relative overflow-hidden bg-slate-800")}>
				{playing ? (
					<video
						className="h-full w-full bg-black object-contain"
						src={value.url}
						controls
						autoPlay
						playsInline
						preload="auto"
						onLoadedMetadata={(e) => repairPreviewDuration(e.currentTarget)}
					/>
				) : (
					<>
						<button
							type="button"
							aria-label="Play recording"
							onClick={() => setPlaying(true)}
							className={cn(
								"absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#0f5384] transition-transform duration-200 hover:scale-105",
								FOCUS_RING,
							)}
						>
							<Play className="h-4 w-4 fill-current" aria-hidden />
						</button>
						{value.durationMs ? (
							<span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
								{duration}
							</span>
						) : null}
					</>
				)}
			</div>

			<div className={COLUMN}>
				<p className="text-sm font-medium text-slate-700">
					{kept ? "Clip kept" : "Watch it back, then keep or redo"}
				</p>
				<p className="text-xs text-slate-500">
					{meta}. It uploads with your ticket.
				</p>
				<div className="flex flex-wrap items-center gap-2.5">
					{kept ? null : (
						<Button
							type="button"
							className="btn-primary px-3 sm:px-4"
							disabled={disabled}
							onClick={() => setKept(true)}
						>
							<Check className="h-4 w-4" aria-hidden />
							Keep clip
						</Button>
					)}
					<Button
						type="button"
						className="btn-primary px-3 sm:px-4"
						disabled={disabled}
						onClick={onRerecord}
					>
						<Video className="h-4 w-4" aria-hidden />
						Record again
					</Button>
					<button
						type="button"
						className={cn(
							"inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs text-slate-500 underline underline-offset-2 transition-colors duration-200 hover:text-slate-700",
							FOCUS_RING,
						)}
						onClick={onDiscard}
					>
						<X className="h-3.5 w-3.5" aria-hidden />
						Throw away
					</button>
				</div>
				<p className="text-[11px] text-slate-500">
					Check that nothing private shows in the clip.
				</p>
			</div>
		</div>
	);
}
