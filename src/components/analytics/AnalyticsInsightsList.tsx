"use client";

import { AlertTriangle, ArrowRight, CircleAlert, Info } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { AuditReadinessInsight } from "@/lib/analytics/audit-readiness.types";
import { cn } from "@/lib/utils";

const SEVERITY_ICONS = {
	critical: AlertTriangle,
	moderate: CircleAlert,
	low: Info,
};

const SEVERITY_STYLES = {
	critical: "border-red/20 bg-red/5",
	moderate: "border-orange/20 bg-orange/5",
	low: "border-blue/20 bg-blue/5",
};

interface AnalyticsInsightsListProps {
	insights: AuditReadinessInsight[];
	isLoading?: boolean;
	title?: string;
}

export function AnalyticsInsightsList({
	insights,
	isLoading,
	title = "Top insights",
}: AnalyticsInsightsListProps) {
	if (isLoading) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="h-32 animate-pulse bg-slate-200/50 rounded-lg" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="mb-4">
					<h3 className="text-sm font-medium sidebar-gradient-text">{title}</h3>
					<p className="text-xs text-slate-600 mt-1">
						Prioritized actions for audit readiness
					</p>
				</div>

				{insights.length === 0 ? (
					<p className="text-sm text-slate-600 py-4 text-center">
						No open insights. Compliance posture looks healthy.
					</p>
				) : (
					<ul className="space-y-3">
						{insights.map((insight) => {
							const Icon = SEVERITY_ICONS[insight.severity];
							return (
								<li
									key={insight.id}
									className={cn(
										"flex items-start gap-3 p-3 rounded-lg border transition-colors duration-200",
										SEVERITY_STYLES[insight.severity],
									)}
								>
									<Icon className="h-4 w-4 shrink-0 mt-0.5 text-slate-700" />
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-slate-700">
											{insight.title}
										</p>
										<p className="text-xs text-slate-600 mt-0.5">
											{insight.description}
										</p>
										<Link
											href={insight.moduleLink}
											className="inline-flex items-center text-xs text-[#0f5384] mt-2 hover:underline cursor-pointer"
										>
											Open {insight.moduleLabel}
											<ArrowRight className="h-3 w-3 ml-1" />
										</Link>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
