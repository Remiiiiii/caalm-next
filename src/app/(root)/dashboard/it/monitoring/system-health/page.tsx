"use client";

import { CheckCircle2, HeartPulse, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { LoadingSpinner } from "@/components/ui/loading";

interface HealthCheck {
	name: string;
	ok: boolean;
	detail: string;
}

export default function SystemHealthPage() {
	const [checks, setChecks] = useState<HealthCheck[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const results: HealthCheck[] = [];
			try {
				const storage = await fetch("/api/storage/usage");
				results.push({
					name: "Storage API",
					ok: storage.ok,
					detail: storage.ok ? "Responding" : `HTTP ${storage.status}`,
				});
			} catch {
				results.push({
					name: "Storage API",
					ok: false,
					detail: "Unreachable",
				});
			}

			try {
				const itStorage = await fetch("/api/it/storage-metrics");
				results.push({
					name: "IT storage metrics",
					ok: itStorage.ok,
					detail: itStorage.ok ? "Responding" : `HTTP ${itStorage.status}`,
				});
			} catch {
				results.push({
					name: "IT storage metrics",
					ok: false,
					detail: "Unreachable",
				});
			}

			results.push({
				name: "App runtime",
				ok: true,
				detail: "Next.js process alive",
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
			subtitle="Connectivity checks for core CAALM services"
			icon={HeartPulse}
		>
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
									<p className="text-sm font-medium text-slate-900">
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
