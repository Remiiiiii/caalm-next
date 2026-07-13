"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface AuditGlobalFiltersProps {
	period: AuditPeriod;
	onPeriodChange: (period: AuditPeriod) => void;
	search: string;
	onSearchChange: (value: string) => void;
	onExport?: () => void;
}

export function AuditGlobalFilters({
	period,
	onPeriodChange,
	search,
	onSearchChange,
	onExport,
}: AuditGlobalFiltersProps) {
	const { permissions } = usePermissions();
	const canExport = permissions.includes(PERMISSIONS.AUDIT.EXPORT);

	return (
		<Card className="glass-card mb-6">
			<div className="glass-card-cap" />
			<div className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-1">
					<Select
						value={period}
						onValueChange={(v) => onPeriodChange(v as AuditPeriod)}
					>
						<SelectTrigger className="w-full sm:w-[180px] shad-input">
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
					<div className="flex-1 max-w-md">
						<Input
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Search obligations and evidence..."
							className="shad-input"
						/>
					</div>
				</div>
				{canExport && onExport ? (
					<Button
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						onClick={onExport}
					>
						<Download className="h-4 w-4" />
						Export
					</Button>
				) : null}
			</div>
		</Card>
	);
}
