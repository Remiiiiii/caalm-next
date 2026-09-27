"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCampaignRoi } from "@/lib/development";

type Props = {
	campaignId: string;
	currency: string;
	postedTotal: number;
	campaignCost?: number;
	roi: number | null;
	canEditCost: boolean;
};

export function CampaignDetailClient({
	campaignId,
	currency,
	postedTotal,
	campaignCost: initialCost,
	roi: initialRoi,
	canEditCost,
}: Props) {
	const [costInput, setCostInput] = useState(
		initialCost != null ? String(initialCost) : "",
	);
	const [campaignCost, setCampaignCost] = useState(initialCost);
	const [roi, setRoi] = useState(initialRoi);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const saveCost = async () => {
		setError(null);
		const parsed = costInput.trim() === "" ? null : Number(costInput);
		if (parsed != null && (Number.isNaN(parsed) || parsed < 0)) {
			setError("Enter a non-negative number or leave blank.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch(`/api/campaigns/${campaignId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					campaignCost: parsed,
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				setError(json.error ?? "Failed to save cost");
				return;
			}
			setCampaignCost(json.campaignCost);
			setRoi(json.roi ?? null);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-4 text-sm text-slate-700">
			<p>
				Posted gift total:{" "}
				<span className="tabular-nums font-medium">
					{currency}{" "}
					{postedTotal.toLocaleString(undefined, {
						minimumFractionDigits: 2,
					})}
				</span>
			</p>
			<p>
				Campaign ROI:{" "}
				<span className="tabular-nums font-medium">{formatCampaignRoi(roi)}</span>
				<span className="text-xs text-slate-600 ml-2">
					(posted − cost) ÷ cost
				</span>
			</p>
			{canEditCost ? (
				<div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md">
					<label className="block text-sm font-medium sidebar-gradient-text">
						Campaign cost
					</label>
					<Input
						type="number"
						min={0}
						step="0.01"
						value={costInput}
						onChange={(e) => setCostInput(e.target.value)}
						className="border-[0.25px] border-slate-300"
						placeholder="0.00"
					/>
					{campaignCost != null ? (
						<p className="text-xs text-slate-600">
							Saved cost: {currency}{" "}
							{campaignCost.toLocaleString(undefined, {
								minimumFractionDigits: 2,
							})}
						</p>
					) : null}
					{error ? <p className="text-xs text-red">{error}</p> : null}
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={saving}
							onClick={() => void saveCost()}
						>
							{saving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Check className="h-4 w-4" />
							)}
							Save cost
						</Button>
					</div>
				</div>
			) : (
				<p className="text-slate-600">
					Campaign cost:{" "}
					{campaignCost != null ? (
						<span className="tabular-nums font-medium">
							{currency}{" "}
							{campaignCost.toLocaleString(undefined, {
								minimumFractionDigits: 2,
							})}
						</span>
					) : (
						"—"
					)}
				</p>
			)}
		</div>
	);
}
