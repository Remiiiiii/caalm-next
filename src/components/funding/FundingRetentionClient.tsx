"use client";

import { useCallback, useEffect, useState } from "react";
import { ObligationsPanel } from "@/components/funding/ObligationsPanel";
import { PursuitsBoard } from "@/components/funding/PursuitsBoard";
import { RetentionBoard } from "@/components/funding/RetentionBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatUsd } from "@/lib/funding/constants";
import type { FundingPursuit, RetentionSummary } from "@/lib/funding/types";
import { cn } from "@/lib/utils";

type Tab = "retention" | "pursuits";

export function FundingRetentionClient() {
	const [tab, setTab] = useState<Tab>("retention");
	const [summary, setSummary] = useState<RetentionSummary | null>(null);
	const [pursuits, setPursuits] = useState<FundingPursuit[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedContractId, setSelectedContractId] = useState<string | null>(
		null,
	);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [retentionRes, pursuitsRes] = await Promise.all([
				fetch("/api/funding/retention"),
				fetch("/api/funding/pursuits"),
			]);
			if (!retentionRes.ok) throw new Error("Could not load retention streams");
			if (!pursuitsRes.ok) throw new Error("Could not load pursuits");
			const retentionJson = (await retentionRes.json()) as RetentionSummary;
			const pursuitsJson = (await pursuitsRes.json()) as {
				items?: FundingPursuit[];
			};
			setSummary(retentionJson);
			setPursuits(pursuitsJson.items || []);
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

	useEffect(() => {
		void load();
	}, [load]);

	const selectedStream =
		summary?.streams.find((s) => s.contractId === selectedContractId) || null;

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

			<div className="flex flex-wrap items-center gap-3">
				<Button
					className={cn(
						"primary-btn px-3 sm:px-4",
						tab !== "retention" && "opacity-70",
					)}
					variant={tab === "retention" ? "default" : "outline"}
					onClick={() => setTab("retention")}
				>
					Retention
				</Button>
				<Button
					className={cn(
						"primary-btn px-3 sm:px-4",
						tab !== "pursuits" && "opacity-70",
					)}
					variant={tab === "pursuits" ? "default" : "outline"}
					onClick={() => setTab("pursuits")}
				>
					Pursuits
				</Button>
				<Button
					variant="outline"
					className="primary-btn px-3 sm:px-4"
					onClick={() => void load()}
					disabled={loading}
				>
					Refresh
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
					<div className="lg:col-span-3">
						<RetentionBoard
							loading={loading}
							streams={summary?.streams || []}
							selectedContractId={selectedContractId}
							onSelect={setSelectedContractId}
						/>
					</div>
					<div className="lg:col-span-2">
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
