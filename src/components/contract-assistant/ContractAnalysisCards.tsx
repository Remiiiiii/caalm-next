"use client";

import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	FileText,
	Lightbulb,
	Shield,
	Target,
	Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { splitProseParagraphs } from "@/lib/ai/split-prose";
import type { ContractAnalysis } from "@/lib/ai-contract-analyzer";

const iconClass = "h-4 w-4 text-[#0f5384]";
const cardClass = "border border-slate-200 bg-white shadow-sm rounded-lg";
const titleClass =
	"text-sm flex items-center gap-2 font-semibold sidebar-gradient-text";

function severityDot(level: string) {
	if (level === "high") return "bg-red";
	if (level === "medium") return "bg-orange";
	return "bg-green";
}

export function ContractAnalysisCards({
	analysis,
}: {
	analysis: ContractAnalysis;
}) {
	return (
		<div className="space-y-4">
			<Card className={cardClass}>
				<CardHeader className="pb-2">
					<CardTitle className={titleClass}>
						<FileText className={iconClass} />
						Summary
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{splitProseParagraphs(analysis.summary).map((paragraph, index) => (
						<p
							key={`${index}-${paragraph.slice(0, 24)}`}
							className="text-sm text-slate-700"
						>
							{paragraph}
						</p>
					))}
				</CardContent>
			</Card>

			{analysis.keyTerms.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Lightbulb className={iconClass} />
							Key terms
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{analysis.keyTerms.map((term) => (
								<span
									key={term}
									className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
								>
									{term}
								</span>
							))}
						</div>
					</CardContent>
				</Card>
			) : null}

			{analysis.importantDates.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Calendar className={iconClass} />
							Important dates
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{analysis.importantDates.map((date) => (
							<div
								key={`${date.label}-${date.date}`}
								className="flex justify-between text-sm"
							>
								<span className="text-slate-600">{date.label}</span>
								<span className="font-medium text-slate-700">
									{date.date ? new Date(date.date).toLocaleDateString() : "N/A"}
								</span>
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			{analysis.parties.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Users className={iconClass} />
							Contract parties
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{analysis.parties.map((party) => (
							<div key={`${party.name}-${party.role}`} className="text-sm">
								<div className="font-medium text-slate-700">{party.name}</div>
								<div className="text-slate-600">{party.role}</div>
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			{analysis.financialInfo.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Target className={iconClass} />
							Financial information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{analysis.financialInfo.map((info) => (
							<div key={info.label} className="text-sm">
								<div className="font-medium text-slate-700">{info.label}</div>
								<div className="text-slate-600">{info.value}</div>
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			{analysis.complianceRequirements.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Shield className={iconClass} />
							Compliance requirements
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{analysis.complianceRequirements.map((req) => (
							<div key={req.requirement} className="text-sm">
								<div className="font-medium text-slate-700">
									{req.requirement}
								</div>
								<div className="text-slate-600">{req.category}</div>
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			{analysis.performanceMetrics.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Target className={iconClass} />
							Performance metrics
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{analysis.performanceMetrics.map((metric) => (
							<div key={metric.metric} className="text-sm">
								<div className="font-medium text-slate-700">
									{metric.metric}
								</div>
								{metric.target ? (
									<div className="text-slate-600">Target: {metric.target}</div>
								) : null}
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			{analysis.risks.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<AlertTriangle className={iconClass} />
							Risks
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2">
							{analysis.risks.map((risk) => (
								<li
									key={risk.risk}
									className="flex items-start gap-2 text-sm text-slate-700"
								>
									<div
										className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot(risk.severity)}`}
									/>
									<div>
										<div className="font-medium">{risk.risk}</div>
										{risk.context ? (
											<div className="mt-1 text-xs text-slate-500">
												{risk.context}
											</div>
										) : null}
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}

			{analysis.opportunities.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<CheckCircle className={iconClass} />
							Opportunities
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2">
							{analysis.opportunities.map((item) => (
								<li key={item.opportunity} className="text-sm text-slate-700">
									<div className="font-medium">{item.opportunity}</div>
									{item.context ? (
										<div className="mt-1 text-xs text-slate-500">
											{item.context}
										</div>
									) : null}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}

			{analysis.recommendations.length > 0 ? (
				<Card className={cardClass}>
					<CardHeader className="pb-2">
						<CardTitle className={titleClass}>
							<Lightbulb className={iconClass} />
							Recommendations
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2">
							{analysis.recommendations.map((item) => (
								<li
									key={item.recommendation}
									className="text-sm text-slate-700"
								>
									<div className="font-medium">{item.recommendation}</div>
									{item.context ? (
										<div className="mt-1 text-xs text-slate-500">
											{item.context}
										</div>
									) : null}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
