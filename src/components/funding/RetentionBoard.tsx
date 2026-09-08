"use client";

import { formatUsd } from "@/lib/funding/constants";
import type { RetentionStream } from "@/lib/funding/types";
import { cn } from "@/lib/utils";

const HEALTH_LABEL: Record<RetentionStream["health"], string> = {
	at_risk: "At risk",
	protecting: "Protecting",
	protected: "Protected",
	expired: "Expired",
};

export function RetentionBoard({
	loading,
	streams,
	selectedContractId,
	onSelect,
}: {
	loading: boolean;
	streams: RetentionStream[];
	selectedContractId: string | null;
	onSelect: (contractId: string) => void;
}) {
	if (loading) {
		return (
			<div className="glass-card rounded-xl p-4 text-sm text-slate-600 sm:p-6">
				<div className="glass-card-cap" />
				Loading dollar-ranked retention streams…
			</div>
		);
	}

	if (streams.length === 0) {
		return (
			<div className="glass-card rounded-xl p-4 text-sm text-slate-600 sm:p-6">
				<div className="glass-card-cap" />
				No contracts with funding amounts yet. Add amounts on contracts to see
				which dollar streams need protection.
			</div>
		);
	}

	return (
		<div className="glass-card overflow-hidden rounded-xl">
			<div className="glass-card-cap" />
			<div className="border-b border-slate-200 px-4 py-3 sm:px-6">
				<h2 className="text-xl font-semibold sidebar-gradient-text">
					Retention (dollar-ranked)
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Highest-value streams first. Click a row to manage obligations that
					keep the money.
				</p>
			</div>
			<ul className="divide-y divide-slate-200">
				{streams.map((stream) => {
					const selected = stream.contractId === selectedContractId;
					return (
						<li key={stream.contractId}>
							<button
								type="button"
								onClick={() => onSelect(stream.contractId)}
								className={cn(
									"flex w-full cursor-pointer items-start justify-between gap-4 px-4 py-4 text-left transition-all duration-200 sm:px-6",
									"hover:bg-blue-50",
									selected && "bg-blue-50",
									"focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								)}
							>
								<div className="min-w-0">
									<p className="truncate font-medium text-slate-700">
										{stream.contractName}
									</p>
									<p className="mt-1 text-xs text-slate-500">
										{stream.expiryDate
											? `Expires ${stream.expiryDate.slice(0, 10)}`
											: "No expiry on file"}
										{stream.daysUntilExpiry != null
											? ` · ${stream.daysUntilExpiry}d`
											: ""}
										{stream.openObligationCount
											? ` · ${stream.openObligationCount} open obligations`
											: ""}
									</p>
								</div>
								<div className="shrink-0 text-right">
									<p className="text-lg font-semibold tabular-nums text-slate-700">
										{formatUsd(stream.amount, stream.currency)}
									</p>
									<span
										className={cn(
											"mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium",
											stream.health === "at_risk" && "bg-red/15 text-red",
											stream.health === "protecting" &&
												"bg-orange/15 text-orange",
											stream.health === "protected" && "bg-green/15 text-green",
											stream.health === "expired" &&
												"bg-slate-200 text-slate-600",
										)}
									>
										{HEALTH_LABEL[stream.health]}
									</span>
								</div>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
