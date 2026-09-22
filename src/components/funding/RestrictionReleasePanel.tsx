"use client";

import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RestrictionRelease } from "@/lib/funding/restriction-release.repository";
import { formatUsd } from "@/lib/funding/constants";
import { contractRequiresFundId } from "@/lib/funding/grant-fund";
import type { RetentionStream } from "@/lib/funding/types";

type Props = {
	stream: RetentionStream;
};

export function RestrictionReleasePanel({ stream }: Props) {
	const [items, setItems] = useState<RestrictionRelease[]>([]);
	const [remaining, setRemaining] = useState<number | null>(null);
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!contractRequiresFundId(stream.contractType)) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/funding/grants/${encodeURIComponent(stream.contractId)}/restriction-releases`,
			);
			if (!res.ok) throw new Error("Could not load releases");
			const json = (await res.json()) as {
				items: RestrictionRelease[];
				remainingRestrictedBalance: number;
			};
			setItems(json.items ?? []);
			setRemaining(json.remainingRestrictedBalance ?? 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Load failed");
		} finally {
			setLoading(false);
		}
	}, [stream.contractId, stream.contractType]);

	useEffect(() => {
		void load();
	}, [load]);

	if (!contractRequiresFundId(stream.contractType)) {
		return null;
	}

	const submit = async () => {
		setSaving(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/funding/grants/${encodeURIComponent(stream.contractId)}/restriction-releases`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						amount: Number(amount),
						note: note.trim() || undefined,
					}),
				},
			);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Release failed");
			}
			setAmount("");
			setNote("");
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Release failed");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
			<p className="text-sm font-medium sidebar-gradient-text">
				Restriction release
			</p>
			<p className="text-xs text-slate-600">
				Record when donor restrictions are met and dollars reclass to unrestricted
				(fund legs export later for your accountant — no GL posting here).
			</p>
			{loading ? (
				<p className="text-sm text-slate-600 flex items-center gap-2">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading…
				</p>
			) : (
				<>
					<p className="text-sm text-slate-700">
						Remaining restricted balance:{" "}
						<span className="font-semibold tabular-nums">
							{formatUsd(remaining ?? 0)}
						</span>
					</p>
					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<Label className="text-xs text-slate-600">Release amount</Label>
							<Input
								type="number"
								min={0}
								step="0.01"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								className="border-[0.25px] border-slate-300"
							/>
						</div>
						<div>
							<Label className="text-xs text-slate-600">Note (optional)</Label>
							<Input
								value={note}
								onChange={(e) => setNote(e.target.value)}
								className="border-[0.25px] border-slate-300"
							/>
						</div>
					</div>
					{error ? <p className="text-sm text-red">{error}</p> : null}
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={saving || !amount}
							onClick={() => void submit()}
						>
							<Check className="h-4 w-4" />
							Record release
						</Button>
					</div>
					{items.length > 0 ? (
						<ul className="text-xs text-slate-600 space-y-1 border-t border-slate-200 pt-3">
							{items.map((item) => (
								<li key={item.$id} className="tabular-nums">
									{formatUsd(item.amount)} on{" "}
									{new Date(item.releasedAt).toLocaleDateString()} (fund{" "}
									{item.fundFrom.slice(0, 8)}… → {item.fundTo.slice(0, 8)}…)
								</li>
							))}
						</ul>
					) : null}
				</>
			)}
		</div>
	);
}
