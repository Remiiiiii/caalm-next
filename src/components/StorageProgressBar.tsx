"use client";

import { formatStorageUsedBytes } from "@/lib/storage/formatStorageUsed";
import type { StorageUsagePayload } from "@/lib/storage/storageUsage.types";

interface StorageProgressBarProps {
	totalSpace: StorageUsagePayload | null;
	maxSizeGB?: number;
	limitBytes?: number;
}

export default function StorageProgressBar({
	totalSpace,
	maxSizeGB,
	limitBytes,
}: StorageProgressBarProps) {
	if (!totalSpace) {
		return null;
	}

	const resolvedLimitBytes =
		limitBytes ??
		totalSpace.limitBytes ??
		(maxSizeGB ?? 100) * 1024 * 1024 * 1024;
	const resolvedMaxSizeGB =
		maxSizeGB ??
		totalSpace.limitGB ??
		resolvedLimitBytes / (1024 * 1024 * 1024);

	const totalSizeBytes = totalSpace.used || 0;
	const percentage = Math.min((totalSizeBytes / resolvedLimitBytes) * 100, 100);

	const { formatted: formattedUsed, unit: usedUnit } =
		formatStorageUsedBytes(totalSizeBytes);

	let progressColor = "rgb(22, 163, 74)";
	if (percentage >= 80) {
		progressColor = "rgb(220, 38, 38)";
	} else if (percentage >= 50) {
		progressColor = "rgb(217, 119, 6)";
	}

	const displayLimitGB =
		Number.isInteger(resolvedMaxSizeGB) || resolvedMaxSizeGB >= 10
			? Math.round(resolvedMaxSizeGB)
			: Number(resolvedMaxSizeGB.toFixed(1));

	return (
		<div className="w-full">
			<div className="space-y-1">
				<div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200">
					<div
						className="h-full transition-all"
						style={{
							width: `${percentage}%`,
							backgroundColor: progressColor,
						}}
					/>
				</div>
				<p className="text-xs text-center text-slate-600">
					{formattedUsed} {usedUnit} of {displayLimitGB} GB used
				</p>
			</div>
		</div>
	);
}
