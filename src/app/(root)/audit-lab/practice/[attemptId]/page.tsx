import Link from "next/link";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";
import { getAttempt, listReports } from "@/lib/audit-lab/repository";
import type {
	VoiceGradedItem,
	VoiceScorecard,
} from "@/lib/audit-lab/voice/grade";

const VERDICT_BADGE: Record<VoiceGradedItem["verdict"], string> = {
	covered: "bg-green/10 text-green border-green/20",
	partially_covered: "bg-orange/10 text-orange border-orange/20",
	not_covered: "bg-red/10 text-red border-red/20",
};

const VERDICT_LABEL: Record<VoiceGradedItem["verdict"], string> = {
	covered: "Covered",
	partially_covered: "Partially covered",
	not_covered: "Not covered",
};

export default async function AuditLabPracticeDetailPage({
	params,
}: {
	params: Promise<{ attemptId: string }>;
}) {
	const { attemptId } = await params;
	const ctx = await getLabServerContext();
	const attempt = await getAttempt(ctx.orgId, attemptId);
	if (!attempt) {
		return (
			<AuditLabShell
				title="Practice"
				description="Attempt not found"
				capabilities={ctx.capabilities}
			>
				<Link href="/audit-lab/practice" className="text-[#0f5384] text-sm">
					Back to practice
				</Link>
			</AuditLabShell>
		);
	}

	const transcript = (
		JSON.parse(attempt.transcriptJson || "[]") as Array<{
			questionId?: string;
			question?: string;
			answer: string;
			at: string;
			citedEvidence?: string;
		}>
	).filter((turn) => typeof turn.answer === "string");

	const reports = await listReports(ctx.orgId, attempt.sessionId);
	const scorecard = reports
		.map((r) => {
			try {
				return JSON.parse(r.bodyJson) as VoiceScorecard & {
					attemptId?: string;
				};
			} catch {
				return null;
			}
		})
		.find((body) => body?.attemptId === attempt.$id);

	return (
		<AuditLabShell
			title="Practice attempt"
			description={`Persona ${attempt.persona} · ${attempt.status}`}
			capabilities={ctx.capabilities}
		>
			<div className="space-y-6">
				<Link href="/audit-lab/practice" className="text-[#0f5384] text-sm">
					← Back to practice
				</Link>

				{attempt.recordingUrl ? (
					// eslint-disable-next-line jsx-a11y/media-has-caption -- no captions track from the vendor recording yet
					<audio controls className="w-full" src={attempt.recordingUrl}>
						<track kind="captions" />
					</audio>
				) : null}

				{scorecard ? (
					<div className="space-y-3">
						<h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
							Scorecard
						</h2>
						<p className="text-sm text-slate-600">{scorecard.overallSummary}</p>
						<div className="space-y-2">
							{scorecard.items.map((item) => (
								<div
									key={item.questionId}
									className="space-y-1.5 rounded-lg border border-slate-200 p-3"
								>
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-semibold text-slate-700">
											{item.prompt}
										</p>
										<span
											className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-xs ${VERDICT_BADGE[item.verdict]}`}
										>
											{VERDICT_LABEL[item.verdict]}
										</span>
									</div>
									<p className="text-xs text-slate-500">{item.rationale}</p>
									{item.quote ? (
										<p className="border-l-2 border-slate-200 pl-2 text-xs italic text-slate-600">
											"{item.quote}"
										</p>
									) : null}
								</div>
							))}
						</div>
					</div>
				) : attempt.status === "completed" ? (
					<p className="text-sm text-slate-500">
						Grading didn't produce a scorecard — this needs human review.
					</p>
				) : (
					<p className="text-sm text-slate-500">
						Grading finishes shortly after the call ends.
					</p>
				)}

				{transcript.length > 0 ? (
					<div className="space-y-3">
						<h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
							Transcript
						</h2>
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
			</div>
		</AuditLabShell>
	);
}
