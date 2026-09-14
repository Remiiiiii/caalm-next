"use client";

import { RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FundingViewSwitch } from "@/components/funding/FundingViewSwitch";
import { ObligationsPanel } from "@/components/funding/ObligationsPanel";
import { PursuitsBoard } from "@/components/funding/PursuitsBoard";
import { RetentionBoard } from "@/components/funding/RetentionBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatUsd, RETENTION_BOARD_HEIGHT_CLASS } from "@/lib/funding/constants";
import type { FundingPursuit, RetentionSummary } from "@/lib/funding/types";
import { cn } from "@/lib/utils";

type Tab = "retention" | "pursuits";

function tabFromSearch(params: URLSearchParams | null): Tab {
	return params?.get("tab") === "pursuits" ? "pursuits" : "retention";
}

export function FundingRetentionClient() {
	const searchParams = useSearchParams();
	const [tab, setTab] = useState<Tab>(() => tabFromSearch(searchParams));
	const [summary, setSummary] = useState<RetentionSummary | null>(null);
	const [pursuits, setPursuits] = useState<FundingPursuit[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedContractId, setSelectedContractId] = useState<string | null>(
		null,
	);
	const hasLoadedRef = useRef(false);

	useEffect(() => {
		setTab(tabFromSearch(searchParams));
	}, [searchParams]);

	const loadRetention = useCallback(async () => {
		if (!hasLoadedRef.current) setLoading(true);
		setError(null);
		try {
			const retentionRes = await fetch("/api/funding/retention");
			if (!retentionRes.ok) throw new Error("Could not load retention streams");
			const retentionJson = (await retentionRes.json()) as RetentionSummary;
			setSummary(retentionJson);
			hasLoadedRef.current = true;
			setSelectedContractId((prev) => {
				if (prev) return prev;
				return retentionJson.streams?.[0]?.contractId ?? null;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}, []);

	const loadPursuits = useCallback(async () => {
		try {
			const pursuitsRes = await fetch("/api/funding/pursuits");
			if (!pursuitsRes.ok) throw new Error("Could not load pursuits");
			const pursuitsJson = (await pursuitsRes.json()) as {
				items?: FundingPursuit[];
			};
			setPursuits(pursuitsJson.items || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		}
	}, []);

	const load = useCallback(async () => {
		await Promise.all([loadRetention(), loadPursuits()]);
	}, [loadRetention, loadPursuits]);

	useEffect(() => {
		void loadRetention();
	}, [loadRetention]);

	useEffect(() => {
		void loadPursuits();
	}, [loadPursuits]);

	const selectedStream = useMemo(() => {
		if (!summary || !selectedContractId) return null;
		return (
			summary.streams.find((s) => s.contractId === selectedContractId) || null
		);
	}, [summary, selectedContractId]);

	return (
		<div className="space-y-6">
			<div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
				<StatCard
					title="At risk"
					value={formatUsd(summary?.totalAtRiskAmount || 0)}
					hint="Funding that needs action soon"
				/>
				<StatCard
					title="Protecting"
					value={formatUsd(summary?.totalProtectingAmount || 0)}
					hint="Work underway to keep the money"
				/>
				<StatCard
					title="Protected"
					value={formatUsd(summary?.totalProtectedAmount || 0)}
					hint="Streams in good standing"
				/>
			</div>

			<div className="flex items-center justify-between gap-3">
				<FundingViewSwitch value={tab} onChange={setTab} />
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label="Refresh"
					className="h-10 w-10 rounded-full border-[0.25px] border-slate-300"
					onClick={() => void load()}
					disabled={loading}
				>
					<RefreshCw
						className={cn(
							"h-4 w-4 text-[#0f5384]",
							loading && "animate-spin",
						)}
					/>
				</Button>
			</div>

			{error ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 text-sm text-slate-700 sm:p-6">
						{error}. If tables were just added, ask an admin to run{" "}
						<code className="text-xs">
							node scripts/provision-funding-schema.mjs --apply
						</code>
						.
					</CardContent>
				</Card>
			) : null}

			{tab === "retention" ? (
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
					<div className={cn("lg:col-span-3", RETENTION_BOARD_HEIGHT_CLASS)}>
						<RetentionBoard
							loading={loading}
							streams={summary?.streams || []}
							departments={summary?.departments || []}
							selectedContractId={selectedContractId}
							onSelect={setSelectedContractId}
						/>
					</div>
					<div className={cn("lg:col-span-2", RETENTION_BOARD_HEIGHT_CLASS)}>
						<ObligationsPanel
							stream={selectedStream}
							onChanged={() => void load()}
						/>
					</div>
				</div>
			) : (
				<PursuitsBoard
					loading={loading}
					pursuits={pursuits}
					onChanged={() => void load()}
				/>
			)}
		</div>
	);
}

function StatCard({
	title,
	value,
	hint,
}: {
	title: string;
	value: string;
	hint: string;
}) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<p className="text-sm font-medium sidebar-gradient-text">{title}</p>
				<div className="flex items-center pt-2 text-3xl font-bold tabular-nums text-slate-700">
					<span>{value}</span>
				</div>
				<p className="mt-1 text-xs text-slate-600">{hint}</p>
			</CardContent>
		</Card>
	);
}
