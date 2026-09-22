"use client";

import { Brain } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	normalizeSegmentLabel,
	segmentBadgeClass,
} from "@/lib/fundraising/segment-display";

type IntelligencePayload = {
	segment: string;
	lapseRiskScore: number;
	topFeatures: Array<{ label: string; weight: number; direction: string }>;
	computedAt: string;
};

export function FundraisingIntelligenceTab({
	constituentId,
}: {
	constituentId: string;
}) {
	const [data, setData] = useState<IntelligencePayload | null>(null);
	const [forbidden, setForbidden] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/constituents/${encodeURIComponent(constituentId)}/fundraising-intelligence`,
				);
				if (res.status === 403) {
					if (!cancelled) setForbidden(true);
					return;
				}
				const json = await res.json();
				if (!cancelled && res.ok) setData(json);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [constituentId]);

	if (loading) {
		return <p className="text-sm text-slate-600 py-6">Loading intelligence…</p>;
	}
	if (forbidden) {
		return (
			<p className="text-sm text-slate-600 py-6">
				You need the ai.fundraising permission to view donor scores.
			</p>
		);
	}
	if (!data) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<Brain className="h-8 w-8 text-[#0f5384]" />
				<p className="mt-3 text-sm font-medium text-slate-700">No scores yet</p>
				<p className="mt-1 max-w-md text-xs text-slate-600">
					Run the nightly RFM job or wait for the platform cron to compute segments.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4 pt-4">
			<div className="flex flex-wrap items-center gap-3">
				<span
					className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${segmentBadgeClass(data.segment)}`}
				>
					{normalizeSegmentLabel(data.segment)}
				</span>
				<p className="text-sm text-slate-600">
					Lapse risk:{" "}
					<span className="font-semibold text-slate-700 tabular-nums">
						{data.lapseRiskScore}/100
					</span>
				</p>
			</div>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-3">
					<p className="text-sm font-medium sidebar-gradient-text">
						Top drivers
					</p>
					<ul className="space-y-2 text-sm text-slate-700">
						{data.topFeatures.map((feature) => (
							<li
								key={feature.label}
								className="flex justify-between gap-4 border-b border-slate-200 pb-2 last:border-0"
							>
								<span>{feature.label}</span>
								<span className="tabular-nums text-slate-500">
									weight {feature.weight}
								</span>
							</li>
						))}
					</ul>
					<p className="text-xs text-slate-500">
						Computed {new Date(data.computedAt).toLocaleString()}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
