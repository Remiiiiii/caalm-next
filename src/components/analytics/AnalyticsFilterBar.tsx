"use client";

import { SquareArrowRightExit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { AUDIT_PERIOD_OPTIONS, type AuditPeriod } from "@/lib/audits/types";

interface AnalyticsFilterBarProps {
	period: AuditPeriod;
	onPeriodChange: (period: AuditPeriod) => void;
	lastUpdated?: string;
	onExport?: () => void;
}

export function AnalyticsFilterBar({
	period,
	onPeriodChange,
	lastUpdated,
	onExport,
}: AnalyticsFilterBarProps) {
	const { permissions } = usePermissions();
	const canExport = permissions.includes(PERMISSIONS.AUDIT.EXPORT);

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="px-4 pt-6 pb-3 sm:px-6">
				<div className="mb-3">
					<p className="text-sm font-medium sidebar-gradient-text">
						Reporting period
					</p>
					<p className="text-xs text-slate-600">
						Choose a time range to filter every metric, chart, and readiness
						score on this page.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
					<Select
						value={period}
						onValueChange={(v) => onPeriodChange(v as AuditPeriod)}
					>
						<SelectTrigger className="h-9 w-[10.5rem] shrink-0 shad-input">
							<SelectValue placeholder="Period" />
						</SelectTrigger>
						<SelectContent>
							{AUDIT_PERIOD_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{lastUpdated ? (
						<p className="text-xs text-slate-500 sm:ml-auto">
							Last updated{" "}
							{new Date(lastUpdated).toLocaleString(undefined, {
								dateStyle: "medium",
								timeStyle: "short",
							})}
						</p>
					) : null}
					{canExport && onExport ? (
						<Button
							variant="outline"
							className="primary-btn px-3 sm:px-4 w-full sm:w-auto sm:ml-0"
							onClick={onExport}
						>
							<SquareArrowRightExit className="h-4 w-4" />
							Export
						</Button>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
