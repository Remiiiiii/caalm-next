"use client";

import { Check, HeartHandshake, Loader2, Mail, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import type { StewardshipMetrics } from "@/lib/stewardship";
import {
	normalizeSegmentLabel,
	segmentBadgeClass,
} from "@/lib/fundraising/segment-display";
import type { StewardshipQueueRow } from "@/lib/stewardship";

function formatCurrency(value: number | null): string {
	if (value == null) return "—";
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
}

export function StewardshipQueueClient() {
	const [items, setItems] = useState<StewardshipQueueRow[]>([]);
	const [metrics, setMetrics] = useState<StewardshipMetrics | null>(null);
	const [loading, setLoading] = useState(true);
	const [contactingId, setContactingId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/constituents/stewardship");
			const json = await res.json();
			if (res.ok) {
				setItems(json.items ?? []);
				setMetrics(json.metrics ?? null);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const markContacted = async (constituentId: string) => {
		setContactingId(constituentId);
		try {
			const res = await fetch("/api/constituents/stewardship/contacted", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ constituentId }),
			});
			if (res.ok) {
				setItems((prev) => prev.filter((row) => row.constituentId !== constituentId));
			}
		} finally {
			setContactingId(null);
		}
	};

	if (loading) {
		return (
			<p className="text-sm text-slate-600 flex items-center gap-2">
				<Loader2 className="h-4 w-4 animate-spin" />
				Loading stewardship queue…
			</p>
		);
	}

	const metricsStrip = metrics ? (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium sidebar-gradient-text">
								Contacted this week
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span className="tabular-nums">{metrics.contactedThisWeek}</span>
								<StatCardIcon className="ml-2" icon={Check} />
							</div>
							<p className="text-xs text-slate-600 mt-1">
								Stewardship outreach logged since Monday
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium sidebar-gradient-text">
								Still at-risk
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span className="tabular-nums">{metrics.stillAtRisk}</span>
								<StatCardIcon className="ml-2" icon={Users} />
							</div>
							<p className="text-xs text-slate-600 mt-1">Rows in this queue</p>
						</div>
					</div>
				</CardContent>
			</Card>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium sidebar-gradient-text">
								Receipts sent
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span className="tabular-nums">{metrics.receiptsSent}</span>
								<StatCardIcon className="ml-2" icon={Mail} />
							</div>
							<p className="text-xs text-slate-600 mt-1">
								Posted gifts with receipt email logged
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	) : null;

	if (items.length === 0) {
		return (
			<>
				{metricsStrip}
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 flex flex-col items-center py-12 text-center">
					<HeartHandshake className="h-8 w-8 text-[#0f5384]" />
					<p className="mt-3 text-sm font-medium text-slate-700">
						No at-risk constituents in the queue
					</p>
					<p className="mt-1 max-w-md text-xs text-slate-600">
						When RFM scores flag At-risk or Lapsed donors, they appear here until
						you mark them contacted or the nightly job recomputes segments.
					</p>
				</CardContent>
			</Card>
			</>
		);
	}

	return (
		<div className="space-y-4">
			{metricsStrip}
			{items.map((row) => (
				<Card key={row.segmentRowId} className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div className="space-y-2 min-w-0">
								<div className="flex flex-wrap items-center gap-3">
									<Link
										href={`/constituents/${row.constituentId}`}
										className="text-lg font-semibold sidebar-gradient-text hover:underline"
									>
										{row.displayName}
									</Link>
									<span
										className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${segmentBadgeClass(row.segment)}`}
									>
										{normalizeSegmentLabel(row.segment)}
									</span>
								</div>
								<p className="text-sm text-slate-600">
									Lapse risk{" "}
									<span className="font-semibold text-slate-700 tabular-nums">
										{row.lapseRiskScore}/100
									</span>
									<span className="mx-2">·</span>
									Last gift {formatCurrency(row.lastGiftAmount)}
									{row.lastGiftDate ? (
										<span className="text-slate-500">
											{" "}
											on {new Date(row.lastGiftDate).toLocaleDateString()}
										</span>
									) : null}
								</p>
								{row.nextBestAction ? (
									<p className="text-xs text-slate-600">
										Next:{" "}
										<span className="font-medium text-slate-700">
											{row.nextBestAction.title}
										</span>
										{" — "}
										{row.nextBestAction.rationale}
									</p>
								) : null}
							</div>
							<div className="flex justify-end shrink-0">
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4"
									disabled={contactingId === row.constituentId}
									onClick={() => void markContacted(row.constituentId)}
								>
									{contactingId === row.constituentId ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Check className="h-4 w-4" />
									)}
									Mark contacted
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
