import Link from "next/link";
import { PracticeAttemptReview } from "@/components/audit-lab/PracticeAttemptReview";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";
import { getAttempt, listReports } from "@/lib/audit-lab/repository";
import type {
	VoiceGradedItem,
	VoiceScorecard,
} from "@/lib/audit-lab/voice/grade";
import { redactPii } from "@/lib/audit-lab/voice/pii";

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

type Turn = {
	questionId?: string;
	question?: string;
	answer: string;
	at: string;
	citedEvidence?: string;
};

function parseTurns(json: string | undefined): Turn[] {
	try {
		return (
			JSON.parse(json || "[]") as Turn[]
		).filter((turn) => typeof turn.answer === "string");
	} catch {
		return [];
	}
}

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

	const rawTranscript = parseTurns(attempt.transcriptJson);
	const redactedTranscript = attempt.transcriptRedactedJson
		? parseTurns(attempt.transcriptRedactedJson)
		: rawTranscript.map((t) => ({
				...t,
				answer: redactPii(t.answer),
				citedEvidence: t.citedEvidence
					? redactPii(t.citedEvidence)
					: undefined,
				question: t.question ? redactPii(t.question) : undefined,
			}));

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

	const canViewPii = ctx.capabilities.canViewPracticePii;

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

				{scorecard ? (
					<div className="space-y-3">
						<h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
							Scorecard
						</h2>
						<p className="text-sm text-slate-600">{scorecard.overallSummary}</p>
						<div className="space-y-2">
							{scorecard.items.map((item) => {
								const quote = item.quote
									? canViewPii
										? item.quote
										: redactPii(item.quote)
									: null;
								return (
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
										{quote ? (
											<p className="border-l-2 border-slate-200 pl-2 text-xs italic text-slate-600">
												"{quote}"
											</p>
										) : null}
									</div>
								);
							})}
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

				<PracticeAttemptReview
					attemptId={attempt.$id}
					recordingUrl={attempt.recordingUrl}
					dataResidencyRegion={attempt.dataResidencyRegion}
					audioAnonymized={attempt.audioAnonymized}
					defaultTranscript={redactedTranscript}
					rawTranscript={rawTranscript}
					canViewPracticePii={canViewPii}
					canManagePracticeMedia={ctx.capabilities.canManagePracticeMedia}
					scorecardQuotes={scorecard?.items.map((i) => ({
						questionId: i.questionId,
						quote: i.quote,
					}))}
				/>
			</div>
		</AuditLabShell>
	);
}
