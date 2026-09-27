"use client";

import { RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FundingView } from "@/components/funding/FundingViewSwitch";
import { FundingViewSwitch } from "@/components/funding/FundingViewSwitch";
import { ObligationsPanel } from "@/components/funding/ObligationsPanel";
import { ObligationsQueueBoard } from "@/components/funding/ObligationsQueueBoard";
import { PursuitsBoard } from "@/components/funding/PursuitsBoard";
import { FinanceScopeHelp } from "@/components/funding/FinanceScopeHelp";
import { Form990ExportPanel } from "@/components/funding/Form990ExportPanel";
import { RetentionBoard } from "@/components/funding/RetentionBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	formatUsd,
	RETENTION_BOARD_HEIGHT_CLASS,
} from "@/lib/funding/constants";
import type { FundingPursuit, RetentionSummary } from "@/lib/funding/types";
import { cn } from "@/lib/utils";

function tabFromSearch(params: URLSearchParams | null): FundingView {
	if (params?.get("stream")) return "retention";
	const tab = params?.get("tab");
	if (tab === "pursuits") return "pursuits";
	if (tab === "queue") return "queue";
	return "retention";
}

function fundingRetentionHref(
	tab: FundingView,
	streamId?: string | null,
): string {
	const params = new URLSearchParams();
	if (tab !== "retention") params.set("tab", tab);
	if (streamId && tab === "retention") params.set("stream", streamId);
	const query = params.toString();
	return query
		? `/contracts/funding-retention?${query}`
		: "/contracts/funding-retention";
}

export function FundingRetentionClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [tab, setTab] = useState<FundingView>(() =>
		tabFromSearch(searchParams),
	);
	const [summary, setSummary] = useState<RetentionSummary | null>(null);
	const [pursuits, setPursuits] = useState<FundingPursuit[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedContractId, setSelectedContractId] = useState<string | null>(
		() => searchParams.get("stream"),
	);
	const [queueRefresh, setQueueRefresh] = useState(0);
	const [missingFundOnly, setMissingFundOnly] = useState(false);
	const hasLoadedRef = useRef(false);

	useEffect(() => {
		const nextTab = tabFromSearch(searchParams);
		const stream = searchParams.get("stream");
		setTab(nextTab);
		if (stream) {
			setSelectedContractId(stream);
		}
	}, [searchParams]);

	const loadRetention = useCallback(async () => {
		if (!hasLoadedRef.current) setLoading(true);
		setError(null);
		try {
			const retentionUrl = missingFundOnly
				? "/api/funding/retention?missingFund=true"
				: "/api/funding/retention";
			const retentionRes = await fetch(retentionUrl);
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
	}, [missingFundOnly]);

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
		setQueueRefresh((n) => n + 1);
	}, [loadRetention, loadPursuits]);

	useEffect(() => {
		void loadRetention();
	}, [loadRetention, missingFundOnly]);

	useEffect(() => {
		void loadPursuits();
	}, [loadPursuits]);

	const selectedStream = useMemo(() => {
		if (!summary || !selectedContractId) return null;
		return (
			summary.streams.find((s) => s.contractId === selectedContractId) || null
		);
	}, [summary, selectedContractId]);

	function changeTab(next: FundingView) {
		setTab(next);
		router.replace(fundingRetentionHref(next), { scroll: false });
	}

	function viewStream(contractId: string) {
		setSelectedContractId(contractId);
		setTab("retention");
		router.replace(fundingRetentionHref("retention", contractId), {
			scroll: false,
		});
	}

	return (
		<div className="space-y-6">
			<FinanceScopeHelp />
			{tab === "retention" ? <Form990ExportPanel /> : null}
			{tab !== "queue" ? (
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
			) : null}

			<div className="flex items-center justify-between gap-3">
				<FundingViewSwitch value={tab} onChange={changeTab} />
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
						className={cn("h-4 w-4 text-[#0f5384]", loading && "animate-spin")}
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
							missingFundOnly={missingFundOnly}
							onMissingFundOnlyChange={setMissingFundOnly}
						/>
					</div>
					<div className={cn("lg:col-span-2", RETENTION_BOARD_HEIGHT_CLASS)}>
						<ObligationsPanel
							stream={selectedStream}
							onChanged={() => void load()}
						/>
					</div>
				</div>
			) : null}

			{tab === "pursuits" ? (
				<PursuitsBoard
					loading={loading}
					pursuits={pursuits}
					onChanged={() => void load()}
				/>
			) : null}

			{tab === "queue" ? (
				<ObligationsQueueBoard
					refreshToken={queueRefresh}
					onViewStream={viewStream}
				/>
			) : null}
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
