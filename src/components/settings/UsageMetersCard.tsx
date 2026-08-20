"use client";

import { Building2, FileText, HardDrive, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UsageMeter {
	label: string;
	used: number | null;
	limit: number;
	icon: React.ReactNode;
	formatValue?: (n: number) => string;
}

interface UsageMetersCardProps {
	storageUsed: number;
	storageLimit: number;
	usersUsed: number | null;
	usersLimit: number;
	departmentsUsed: number | null;
	departmentsLimit: number | null;
	contractsUsed: number | null;
	contractsLimit: number | null;
}

function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let i = 0;
	while (value >= 1024 && i < units.length - 1) {
		value /= 1024;
		i += 1;
	}
	return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function MeterRow({ label, used, limit, icon, formatValue }: UsageMeter) {
	const infinite = !Number.isFinite(limit);
	const displayUsed =
		used === null ? "—" : formatValue ? formatValue(used) : String(used);
	const displayLimit = infinite
		? "Unlimited"
		: formatValue
			? formatValue(limit)
			: String(limit);
	const pct =
		used === null || infinite || limit <= 0
			? 0
			: Math.min(100, Math.round((used / limit) * 100));

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm text-slate-700">
					<span className="text-[#0f5384]">{icon}</span>
					{label}
				</div>
				<span className="text-xs text-slate-600">
					{displayUsed} / {displayLimit}
				</span>
			</div>
			<Progress value={used === null ? 0 : pct} className="h-2" />
		</div>
	);
}

export default function UsageMetersCard({
	storageUsed,
	storageLimit,
	usersUsed,
	usersLimit,
	departmentsUsed,
	departmentsLimit,
	contractsUsed,
	contractsLimit,
}: UsageMetersCardProps) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-5">
				<p className="text-sm font-medium sidebar-gradient-text">Usage</p>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<MeterRow
						label="Storage"
						used={storageUsed}
						limit={storageLimit}
						icon={<HardDrive className="h-4 w-4" />}
						formatValue={formatBytes}
					/>
					<MeterRow
						label="Seats"
						used={usersUsed}
						limit={usersLimit}
						icon={<Users className="h-4 w-4" />}
					/>
					<MeterRow
						label="Departments"
						used={departmentsUsed}
						limit={departmentsLimit ?? Number.POSITIVE_INFINITY}
						icon={<Building2 className="h-4 w-4" />}
					/>
					<MeterRow
						label="Contracts"
						used={contractsUsed}
						limit={contractsLimit ?? Number.POSITIVE_INFINITY}
						icon={<FileText className="h-4 w-4" />}
					/>
				</div>
				<p className="text-xs text-slate-500">
					Seat, department, and contract counts show when available. Storage is
					live from your workspace.
				</p>
			</CardContent>
		</Card>
	);
}
