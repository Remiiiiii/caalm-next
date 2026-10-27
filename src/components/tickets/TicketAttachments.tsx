"use client";

import { Download, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { TicketAttachmentInfo } from "@/lib/tickets/ticket-attachments";
import { repairPreviewDuration } from "@/lib/tickets/ticket-recording";

/**
 * Browser-made WebM clips have no duration, so the time bar can't seek when the
 * file is streamed. Loading the clip (10 MB at most) as a blob lets the browser
 * scan it and report a real duration, as it does in the recorder preview.
 */
function RecordingPlayer({
	src,
	label,
	needsRepair,
}: {
	src: string;
	label: string;
	needsRepair: boolean;
}) {
	const ref = useRef<HTMLVideoElement>(null);
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);

	useEffect(() => {
		if (!needsRepair) return;
		const controller = new AbortController();
		let objectUrl: string | null = null;
		fetch(src, { signal: controller.signal })
			.then((res) => {
				if (!res.ok) throw new Error(String(res.status));
				return res.blob();
			})
			.then((blob) => {
				objectUrl = URL.createObjectURL(blob);
				setBlobUrl(objectUrl);
			})
			.catch((error) => {
				if (error?.name !== "AbortError") setLoadFailed(true);
			});
		return () => {
			controller.abort();
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [src, needsRepair]);

	const playable = needsRepair && !loadFailed ? blobUrl : src;
	useEffect(() => {
		if (playable && ref.current) repairPreviewDuration(ref.current);
	}, [playable]);

	if (!playable) {
		return (
			<div className="flex aspect-video w-full items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-xs text-slate-500">
				Loading recording…
			</div>
		);
	}
	return (
		// biome-ignore lint/a11y/useMediaCaption: silent screen recording, no transcript exists
		<video
			ref={ref}
			controls
			preload="metadata"
			playsInline
			aria-label={label}
			className="max-h-[32rem] w-full rounded-md border border-slate-200 bg-black"
			src={playable}
		/>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileUrl(ticketId: string, fileId: string, download = false): string {
	const base = `/api/tickets/${ticketId}/attachments/${fileId}`;
	return download ? `${base}?download=1` : base;
}

/** Screen recordings play inline for staff; other files are download links. */
export function TicketAttachments({
	ticketId,
	attachments,
}: {
	ticketId: string;
	attachments: TicketAttachmentInfo[];
}) {
	if (attachments.length === 0) return null;
	const videos = attachments.filter((file) => file.isVideo);
	const files = attachments.filter((file) => !file.isVideo);

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="space-y-4 p-4 sm:p-6">
				<p className="text-sm font-medium sidebar-gradient-text">
					{videos.length > 0 ? "Screen recording" : "Attachments"}
				</p>

				{videos.map((video) => (
					<div key={video.id} className="space-y-2">
						<RecordingPlayer
							src={fileUrl(ticketId, video.id)}
							label={`Screen recording: ${video.name}`}
							needsRepair={
								/\.webm$/i.test(video.name) || video.mimeType.includes("webm")
							}
						/>
						<div className="flex items-center justify-between gap-2 text-xs text-slate-500">
							<span className="truncate">
								{video.name} · {formatFileSize(video.size)}
							</span>
							<a
								href={fileUrl(ticketId, video.id, true)}
								className="inline-flex shrink-0 items-center gap-1 font-medium text-[#0f5384] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							>
								<Download className="h-3.5 w-3.5" aria-hidden />
								Download
							</a>
						</div>
					</div>
				))}

				{files.length > 0 ? (
					<ul className="space-y-1.5">
						{files.map((file) => (
							<li
								key={file.id}
								className="flex items-center gap-2 rounded-md border border-slate-200/60 bg-slate-50/80 px-2.5 py-1.5 text-xs"
							>
								<FileText
									className="h-3.5 w-3.5 shrink-0 text-slate-600"
									aria-hidden
								/>
								<span className="truncate text-slate-700">{file.name}</span>
								<span className="shrink-0 text-[10px] text-slate-500">
									{formatFileSize(file.size)}
								</span>
								<a
									href={fileUrl(ticketId, file.id, true)}
									className="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-[#0f5384] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								>
									<Download className="h-3.5 w-3.5" aria-hidden />
									Download
								</a>
							</li>
						))}
					</ul>
				) : null}
			</CardContent>
		</Card>
	);
}
