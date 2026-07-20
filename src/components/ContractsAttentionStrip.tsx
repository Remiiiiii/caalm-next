"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useContractsView } from "@/components/ContractsViewContext";
import {
	isExpiringWithinDays,
} from "@/lib/contracts/contractsListUtils";
import type { UIFileDoc } from "@/types/files";

interface ContractsAttentionStripProps {
	files: UIFileDoc[];
}

export default function ContractsAttentionStrip({
	files,
}: ContractsAttentionStripProps) {
	const { setStatusTab, scrollToList } = useContractsView();

	const counts = useMemo(() => {
		let expiring = 0;
		let actionRequired = 0;
		files.forEach((file) => {
			if (isExpiringWithinDays(file, 90)) expiring++;
			if (file.status === "action-required") actionRequired++;
		});
		return { expiring, actionRequired };
	}, [files]);

	const total = counts.expiring + counts.actionRequired;
	if (total === 0) return null;

	return (
		<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-orange/20 bg-orange/10 px-4 py-3">
			<div className="flex items-start gap-3 min-w-0">
				<AlertTriangle className="h-5 w-5 text-orange shrink-0 mt-0.5" />
				<div>
					<p className="text-sm font-semibold text-slate-900">Needs attention</p>
					<p className="text-xs text-slate-600 mt-0.5">
						{counts.expiring > 0 && (
							<span>{counts.expiring} expiring within 90 days</span>
						)}
						{counts.expiring > 0 && counts.actionRequired > 0 && " · "}
						{counts.actionRequired > 0 && (
							<span>{counts.actionRequired} action required</span>
						)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{counts.expiring > 0 && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="cursor-pointer border-orange/30 hover:bg-orange/10"
						onClick={() => {
							setStatusTab("expiring");
							scrollToList();
						}}
					>
						View expiring
					</Button>
				)}
				{counts.actionRequired > 0 && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="cursor-pointer border-orange/30 hover:bg-orange/10"
						onClick={() => {
							setStatusTab("pending");
							scrollToList();
						}}
					>
						View pending
					</Button>
				)}
			</div>
		</div>
	);
}
