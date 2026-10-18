"use client";

import { Calendar, SquareArrowRightExit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaalmFilterSelect } from "@/components/ui/CaalmFilterSelect";
import { Card, CardContent } from "@/components/ui/card";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { usePermissions } from "@/hooks/usePermissions";
import { AUDIT_PERIOD_OPTIONS, type AuditPeriod } from "@/lib/audits/types";
import { formatInTimezone } from "@/lib/timezone";

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
	const timeZone = useOrgTimezone();
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
				<div className="platform-overview-actions flex flex-wrap items-center gap-x-4 gap-y-2">
					<CaalmFilterSelect
						value={period}
						options={AUDIT_PERIOD_OPTIONS.map((opt) => ({
							value: opt.value,
							label: opt.label,
						}))}
						ariaLabel="Reporting period"
						icon={Calendar}
						onChange={(v) => onPeriodChange(v as AuditPeriod)}
					/>
					{lastUpdated ? (
						<p className="text-xs text-slate-500 sm:ml-auto">
							Last updated{" "}
							{formatInTimezone(
								new Date(lastUpdated),
								"MMM d, yyyy h:mm a",
								timeZone,
							)}
						</p>
					) : null}
					{canExport && onExport ? (
						<Button
							variant="outline"
							className="primary-btn w-full sm:w-auto sm:ml-0"
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
