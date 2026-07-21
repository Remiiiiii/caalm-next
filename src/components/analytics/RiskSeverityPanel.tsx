"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { AuditReadinessSeverity } from "@/lib/analytics/audit-readiness.types";

interface RiskSeverityPanelProps {
	severity: AuditReadinessSeverity;
	isLoading?: boolean;
}

export function RiskSeverityPanel({
	severity,
	isLoading,
}: RiskSeverityPanelProps) {
	const total = severity.critical + severity.moderate + severity.low || 1;

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
			<CardContent className="p-4 sm:p-6 space-y-4">
				<div>
					<h3 className="text-sm font-medium sidebar-gradient-text">
						Insights by severity
					</h3>
					<p className="text-xs text-slate-600 mt-1">
						Open gaps grouped by audit impact
					</p>
				</div>

				<div className="grid grid-cols-3 gap-4">
					<div className="text-center">
						<p className="text-2xl font-bold text-red">{severity.critical}</p>
						<p className="text-xs text-slate-600 mt-1">Critical</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold text-orange">
							{severity.moderate}
						</p>
						<p className="text-xs text-slate-600 mt-1">Moderate</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold text-blue">{severity.low}</p>
						<p className="text-xs text-slate-600 mt-1">Low</p>
					</div>
				</div>

				<div className="flex h-3 rounded-full overflow-hidden bg-slate-200">
					{severity.critical > 0 ? (
						<div
							className="bg-red transition-all duration-200"
							style={{
								width: `${(severity.critical / total) * 100}%`,
							}}
						/>
					) : null}
					{severity.moderate > 0 ? (
						<div
							className="bg-orange transition-all duration-200"
							style={{
								width: `${(severity.moderate / total) * 100}%`,
							}}
						/>
					) : null}
					{severity.low > 0 ? (
						<div
							className="bg-blue transition-all duration-200"
							style={{
								width: `${(severity.low / total) * 100}%`,
							}}
						/>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
