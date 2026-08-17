"use client";

import {
	Activity,
	AlertTriangle,
	HardDrive,
	Server,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { StatCardIcon } from "@/components/ui/stat-card-icon";

interface OverviewMetrics {
	storageTotal?: string;
	storageUnit?: string;
	usersOnline?: number | null;
	apiHealthy?: boolean;
}

export default function SystemOverviewPage() {
	const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [storageRes, healthRes] = await Promise.all([
					fetch("/api/it/storage-metrics"),
					fetch("/api/storage/usage"),
				]);
				const storage = storageRes.ok ? await storageRes.json() : null;
				const usageOk = healthRes.ok;
				if (!cancelled) {
					setMetrics({
						storageTotal: storage?.total?.size?.toString(),
						storageUnit: storage?.total?.unit,
						apiHealthy: usageOk,
						usersOnline: null,
					});
				}
			} catch {
				if (!cancelled) {
					setMetrics({ apiHealthy: false });
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const cards = [
		{
			title: "Storage footprint",
			value: metrics?.storageTotal
				? `${metrics.storageTotal} ${metrics.storageUnit || ""}`
				: "—",
			icon: HardDrive,
			href: "/dashboard/it/storage",
		},
		{
			title: "API health",
			value: metrics?.apiHealthy ? "Healthy" : "Check required",
			icon: Server,
			href: "/dashboard/it/monitoring/system-health",
		},
		{
			title: "Rate limits",
			value: "Monitor",
			icon: Activity,
			href: "/dashboard/it/rate-limits",
		},
		{
			title: "Errors",
			value: "Review logs",
			icon: AlertTriangle,
			href: "/dashboard/it/monitoring/errors",
		},
	];

	return (
		<ITPageShell
			title="System Overview"
			subtitle="Operational snapshot across storage, API health, and limits"
			icon={Users}
		>
			{loading ? (
				<div className="py-12 flex justify-center">
					<LoadingSpinner size="sm" label="Loading overview…" />
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
					{cards.map((card) => (
						<Link
							key={card.title}
							href={card.href}
							className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 rounded-lg"
						>
							<GlassCard className="glass-card interactive-glass-card h-full transition-all duration-200 hover:border-blue-300">
								<div className="glass-card-cap" />
								<CardContent className="p-4 sm:p-6">
									<p className="text-sm font-medium sidebar-gradient-text">
										{card.title}
									</p>
									<div className="flex items-center text-2xl font-bold text-slate-700 pt-2">
										<span>{card.value}</span>
										<StatCardIcon className="ml-2" icon={card.icon} />
									</div>
								</CardContent>
							</GlassCard>
						</Link>
					))}
				</div>
			)}
			<ITGlassPanel>
				<p className="text-sm text-slate-600 mb-3">
					Jump to live IT tooling already wired in CAALM.
				</p>
				<div className="flex flex-wrap gap-3">
					<Button asChild className="primary-btn px-3 sm:px-4 cursor-pointer">
						<Link href="/dashboard/it/rate-limits">Rate limits</Link>
					</Button>
					<Button asChild variant="outline" className="cursor-pointer">
						<Link href="/dashboard/it/storage">Storage metrics</Link>
					</Button>
					<Button asChild variant="outline" className="cursor-pointer">
						<Link href="/audits/audit">Audit logs</Link>
					</Button>
				</div>
			</ITGlassPanel>
		</ITPageShell>
	);
}
