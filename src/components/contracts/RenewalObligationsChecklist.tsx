"use client";

import { ExternalLink, ListChecks } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
	formatObligationDueLine,
	OBLIGATION_KIND_LABEL,
	obligationStatusBadgeClass,
	OBLIGATION_STATUS_LABEL,
} from "@/lib/funding/obligation-display";
import type { RenewalObligationsResult } from "@/lib/funding/obligation-renewal.service";
import { cn } from "@/lib/utils";

type RenewalObligationsChecklistProps = {
	contractId: string;
	open: boolean;
};

export function RenewalObligationsChecklist({
	contractId,
	open,
}: RenewalObligationsChecklistProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<RenewalObligationsResult | null>(null);

	useEffect(() => {
		if (!open || !contractId) return;

		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(
					`/api/contracts/${encodeURIComponent(contractId)}/renewal-obligations`,
				);
				if (!res.ok) {
					throw new Error("Could not load renewal obligations");
				}
				const json = (await res.json()) as RenewalObligationsResult;
				if (!cancelled) setResult(json);
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load");
					setResult(null);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, contractId]);

	const items = result?.items ?? [];
	const streamHref = `/contracts/funding-retention?tab=retention&stream=${encodeURIComponent(contractId)}`;

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="flex items-center gap-2 text-sm font-medium sidebar-gradient-text">
						<ListChecks className="h-4 w-4 text-[#0f5384]" aria-hidden />
						Renewal obligations
					</p>
					<p className="mt-1 text-xs text-slate-600">
						Open checklist items linked to this renewal. Close or waive them in
						Funding & Retention before you renew.
					</p>
				</div>
				<Link
					href={streamHref}
					className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#0f5384] hover:underline"
				>
					Manage
					<ExternalLink className="h-3 w-3" aria-hidden />
				</Link>
			</div>

			{loading ? (
				<p className="mt-3 text-sm text-slate-600">Loading obligations…</p>
			) : null}
			{error ? (
				<p className="mt-3 text-sm text-red">{error}</p>
			) : null}
			{!loading && !error && items.length === 0 ? (
				<p className="mt-3 text-sm text-slate-600">
					No open renewal-linked obligations on this contract.
				</p>
			) : null}

			{items.length > 0 ? (
				<ul className="mt-3 space-y-2">
					{items.map((item) => {
						const dueLine = formatObligationDueLine(item.dueDate);
						return (
							<li
								key={item.$id}
								className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
							>
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-sm font-medium text-slate-700">
										{item.title}
									</span>
									<span
										className={cn(
											"inline-block px-2 py-0.5 text-xs rounded-full font-medium border",
											obligationStatusBadgeClass(item.status),
										)}
									>
										{OBLIGATION_STATUS_LABEL[item.status]}
									</span>
									<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-blue/10 text-blue border-blue/20">
										{OBLIGATION_KIND_LABEL[item.kind]}
									</span>
								</div>
								<div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-600">
									{item.ownerName ? <span>Owner: {item.ownerName}</span> : null}
									{dueLine ? <span>{dueLine}</span> : null}
								</div>
							</li>
						);
					})}
				</ul>
			) : null}

			{result && result.overdueCount > 0 ? (
				<p className="mt-3 text-xs text-red">
					{result.overdueCount} overdue renewal{" "}
					{result.overdueCount === 1 ? "item needs" : "items need"} attention
					before you renew.
				</p>
			) : null}
		</div>
	);
}
