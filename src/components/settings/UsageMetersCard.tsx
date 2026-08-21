"use client";

import { Building2, FileText, HardDrive, KeyRound, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
	departmentsLimit: number;
	contractsUsed: number | null;
	contractsLimit: number;
	licensesUsed?: number | null;
	licensesLimit?: number;
	aiExtractionsUsed?: number | null;
	aiExtractionsLimit?: number;
	/** Show upgrade CTA when any finite meter is at/above this % (default 80). */
	onUpgradeClick?: () => void;
	nearLimitPercent?: number;
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

function meterPct(used: number | null, limit: number): number {
	if (used === null || !Number.isFinite(limit) || limit <= 0) return 0;
	return Math.min(100, Math.round((used / limit) * 100));
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
	const pct = meterPct(used, limit);

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
	licensesUsed = null,
	licensesLimit = Number.POSITIVE_INFINITY,
	aiExtractionsUsed = null,
	aiExtractionsLimit = Number.POSITIVE_INFINITY,
	onUpgradeClick,
	nearLimitPercent = 80,
}: UsageMetersCardProps) {
	const meters: Array<{ used: number | null; limit: number }> = [
		{ used: storageUsed, limit: storageLimit },
		{ used: usersUsed, limit: usersLimit },
		{ used: departmentsUsed, limit: departmentsLimit },
		{ used: contractsUsed, limit: contractsLimit },
		{ used: licensesUsed, limit: licensesLimit },
		{ used: aiExtractionsUsed, limit: aiExtractionsLimit },
	];
	const nearLimit = meters.some(
		(m) => meterPct(m.used, m.limit) >= nearLimitPercent,
	);

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-5">
				<div className="flex items-center justify-between gap-3">
					<p className="text-sm font-medium sidebar-gradient-text">Usage</p>
					{nearLimit && onUpgradeClick && (
						<Button
							variant="outline"
							size="sm"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={onUpgradeClick}
						>
							Upgrade plan
						</Button>
					)}
				</div>
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
						limit={departmentsLimit}
						icon={<Building2 className="h-4 w-4" />}
					/>
					<MeterRow
						label="Contracts"
						used={contractsUsed}
						limit={contractsLimit}
						icon={<FileText className="h-4 w-4" />}
					/>
					<MeterRow
						label="Licenses"
						used={licensesUsed}
						limit={licensesLimit}
						icon={<KeyRound className="h-4 w-4" />}
					/>
					<MeterRow
						label="AI extractions (this month)"
						used={aiExtractionsUsed}
						limit={aiExtractionsLimit}
						icon={<Sparkles className="h-4 w-4" />}
					/>
				</div>
				<p className="text-xs text-slate-500">
					Hitting a limit blocks invites, new contracts, uploads, or AI extract
					until you upgrade or free capacity.
				</p>
			</CardContent>
		</Card>
	);
}
