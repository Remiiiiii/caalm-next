"use client";

import { AlertTriangle, BookCheck, Loader2 } from "lucide-react";
import type {
	ClauseDeviation,
	DeviationReport,
	DeviationSeverity,
	DeviationVerdict,
} from "@/types/playbook-deviations";
import { cn } from "@/lib/utils";

function severityDotClass(severity: DeviationSeverity): string {
	if (severity === "high") return "bg-red";
	if (severity === "medium") return "bg-orange";
	return "bg-green";
}

function severityBadgeClass(severity: DeviationSeverity): string {
	if (severity === "high") return "bg-red/10 text-red border-red/20";
	if (severity === "medium") return "bg-orange/10 text-orange border-orange/20";
	return "bg-green/10 text-green border-green/20";
}

function verdictLabel(verdict: DeviationVerdict): string {
	if (verdict === "pass") return "Matches playbook";
	if (verdict === "deviate") return "Off-standard";
	return "No standard";
}

function verdictBadgeClass(verdict: DeviationVerdict): string {
	if (verdict === "pass") return "bg-green/10 text-green border-green/20";
	if (verdict === "deviate") return "bg-red/10 text-red border-red/20";
	return "bg-orange/10 text-orange border-orange/20";
}

function severityLabel(severity: DeviationSeverity): string {
	if (severity === "high") return "High";
	if (severity === "medium") return "Medium";
	return "Low";
}

function rowTitle(row: ClauseDeviation): string {
	return (
		row.extractedTitle ||
		row.standardTitle ||
		row.extractedCategory ||
		"Clause"
	);
}

export type PlaybookDeviationsPanelProps = {
	report: DeviationReport | null;
	loading?: boolean;
	seeded?: boolean;
	className?: string;
};

export function PlaybookDeviationsPanel({
	report,
	loading = false,
	seeded = false,
	className,
}: PlaybookDeviationsPanelProps) {
	return (
		<section
			className={cn(
				"rounded-lg border border-slate-200 bg-white p-4 shadow-sm",
				className,
			)}
			data-testid="playbook-deviations-panel"
			aria-label="Playbook deviations"
		>
			<div className="mb-3 flex items-start gap-2">
				<BookCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold sidebar-gradient-text">
						Playbook deviations
					</p>
					<p className="text-xs text-slate-500">
						{seeded
							? "Seeded check for review — severity flags off-standard language."
							: "Compared to your published clause library."}
					</p>
				</div>
			</div>

			{loading ? (
				<div className="flex items-center gap-2 text-xs text-slate-500">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					Checking playbook…
				</div>
			) : null}

			{!loading && !report?.deviations.length ? (
				<p className="text-sm text-slate-600">
					No playbook deviations to show for this contract yet.
				</p>
			) : null}

			{!loading && report?.deviations.length ? (
				<>
					<div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
						<span>
							{report.summary.passCount} match
							{report.summary.passCount === 1 ? "" : "es"}
						</span>
						<span aria-hidden>·</span>
						<span>
							{report.summary.deviateCount} off-standard
						</span>
						<span aria-hidden>·</span>
						<span>
							{report.summary.noStandardCount} without a standard
						</span>
					</div>
					<ul className="space-y-3">
						{report.deviations.map((row) => (
							<li
								key={`${row.extractedId ?? row.extractedTitle ?? "clause"}-${row.verdict}-${row.severity}`}
								className="rounded-lg border border-slate-200 bg-slate-50 p-3"
								data-verdict={row.verdict}
								data-severity={row.severity}
							>
								<div className="flex items-start gap-2">
									<span
										className={cn(
											"mt-1.5 h-2 w-2 shrink-0 rounded-full",
											severityDotClass(row.severity),
										)}
										aria-hidden
									/>
									<div className="min-w-0 flex-1 space-y-2">
										<div className="flex flex-wrap items-center gap-2">
											<p className="text-sm font-medium text-slate-700">
												{rowTitle(row)}
											</p>
											<span
												className={cn(
													"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
													verdictBadgeClass(row.verdict),
												)}
											>
												{verdictLabel(row.verdict)}
											</span>
											<span
												className={cn(
													"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
													severityBadgeClass(row.severity),
												)}
												data-testid={`severity-badge-${row.severity}`}
											>
												{severityLabel(row.severity)} severity
											</span>
										</div>
										<p className="text-sm text-slate-600">{row.rationale}</p>
										{row.differingPoints.length > 0 ? (
											<ul className="space-y-1">
												{row.differingPoints.map((point) => (
													<li
														key={point}
														className="flex items-start gap-1.5 text-xs text-slate-600"
													>
														<AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-orange" />
														{point}
													</li>
												))}
											</ul>
										) : null}
									</div>
								</div>
							</li>
						))}
					</ul>
				</>
			) : null}
		</section>
	);
}
