"use client";

import {
	AlertCircle,
	Building2,
	FileText,
	HardDrive,
	Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

function meterState(
	used: number | null,
	limit: number,
): "normal" | "warn" | "over" {
	if (used === null || !Number.isFinite(limit) || limit <= 0) return "normal";
	const pct = (used / limit) * 100;
	if (pct > 100) return "over";
	if (pct >= 80) return "warn";
	return "normal";
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
	const state = meterState(used, limit);
	const overPct =
		used !== null && Number.isFinite(limit) && limit > 0 && used > limit
			? Math.round((used / limit) * 100)
			: null;

	return (
		<div
			className={cn(
				state === "warn" && "rounded-md",
				state === "over" && "rounded-md",
			)}
		>
			<div className="mb-1.5 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-medium text-slate-700">
					<span className="text-[#0f5384]">{icon}</span>
					{label}
				</div>
				<span
					className={cn(
						"tabular-nums text-[11px] text-slate-600",
						state === "over" && "font-semibold text-red",
					)}
				>
					{displayUsed} / {displayLimit}
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-300",
						state === "over" && "bg-red",
						state === "warn" && "bg-orange",
						state === "normal" && "bg-[#0f5384]",
					)}
					style={{ width: `${used === null ? 0 : pct}%` }}
				/>
			</div>
			{state === "over" && overPct !== null ? (
				<p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-red">
					<AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
					{overPct}% over limit — upgrade to avoid access issues
				</p>
			) : null}
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
			<CardContent className="space-y-4 p-4 sm:p-6">
				<p className="text-sm font-medium sidebar-gradient-text">Usage</p>

				<div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-0">
					<div
						className="pointer-events-none absolute top-0 bottom-0 left-1/2 hidden w-[1.5px] -translate-x-1/2 bg-slate-400/75 sm:block"
						aria-hidden
					/>
					<div
						className="pointer-events-none absolute right-0 left-0 top-1/2 hidden h-[1.5px] -translate-y-1/2 bg-slate-400/75 sm:block"
						aria-hidden
					/>
					<div className="sm:pr-6 sm:pb-5">
						<MeterRow
							label="Storage"
							used={storageUsed}
							limit={storageLimit}
							icon={<HardDrive className="h-3.5 w-3.5" />}
							formatValue={formatBytes}
						/>
					</div>
					<div className="sm:pb-5 sm:pl-6">
						<MeterRow
							label="Seats"
							used={usersUsed}
							limit={usersLimit}
							icon={<Users className="h-3.5 w-3.5" />}
						/>
					</div>
					<div className="sm:pr-6 sm:pt-5">
						<MeterRow
							label="Departments"
							used={departmentsUsed}
							limit={departmentsLimit ?? Number.POSITIVE_INFINITY}
							icon={<Building2 className="h-3.5 w-3.5" />}
						/>
					</div>
					<div className="sm:pt-5 sm:pl-6">
						<MeterRow
							label="Contracts"
							used={contractsUsed}
							limit={contractsLimit ?? Number.POSITIVE_INFINITY}
							icon={<FileText className="h-3.5 w-3.5" />}
						/>
					</div>
				</div>

				<p className="text-[11px] text-slate-500">
					Seat, department, and contract counts show when available. Storage is
					live from your workspace.
				</p>
			</CardContent>
		</Card>
	);
}
