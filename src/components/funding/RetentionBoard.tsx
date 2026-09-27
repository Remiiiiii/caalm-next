"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	formatRetentionExpiryLine,
	formatUsd,
	RETENTION_BOARD_HEIGHT_CLASS,
	RETENTION_HEALTH_LABEL,
} from "@/lib/funding/constants";
import type { RetentionHealth, RetentionStream } from "@/lib/funding/types";
import { RETENTION_HEALTH } from "@/lib/funding/types";
import { cn } from "@/lib/utils";

type SortDir = "desc" | "asc";

function healthBadgeClass(health: RetentionStream["health"]): string {
	if (health === "at_risk") {
		return "bg-orange/10 text-orange border-orange/20";
	}
	if (health === "protecting") {
		return "bg-blue/10 text-blue border-blue/20";
	}
	if (health === "protected") {
		return "bg-green/10 text-green border-green/20";
	}
	return "bg-slate-100 text-slate-600 border-slate-200";
}

export function RetentionBoard({
	loading,
	streams,
	departments,
	selectedContractId,
	onSelect,
	missingFundOnly,
	onMissingFundOnlyChange,
}: {
	loading: boolean;
	streams: RetentionStream[];
	departments: string[];
	selectedContractId: string | null;
	onSelect: (contractId: string) => void;
	missingFundOnly?: boolean;
	onMissingFundOnlyChange?: (value: boolean) => void;
}) {
	const [query, setQuery] = useState("");
	const [department, setDepartment] = useState<string>("all");
	const [health, setHealth] = useState<string>("all");
	const [sortDir, setSortDir] = useState<SortDir>("desc");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const next = streams.filter((stream) => {
			if (department !== "all" && stream.department !== department) {
				return false;
			}
			if (health !== "all" && stream.health !== health) {
				return false;
			}
			if (!q) return true;
			const haystack = [
				stream.contractName,
				stream.contractNumber,
				stream.counterpartyName,
				stream.department,
				stream.ownerName,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(q);
		});
		next.sort((a, b) =>
			sortDir === "desc" ? b.amount - a.amount : a.amount - b.amount,
		);
		return next;
	}, [streams, query, department, health, sortDir]);

	if (loading) {
		return (
			<div
				className={cn(
					"glass-card flex flex-col rounded-xl p-4 text-sm text-slate-600 sm:p-6",
					RETENTION_BOARD_HEIGHT_CLASS,
				)}
			>
				<div className="glass-card-cap" />
				Loading dollar-ranked retention streams…
			</div>
		);
	}

	if (streams.length === 0) {
		return (
			<div
				className={cn(
					"glass-card flex flex-col rounded-xl p-4 text-sm text-slate-600 sm:p-6",
					RETENTION_BOARD_HEIGHT_CLASS,
				)}
			>
				<div className="glass-card-cap" />
				No contracts with funding amounts yet. Add amounts on contracts to see
				which dollar streams need protection.
			</div>
		);
	}

	return (
		<div
			className={cn(
				"glass-card flex flex-col overflow-hidden rounded-xl",
				RETENTION_BOARD_HEIGHT_CLASS,
			)}
		>
			<div className="glass-card-cap" />
			<div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-6">
				<h2 className="mt-4 text-xl font-semibold sidebar-gradient-text">
					Retention (dollar-ranked)
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Highest-value streams first. Click a row to manage obligations that
					keep the money.
				</p>
				<div className="mt-3 flex flex-wrap items-center justify-end gap-3">
					{onMissingFundOnlyChange ? (
						<button
							type="button"
							className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
								missingFundOnly
									? "bg-orange/10 text-orange border-orange/20"
									: "bg-slate-100 text-slate-600 border-slate-200 hover:border-orange/20"
							}`}
							onClick={() => onMissingFundOnlyChange(!missingFundOnly)}
						>
							Missing fund
						</button>
					) : null}
				</div>
				<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
					<SearchField
						containerClassName="sm:col-span-1"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search streams…"
						aria-label="Search retention streams"
					/>
					<Select value={department} onValueChange={setDepartment}>
						<SelectTrigger
							className="h-10 border-[0.25px] border-slate-300"
							aria-label="Filter by department"
						>
							<SelectValue placeholder="Department" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All departments</SelectItem>
							{departments.map((dept) => (
								<SelectItem key={dept} value={dept}>
									{dept}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={health} onValueChange={setHealth}>
						<SelectTrigger
							className="h-10 border-[0.25px] border-slate-300"
							aria-label="Filter by health"
						>
							<SelectValue placeholder="Health" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All health</SelectItem>
							{RETENTION_HEALTH.map((value) => (
								<SelectItem key={value} value={value}>
									{RETENTION_HEALTH_LABEL[value as RetentionHealth]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:px-6">
				<span>
					Showing {filtered.length} of {streams.length} streams
				</span>
				<button
					type="button"
					className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-slate-700 transition-colors duration-200 hover:bg-white hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					onClick={() =>
						setSortDir((prev) => (prev === "desc" ? "asc" : "desc"))
					}
					aria-label={
						sortDir === "desc"
							? "Sort by value ascending"
							: "Sort by value descending"
					}
				>
					Sorted by value
					{sortDir === "desc" ? (
						<ArrowDown className="h-3 w-3" aria-hidden />
					) : (
						<ArrowUp className="h-3 w-3" aria-hidden />
					)}
				</button>
			</div>
			<ul className="min-h-0 flex-1 divide-y divide-slate-200 overflow-y-auto">
				{filtered.length === 0 ? (
					<li className="px-4 py-6 text-sm text-slate-500 sm:px-6">
						No streams match this search or filter.
					</li>
				) : (
					filtered.map((stream) => {
						const selected = stream.contractId === selectedContractId;
						const expired = stream.health === "expired";
						const metaParts = [
							stream.department || null,
							stream.nameIsDuplicate && stream.counterpartyName
								? stream.counterpartyName
								: null,
							formatRetentionExpiryLine(
								stream.expiryDate,
								stream.daysUntilExpiry,
							),
						].filter(Boolean);

						return (
							<li key={stream.contractId}>
								<button
									type="button"
									onClick={() => onSelect(stream.contractId)}
									className={cn(
										"flex w-full cursor-pointer items-start justify-between gap-4 border-l-4 px-4 py-4 text-left transition-all duration-200 sm:px-6",
										"hover:bg-blue-50",
										"focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										selected
											? "border-l-[#0f5384] bg-blue-50"
											: "border-l-transparent",
										expired && "opacity-50",
									)}
								>
									<div className="min-w-0">
										<p
											className={cn(
												"truncate font-medium",
												expired ? "text-slate-500" : "text-slate-700",
											)}
										>
											{stream.contractName}
											{stream.contractNumber ? (
												<span className="ml-2 font-normal text-slate-500">
													#{stream.contractNumber}
												</span>
											) : null}
										</p>
										<p className="mt-1 text-xs text-slate-500">
											{metaParts.join(" · ")}
										</p>
									</div>
									<div className="shrink-0 text-right">
										<p
											className={cn(
												"text-lg font-semibold tabular-nums",
												expired ? "text-slate-500" : "text-slate-700",
											)}
										>
											{formatUsd(stream.amount, stream.currency)}
										</p>
										<div className="mt-1 flex flex-col items-end gap-1">
											<span
												className={cn(
													"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
													healthBadgeClass(stream.health),
												)}
											>
												{RETENTION_HEALTH_LABEL[stream.health]}
											</span>
											{stream.missingFund ? (
												<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-orange/10 text-orange border-orange/20">
													Missing fund
												</span>
											) : null}
										</div>
									</div>
								</button>
							</li>
						);
					})
				)}
			</ul>
		</div>
	);
}
