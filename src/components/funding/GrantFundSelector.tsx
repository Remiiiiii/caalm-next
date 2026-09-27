"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { contractRequiresFundId } from "@/lib/funding/grant-fund";
import type { OrgFund } from "@/lib/funds";
import type { RetentionStream } from "@/lib/funding/types";

export function GrantFundSelector({
	stream,
	onUpdated,
}: {
	stream: RetentionStream;
	onUpdated: () => void;
}) {
	const [funds, setFunds] = useState<OrgFund[]>([]);
	const [fundId, setFundId] = useState(stream.fundId || "");
	const [saving, setSaving] = useState(false);
	const requiresFund = contractRequiresFundId(stream.contractType);

	useEffect(() => {
		setFundId(stream.fundId || "");
	}, [stream.fundId]);

	useEffect(() => {
		if (!requiresFund) return;
		void (async () => {
			const res = await fetch("/api/funds");
			const json = await res.json();
			if (res.ok) setFunds(json.items || []);
		})();
	}, [requiresFund]);

	if (!requiresFund) return null;

	async function save() {
		setSaving(true);
		try {
			const res = await fetch(
				`/api/funding/contracts/${encodeURIComponent(stream.contractId)}/fund`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ fundId }),
				},
			);
			if (res.ok) onUpdated();
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Label className="text-sm font-medium text-slate-700">Grant fund</Label>
				{stream.missingFund ? (
					<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-orange/10 text-orange border-orange/20">
						Missing fund
					</span>
				) : null}
			</div>
			<Select value={fundId} onValueChange={setFundId}>
				<SelectTrigger className="border-[0.25px] border-slate-300">
					<SelectValue placeholder="Select fund" />
				</SelectTrigger>
				<SelectContent>
					{funds.map((fund) => (
						<SelectItem key={fund.$id} value={fund.$id}>
							{fund.name} ({fund.code})
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="flex justify-end">
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4"
					disabled={saving || !fundId}
					onClick={save}
				>
					<Check className="h-4 w-4" />
					Save fund
				</Button>
			</div>
		</div>
	);
}
