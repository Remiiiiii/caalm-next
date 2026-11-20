"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { redactPii } from "@/lib/audit-lab/voice/pii";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

type Turn = {
	questionId?: string;
	question?: string;
	answer: string;
	at: string;
	citedEvidence?: string;
};

export function PracticeAttemptReview({
	attemptId,
	recordingUrl,
	dataResidencyRegion,
	audioAnonymized,
	defaultTranscript,
	rawTranscript,
	canViewPracticePii,
	canManagePracticeMedia,
	scorecardQuotes,
}: {
	attemptId: string;
	recordingUrl?: string;
	dataResidencyRegion?: string;
	audioAnonymized?: boolean;
	defaultTranscript: Turn[];
	rawTranscript: Turn[];
	canViewPracticePii: boolean;
	canManagePracticeMedia: boolean;
	scorecardQuotes?: Array<{ questionId: string; quote?: string }>;
}) {
	const { toast } = useToast();
	const [showRaw, setShowRaw] = useState(false);
	const [busy, setBusy] = useState(false);
	const transcript = showRaw ? rawTranscript : defaultTranscript;

	async function revealRaw() {
		if (!canViewPracticePii) return;
		setBusy(true);
		try {
			const res = await fetch(
				`/api/audit-lab/practice/${attemptId}/reveal-pii`,
				{ method: "POST" },
			);
			const json = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(json.error || "Reveal failed");
			setShowRaw(true);
		} catch (err) {
			toast({
				title: "Transcript",
				description: toUserFacingErrorMessage(
					err,
					"Could not reveal the original transcript.",
				),
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}

	async function deleteRecording() {
		if (!canManagePracticeMedia) return;
		setBusy(true);
		try {
			const res = await fetch(
				`/api/audit-lab/practice/${attemptId}/recording`,
				{ method: "DELETE" },
			);
			const json = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(json.error || "Delete failed");
			toast({
				title: "Recording deleted",
				description: "The practice recording was removed from storage.",
			});
			window.location.reload();
		} catch (err) {
			toast({
				title: "Recording",
				description: toUserFacingErrorMessage(
					err,
					"Could not delete that recording.",
				),
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}

	const isVideo =
		Boolean(recordingUrl) &&
		!recordingUrl?.includes("audio-only");

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap gap-2 text-xs text-slate-500">
				{dataResidencyRegion ? (
					<span className="rounded-full border border-slate-200 px-2 py-0.5">
						Region: {dataResidencyRegion}
					</span>
				) : null}
				{audioAnonymized ? (
					<span className="rounded-full border border-slate-200 px-2 py-0.5">
						Voice anonymized
					</span>
				) : null}
			</div>

			{recordingUrl ? (
				<div className="space-y-2">
					{isVideo ? (
						// eslint-disable-next-line jsx-a11y/media-has-caption
						<video controls className="w-full rounded-lg" src={recordingUrl}>
							<track kind="captions" />
						</video>
					) : (
						// eslint-disable-next-line jsx-a11y/media-has-caption
						<audio controls className="w-full" src={recordingUrl}>
							<track kind="captions" />
						</audio>
					)}
					{canManagePracticeMedia ? (
						<Button
							type="button"
							variant="outline"
							className="delete-btn"
							disabled={busy}
							onClick={() => void deleteRecording()}
						>
							Delete recording
						</Button>
					) : null}
				</div>
			) : null}

			{transcript.length > 0 ? (
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
							Transcript
							{!showRaw ? " (redacted)" : " (original)"}
						</h2>
						{canViewPracticePii && !showRaw ? (
							<Button
								type="button"
								variant="outline"
								disabled={busy}
								onClick={() => void revealRaw()}
							>
								Show original transcript
							</Button>
						) : null}
						{showRaw ? (
							<Button
								type="button"
								variant="outline"
								onClick={() => setShowRaw(false)}
							>
								Show redacted
							</Button>
						) : null}
					</div>
					<div className="space-y-2">
						{transcript.map((turn, i) => (
							<div
								key={`${turn.questionId ?? i}-${turn.at}`}
								className="rounded-lg border border-slate-200 p-3"
							>
								{turn.question ? (
									<p className="mb-1 text-xs font-semibold text-slate-500">
										{turn.question}
									</p>
								) : null}
								<p className="text-sm text-slate-700">{turn.answer}</p>
								{turn.citedEvidence ? (
									<p className="mt-1 text-xs text-slate-400">
										Cited: {turn.citedEvidence}
									</p>
								) : null}
							</div>
						))}
					</div>
				</div>
			) : (
				<p className="text-sm text-slate-500">
					Scores and transcript stay on this record for your org retention
					policy.
				</p>
			)}

			{scorecardQuotes && !showRaw
				? scorecardQuotes.map((q) =>
						q.quote ? (
							<span key={q.questionId} className="sr-only">
								{redactPii(q.quote)}
							</span>
						) : null,
					)
				: null}
		</div>
	);
}
