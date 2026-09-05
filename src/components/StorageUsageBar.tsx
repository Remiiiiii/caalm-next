"use client";

import { Loader2 } from "lucide-react";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import StorageProgressBar from "./StorageProgressBar";

interface StorageUsageBarProps {
	showLabel?: boolean;
	className?: string;
}

export default function StorageUsageBar({
	showLabel = false,
	className,
}: StorageUsageBarProps) {
	const { totalSpace, limitGB, isLoading } = useStorageUsage();

	if (isLoading && !totalSpace) {
		return (
			<div
				className={`flex items-center justify-center gap-2 py-2 text-xs text-slate-500 ${className ?? ""}`}
			>
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
				Loading storage…
			</div>
		);
	}

	if (!totalSpace) {
		return null;
	}

	return (
		<div className={className ?? ""}>
			{showLabel ? (
				<p className="mb-1 text-md text-slate-500">Account storage</p>
			) : null}
			<StorageProgressBar
				totalSpace={totalSpace}
				maxSizeGB={limitGB ?? undefined}
				limitBytes={totalSpace.limitBytes}
			/>
		</div>
	);
}
