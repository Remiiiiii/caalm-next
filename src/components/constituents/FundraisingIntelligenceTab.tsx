"use client";

import { Brain, Check, DollarSign } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConstituentWealthPanel } from "@/components/constituents/ConstituentWealthPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	normalizeSegmentLabel,
	segmentBadgeClass,
} from "@/lib/fundraising/segment-display";

type IntelligencePayload = {
	segment: string;
	lapseRiskScore: number;
	upgradeReadinessScore: number | null;
	suggestedAsk: number | null;
	effectiveAsk: number | null;
	askOverrideAmount: number | null;
	askOverrideReason: string | null;
	capacityBand: number | null;
	topFeatures: Array<{ label: string; weight: number; direction: string }>;
	computedAt: string;
};

function formatCurrency(value: number | null): string {
	if (value == null) return "—";
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
}

export function FundraisingIntelligenceTab({
	constituentId,
}: {
	constituentId: string;
}) {
	const [data, setData] = useState<IntelligencePayload | null>(null);
	const [forbidden, setForbidden] = useState(false);
	const [loading, setLoading] = useState(true);
	const [overrideAmount, setOverrideAmount] = useState("");
	const [overrideReason, setOverrideReason] = useState("");
	const [savingOverride, setSavingOverride] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(
				`/api/constituents/${encodeURIComponent(constituentId)}/fundraising-intelligence`,
			);
			if (res.status === 403) {
				setForbidden(true);
				return;
			}
			if (res.status === 404) {
				setData(null);
				return;
			}
			const json = await res.json();
			if (res.ok) {
				setData(json);
				if (json.askOverrideAmount != null) {
					setOverrideAmount(String(json.askOverrideAmount));
				}
				if (json.askOverrideReason) {
					setOverrideReason(json.askOverrideReason);
				}
			}
		} finally {
			setLoading(false);
		}
	}, [constituentId]);

	useEffect(() => {
		void load();
	}, [load]);

	const saveOverride = async () => {
		setSavingOverride(true);
		try {
			const res = await fetch(
				`/api/constituents/${encodeURIComponent(constituentId)}/fundraising-intelligence`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						askOverrideAmount: Number(overrideAmount),
						askOverrideReason: overrideReason,
					}),
				},
			);
			const json = await res.json();
			if (res.ok) setData(json);
		} finally {
			setSavingOverride(false);
		}
	};

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
			<div className="space-y-6 pt-4">
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<Brain className="h-8 w-8 text-[#0f5384]" />
					<p className="mt-3 text-sm font-medium text-slate-700">No scores yet</p>
					<p className="mt-1 max-w-md text-xs text-slate-600">
						Run the nightly RFM job or wait for the platform cron to compute
						segments. Uncomputed scores stay blank; we do not show zero placeholders.
					</p>
				</div>
				<ConstituentWealthPanel constituentId={constituentId} />
			</div>
		);
	}

	return (
		<div className="space-y-6 pt-4">
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
				{data.upgradeReadinessScore != null ? (
					<p className="text-sm text-slate-600">
						Upgrade readiness:{" "}
						<span className="font-semibold text-slate-700 tabular-nums">
							{data.upgradeReadinessScore}/100
						</span>
					</p>
				) : null}
				<p className="text-sm text-slate-600">
					Suggested ask:{" "}
					<span className="font-semibold text-slate-700 tabular-nums">
						{formatCurrency(data.effectiveAsk)}
					</span>
					{data.askOverrideAmount != null ? (
						<span className="text-xs text-slate-500 ml-1">(staff override)</span>
					) : null}
				</p>
				{data.capacityBand != null ? (
					<p className="text-sm text-slate-600">
						Capacity band:{" "}
						<span className="font-semibold text-slate-700 tabular-nums">
							{formatCurrency(data.capacityBand)}
						</span>
					</p>
				) : null}
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

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<div className="flex items-center gap-3">
						<DollarSign className="w-5 h-5 text-[#0f5384]" />
						<p className="text-sm font-medium sidebar-gradient-text">
							Staff ask override
						</p>
					</div>
					<p className="text-xs text-slate-600">
						Model ask: {formatCurrency(data.suggestedAsk)}. Overrides require a
						short reason and never drop below the last gift without your note.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label htmlFor="override-amount">Override amount</Label>
							<Input
								id="override-amount"
								type="number"
								min={1}
								value={overrideAmount}
								onChange={(e) => setOverrideAmount(e.target.value)}
								className="border-[0.25px] border-slate-300"
							/>
						</div>
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="override-reason">Reason</Label>
							<Input
								id="override-reason"
								value={overrideReason}
								onChange={(e) => setOverrideReason(e.target.value)}
								className="border-[0.25px] border-slate-300"
								placeholder="Why this ask is appropriate"
							/>
						</div>
					</div>
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={savingOverride}
							onClick={saveOverride}
						>
							<Check className="h-4 w-4" />
							Save override
						</Button>
					</div>
				</CardContent>
			</Card>

			<ConstituentWealthPanel constituentId={constituentId} />
		</div>
	);
}
