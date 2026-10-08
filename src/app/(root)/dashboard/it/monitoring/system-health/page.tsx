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
			const [dashboardRes, storageRes, itStorageRes] = await Promise.all([
				fetch("/api/it/dashboard")
					.then(async (dashboard) => {
						if (dashboard.ok) {
							const json = await dashboard.json();
							return { ok: true as const, json, status: dashboard.status };
						}
						return { ok: false as const, json: null, status: dashboard.status };
					})
					.catch(() => ({ ok: false as const, json: null, status: 0 })),
				fetch("/api/storage/usage")
					.then((storage) => ({
						ok: storage.ok,
						status: storage.status,
					}))
					.catch(() => ({ ok: false, status: 0 })),
				fetch("/api/it/storage-metrics")
					.then(async (itStorage) => {
						const body = itStorage.ok
							? await itStorage.json().catch(() => null)
							: null;
						return { ok: itStorage.ok, body, status: itStorage.status };
					})
					.catch(() => ({ ok: false, body: null, status: 0 })),
			]);

			const results: HealthCheck[] = [];

			if (dashboardRes.ok) {
				const data = dashboardRes.json?.data;
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
					detail:
						dashboardRes.status === 0
							? "Unreachable"
							: `HTTP ${dashboardRes.status}`,
				});
			}

			results.push({
				name: "Storage API (org files)",
				ok: storageRes.ok,
				detail: storageRes.ok
					? "Responding"
					: storageRes.status === 0
						? "Unreachable"
						: `HTTP ${storageRes.status}`,
			});

			const configured =
				itStorageRes.body?.configured !== false && itStorageRes.ok;
			results.push({
				name: "IT storage disk scan",
				ok: configured,
				detail: configured
					? "Local disk scan available"
					: itStorageRes.body?.notice ||
						(itStorageRes.ok
							? "Not configured on this host"
							: itStorageRes.status === 0
								? "Unreachable"
								: `HTTP ${itStorageRes.status}`),
			});

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
