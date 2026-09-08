"use client";

import { GitCompare } from "lucide-react";
import { NegotiationClauseNav } from "@/components/contracts/negotiation/NegotiationClauseNav";
import type { DiffSummary } from "@/lib/contracts/negotiation/diff-summary";
import type { ClauseTocEntry } from "@/lib/contracts/negotiation/document-model";
import type { ContractDocumentVersion } from "@/lib/contracts/negotiation/versions.service";
import { cn } from "@/lib/utils";

interface NegotiationVersionPanelProps {
	versions: ContractDocumentVersion[];
	selectedId: string;
	onSelect: (id: string) => void;
	summaries: Record<string, DiffSummary>;
	toc: ClauseTocEntry[];
	activeClauseId: string;
	onJumpToClause: (entry: ClauseTocEntry) => void;
}

export function NegotiationVersionPanel({
	versions,
	selectedId,
	onSelect,
	summaries,
	toc,
	activeClauseId,
	onJumpToClause,
}: NegotiationVersionPanelProps) {
	const sorted = [...versions].sort(
		(a, b) => b.versionNumber - a.versionNumber,
	);
	const currentNumber = sorted[0]?.versionNumber;
	const activeIndex = Math.max(
		0,
		toc.findIndex((entry) => entry.id === activeClauseId),
	);
	const sectionLabel =
		toc.length > 0
			? `Section ${activeIndex + 1} of ${toc.length}`
			: null;

	return (
		<aside className="flex max-h-[32vh] min-h-0 w-full shrink-0 flex-col border-r border-slate-200 bg-white/70 xl:max-h-none xl:w-[230px]">
			<div className="shrink-0 border-b border-slate-200 px-4 py-3">
				<div className="flex items-center gap-2">
					<GitCompare className="h-4 w-4 text-[#0f5384]" />
					<p className="text-sm font-medium sidebar-gradient-text">Versions</p>
				</div>
				{sectionLabel ? (
					<p className="mt-1 text-[11px] text-slate-500 tabular-nums">
						{sectionLabel}
					</p>
				) : null}
			</div>

			{/* Show ~3 version cards before scrolling; keeps Jump to clause higher. */}
			<div className="max-h-[16.5rem] shrink-0 overflow-y-auto">
				<ul className="space-y-2 p-3">
					{sorted.map((version) => {
						const active = version.$id === selectedId;
						const summary = summaries[version.$id];
						return (
							<li key={version.$id}>
								<button
									type="button"
									onClick={() => onSelect(version.$id)}
									className={cn(
										"w-full cursor-pointer rounded-lg border bg-white p-3 text-left transition-all duration-200",
										active
											? "border-blue-300 bg-blue-50 shadow-sm"
											: "border-slate-200 hover:border-blue-300 hover:bg-blue-50",
									)}
								>
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium text-slate-700">
											v{version.versionNumber}
											{version.versionNumber === currentNumber ? (
												<span className="ml-1 text-xs font-normal text-slate-500">
													(current)
												</span>
											) : null}
										</p>
										{summary && (summary.adds > 0 || summary.removes > 0) ? (
											<span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums">
												<span className="text-green">+{summary.adds}</span>
												<span className="text-red">−{summary.removes}</span>
											</span>
										) : null}
									</div>
									<p className="mt-1 text-xs text-slate-500">
										{version.changeSummary || version.source.replace("_", " ")}
									</p>
								</button>
							</li>
						);
					})}
					{versions.length === 0 ? (
						<li className="px-2 text-xs text-slate-500">
							No snapshots yet. Start negotiation to create v1.
						</li>
					) : null}
				</ul>
			</div>

			{/* Clause jump sits directly under the version list (not pushed to the bottom). */}
			{toc.length > 0 ? (
				<div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-200">
					<NegotiationClauseNav
						toc={toc}
						activeClauseId={activeClauseId}
						onJump={onJumpToClause}
					/>
				</div>
			) : null}
		</aside>
	);
}
