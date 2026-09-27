"use client";

import { DollarSign, Loader2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

	return (
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
	);
}
