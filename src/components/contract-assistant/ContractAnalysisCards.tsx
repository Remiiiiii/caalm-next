"use client";

import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Lightbulb,
	Shield,
	Target,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContractAnalysis } from "@/lib/ai-contract-analyzer";

const iconClass = "h-4 w-4 text-[#0f5384]";
const cardClass = "border border-slate-200 bg-white shadow-sm rounded-lg";
const titleClass =
	"text-sm flex items-center gap-2 font-semibold sidebar-gradient-text";

// ─── date helpers ────────────────────────────────────────────
function tryDate(raw: string): Date | null {
	if (!raw || /not specified|n\/a/i.test(raw)) return null;
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(raw: string): string {
	const d = tryDate(raw);
	if (!d) return raw || "Not specified";
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function daysUntil(raw: string): number | null {
	const d = tryDate(raw);
	return d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null;
}

function findDate(
	dates: ContractAnalysis["importantDates"],
	re: RegExp,
): string | null {
	return dates.find((d) => re.test(d.label))?.date ?? null;
}

function findFinancial(
	items: ContractAnalysis["financialInfo"],
	re: RegExp,
): string | null {
	return items.find((i) => re.test(i.label))?.value ?? null;
}

function UrgencyBadge({ days }: { days: number }) {
	const base = "ml-2 rounded-full px-2.5 py-0.5 text-xs font-semibold";
	if (days < 0)
		return <span className={`${base} bg-red-100 text-red-700`}>Overdue</span>;
	if (days <= 7)
		return (
			<span className={`${base} bg-red-100 text-red-700`}>in {days} days</span>
		);
	if (days <= 30)
		return (
			<span className={`${base} bg-amber-100 text-amber-700`}>
				in {days} days
			</span>
		);
	return (
		<span className={`${base} bg-slate-100 text-slate-600`}>
			in {days} days
		</span>
	);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
			<span className="shrink-0 text-sm text-slate-500">{label}</span>
			<div className="flex flex-wrap items-center justify-end text-right text-sm font-semibold text-slate-700">
				{children}
			</div>
		</div>
	);
}

function severityDot(level: string) {
	if (level === "high") return "bg-red-500";
	if (level === "medium") return "bg-orange-400";
	return "bg-green-500";
}

export function ContractAnalysisCards({
	analysis,
}: {
	analysis: ContractAnalysis;
}) {
	const responseDue = findDate(analysis.importantDates, /response|deadline/i);
	const postedDate = findDate(analysis.importantDates, /posted/i);
	const archiveDate = findDate(analysis.importantDates, /archive/i);
	const contractValue = findFinancial(
		analysis.financialInfo,
		/contract value|award amount/i,
	);
	const facilityFee = findFinancial(analysis.financialInfo, /facility/i);
	const agency =
		analysis.parties.find((p) => /agency|contracting/i.test(p.role)) ??
		analysis.parties[0];

	const responseDays = responseDue ? daysUntil(responseDue) : null;

	// Financial rows not already shown in specific slots
	const otherFinancials = analysis.financialInfo.filter(
		(i) => !/contract value|award amount|facility/i.test(i.label),
	);

	const hasOverview =
		agency ||
		postedDate ||
		responseDue ||
		archiveDate ||
		otherFinancials.length > 0;

	return (
		<div className="space-y-4">
			{/* ── Overview ── */}
			{hasOverview && (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Calendar className={iconClass} />
							Overview
						</CardTitle>
					</CardHeader>
					<CardContent className="px-4 pb-3 pt-0">
						{agency && (
							<Row label="Agency">
								<span className="text-slate-700">{agency.name}</span>
								{agency.role && (
									<span className="mt-0.5 w-full text-right text-xs font-normal text-slate-500">
										{agency.role}
									</span>
								)}
							</Row>
						)}
						{postedDate && (
							<Row label="Posted">
								<span className="text-slate-700">{fmtDate(postedDate)}</span>
							</Row>
						)}
						{responseDue && (
							<Row label="Response due">
								<span className="text-slate-700">{fmtDate(responseDue)}</span>
								{responseDays !== null && <UrgencyBadge days={responseDays} />}
							</Row>
						)}
						{archiveDate && (
							<Row label="Archive date">
								<span className="text-slate-700">{fmtDate(archiveDate)}</span>
							</Row>
						)}
						<Row label="Contract value">
							<span className="text-slate-700">
								{contractValue ?? "Not specified"}
							</span>
						</Row>
						{facilityFee && (
							<Row label="Facility change fee">
								<span className="text-slate-700">{facilityFee}</span>
							</Row>
						)}
						{otherFinancials.map((item) => (
							<Row key={item.label} label={item.label}>
								<span className="text-slate-700">{item.value}</span>
							</Row>
						))}
					</CardContent>
				</Card>
			)}

			{/* ── Do this first ── */}
			{analysis.recommendations.length > 0 && (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className={titleClass}>
								<Lightbulb className={iconClass} />
								Do this first
							</CardTitle>
							<span className="text-xs text-slate-500">
								{analysis.recommendations.length} recommendation
								{analysis.recommendations.length !== 1 ? "s" : ""}
							</span>
						</div>
					</CardHeader>
					<CardContent className="px-4 pb-3 pt-0">
						<ul className="space-y-0">
							{analysis.recommendations.map((item, i) => (
								<li
									key={item.recommendation}
									className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0"
								>
									<span className="inline-block shrink-0 whitespace-nowrap rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-semibold text-[#078fab]">
										{i + 1}
									</span>
									<div>
										<div className="text-sm font-semibold text-slate-700">
											{item.recommendation}
										</div>
										{item.context && (
											<div className="mt-0.5 text-xs text-slate-500">
												{item.context}
											</div>
										)}
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{/* ── Risks ── */}
			{analysis.risks.length > 0 && (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className={titleClass}>
								<AlertTriangle className={iconClass} />
								Risks
							</CardTitle>
							<span className="text-xs text-slate-500">
								{analysis.risks.length}
							</span>
						</div>
					</CardHeader>
					<CardContent className="px-4 pb-3 pt-0">
						<ul>
							{analysis.risks.map((risk) => (
								<li
									key={risk.risk}
									className="flex items-start gap-2 border-b border-slate-100 py-2.5 text-sm text-slate-700 last:border-0"
								>
									<div
										className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot(risk.severity)}`}
									/>
									<div>
										<div className="font-medium">{risk.risk}</div>
										{risk.context && (
											<div className="mt-1 text-xs text-slate-500">
												{risk.context}
											</div>
										)}
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{/* ── Compliance requirements ── */}
			{analysis.complianceRequirements.length > 0 && (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className={titleClass}>
								<Shield className={iconClass} />
								Compliance requirements
							</CardTitle>
							<span className="text-xs text-slate-500">
								{analysis.complianceRequirements.length}
							</span>
						</div>
					</CardHeader>
					<CardContent className="px-4 pb-3 pt-0">
						{analysis.complianceRequirements.map((req) => (
							<div
								key={req.requirement}
								className="border-b border-slate-100 py-2.5 text-sm last:border-0"
							>
								<div className="font-medium text-slate-700">
									{req.requirement}
								</div>
								<div className="text-xs text-slate-500">{req.category}</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* ── Opportunities ── */}
			{analysis.opportunities.length > 0 && (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className={titleClass}>
								<CheckCircle className={iconClass} />
								Opportunities
							</CardTitle>
							<span className="text-xs text-slate-500">
								{analysis.opportunities.length}
							</span>
						</div>
					</CardHeader>
					<CardContent className="px-4 pb-3 pt-0">
						<ul>
							{analysis.opportunities.map((item) => (
								<li
									key={item.opportunity}
									className="border-b border-slate-100 py-2.5 text-sm text-slate-700 last:border-0"
								>
									<div className="font-medium">{item.opportunity}</div>
									{item.context && (
										<div className="mt-1 text-xs text-slate-500">
											{item.context}
										</div>
									)}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{/* ── Performance metrics ── */}
			{analysis.performanceMetrics.length > 0 && (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Target className={iconClass} />
							Performance metrics
						</CardTitle>
					</CardHeader>
					<CardContent className="px-4 pb-3 pt-0">
						{analysis.performanceMetrics.map((metric) => (
							<div
								key={metric.metric}
								className="border-b border-slate-100 py-2.5 text-sm last:border-0"
							>
								<div className="font-medium text-slate-700">
									{metric.metric}
								</div>
								{metric.target && (
									<div className="text-xs text-slate-500">
										Target: {metric.target}
									</div>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* ── Key terms ── */}
			{analysis.keyTerms.length > 0 && (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Lightbulb className={iconClass} />
							Key terms
						</CardTitle>
					</CardHeader>
					<CardContent className="px-4 pb-3 pt-0">
						<div className="flex flex-wrap gap-2">
							{analysis.keyTerms.map((term) => (
								<span
									key={term}
									className="caalm-chip-hover inline-block cursor-default rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition-all duration-200"
								>
									{term}
								</span>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
