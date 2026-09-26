"use client";

import { DollarSign, Download, Gift, Loader2, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import type { DevelopmentMetrics } from "@/lib/development";
import { formatRetentionPercent } from "@/lib/development";

function formatDollars(value: number): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
}

export function DevelopmentDashboardClient() {
	const [metrics, setMetrics] = useState<DevelopmentMetrics | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/development/metrics");
			const json = await res.json();
			if (res.ok) setMetrics(json);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	if (loading) {
		return (
			<p className="text-sm text-slate-600 flex items-center gap-2">
				<Loader2 className="h-4 w-4 animate-spin" />
				Loading development metrics…
			</p>
		);
	}

	if (!metrics) {
		return (
			<p className="text-sm text-slate-600">Unable to load development metrics.</p>
		);
	}

	if (!metrics.hasPostedGifts) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
						<div className="w-12 h-12 rounded-xl bg-blue/10 flex items-center justify-center">
							<Gift className="h-6 w-6 text-[#0f5384]" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium sidebar-gradient-text">
								No posted gifts yet
							</p>
							<p className="text-sm text-slate-600 mt-1">
								Post a gift from the register or import constituents and gifts
								before board KPIs appear here. We do not show placeholder charts
								for an empty org.
							</p>
							<div className="mt-4 flex flex-wrap justify-end gap-3 w-full">
								<Button className="primary-btn px-3 sm:px-4" asChild>
									<Link href="/gifts/new">
										<Gift className="h-4 w-4" />
										Post a gift
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<div className="mb-6 flex items-center justify-end">
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4"
					onClick={() => {
						window.open("/api/development/board-pack/export", "_blank");
					}}
				>
					<Download className="h-4 w-4" />
					Export board pack (CSV)
				</Button>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium sidebar-gradient-text">
									YTD dollars
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span className="tabular-nums">
										{formatDollars(metrics.ytdDollars)}
									</span>
									<StatCardIcon className="ml-2" icon={DollarSign} />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									Posted gifts in {metrics.year}
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
									Unique donors YTD
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span className="tabular-nums">{metrics.uniqueDonorsYtd}</span>
									<StatCardIcon className="ml-2" icon={Users} />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									Donors with a posted gift this year
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
									Retention
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span className="tabular-nums">
										{formatRetentionPercent(metrics.retentionRate)}
									</span>
									<StatCardIcon className="ml-2" icon={Users} />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									Prior-year donors who gave again this year
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
									New donors
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span className="tabular-nums">{metrics.newDonorsYtd}</span>
									<StatCardIcon className="ml-2" icon={UserPlus} />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									First posted gift in {metrics.year}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
