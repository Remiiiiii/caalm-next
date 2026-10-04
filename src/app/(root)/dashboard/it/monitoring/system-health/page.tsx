"use client";

import { CheckCircle2, HeartPulse, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { SampleDataBadge } from "@/components/ui/sample-data-badge";
import { LoadingSpinner } from "@/components/ui/loading";

interface HealthCheck {
	name: string;
	ok: boolean;
	detail: string;
}

export default function SystemHealthPage() {
	const [checks, setChecks] = useState<HealthCheck[]>([]);
	const [loading, setLoading] = useState(true);
	const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const results: HealthCheck[] = [];

			try {
				const dashboard = await fetch("/api/it/dashboard");
				if (dashboard.ok) {
					const json = await dashboard.json();
					const data = json?.data;
					if (typeof data?.notice === "string") {
						setDashboardNotice(data.notice);
					}
					const services = data?.systemHealth?.services ?? [];
					for (const service of services) {
						results.push({
							name: service.name,
							ok: service.status === "up",
							detail:
								service.detail ||
								(service.responseTime != null
									? `${service.responseTime} ms`
									: service.status),
						});
					}
				} else {
					results.push({
						name: "IT dashboard API",
						ok: false,
						detail: `HTTP ${dashboard.status}`,
					});
				}
			} catch {
				results.push({
					name: "IT dashboard API",
					ok: false,
					detail: "Unreachable",
				});
			}

			try {
				const storage = await fetch("/api/storage/usage");
				results.push({
					name: "Storage API (org files)",
					ok: storage.ok,
					detail: storage.ok ? "Responding" : `HTTP ${storage.status}`,
				});
			} catch {
				results.push({
					name: "Storage API (org files)",
					ok: false,
					detail: "Unreachable",
				});
			}

			try {
				const itStorage = await fetch("/api/it/storage-metrics");
				const body = itStorage.ok
					? await itStorage.json().catch(() => null)
					: null;
				const configured = body?.configured !== false && itStorage.ok;
				results.push({
					name: "IT storage disk scan",
					ok: configured,
					detail: configured
						? "Local disk scan available"
						: body?.notice ||
							(itStorage.ok
								? "Not configured on this host"
								: `HTTP ${itStorage.status}`),
				});
			} catch {
				results.push({
					name: "IT storage disk scan",
					ok: false,
					detail: "Unreachable",
				});
			}

			if (!cancelled) {
				setChecks(results);
				setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<ITPageShell
			title="System Health"
			subtitle="Live connectivity checks — not a full observability suite"
			icon={HeartPulse}
			actions={<SampleDataBadge label="Connectivity only" />}
		>
			{dashboardNotice ? (
				<p className="text-sm text-slate-600 mb-4 max-w-3xl">{dashboardNotice}</p>
			) : null}
			{loading ? (
				<div className="py-12 flex justify-center">
					<LoadingSpinner size="sm" label="Running health checks…" />
				</div>
			) : (
				<ITGlassPanel>
					<ul className="space-y-3">
						{checks.map((check) => (
							<li
								key={check.name}
								className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3"
							>
								<div>
									<p className="text-sm font-medium text-slate-700">
										{check.name}
									</p>
									<p className="text-xs text-slate-500">{check.detail}</p>
								</div>
								{check.ok ? (
									<CheckCircle2 className="h-5 w-5 text-green" />
								) : (
									<XCircle className="h-5 w-5 text-red" />
								)}
							</li>
						))}
					</ul>
				</ITGlassPanel>
			)}
		</ITPageShell>
	);
}
