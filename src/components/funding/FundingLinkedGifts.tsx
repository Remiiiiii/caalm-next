"use client";

import { Gift } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUsd } from "@/lib/funding/constants";

type LinkedGift = {
	$id: string;
	amount: number;
	currency: string;
	giftDate: string;
	receiptNumber?: number;
	designationLabel?: string;
};

export function FundingLinkedGifts({ contractId }: { contractId: string }) {
	const [items, setItems] = useState<LinkedGift[]>([]);
	const [cashTotal, setCashTotal] = useState(0);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/funding/streams/${encodeURIComponent(contractId)}/gifts`,
				);
				const data = await res.json();
				if (!cancelled && res.ok) {
					setItems(data.items ?? []);
					setCashTotal(Number(data.cashTotal ?? 0));
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [contractId]);

	return (
		<div className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
				Linked gift cash
			</p>
			{loading ? (
				<p className="text-sm text-slate-600">Loading linked gifts…</p>
			) : items.length === 0 ? (
				<p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
					No posted gifts linked to this grant yet.
				</p>
			) : (
				<>
					<p className="text-sm font-medium text-slate-700">
						Cash received: {formatUsd(cashTotal, items[0]?.currency || "USD")}
					</p>
					<ul className="space-y-2">
						{items.map((gift) => (
							<li key={gift.$id}>
								<Link
									href={`/gifts/${gift.$id}`}
									className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
								>
									<span className="flex items-center gap-2 text-slate-700">
										<Gift className="h-4 w-4 text-[#0f5384]" />
										{gift.designationLabel || "Gift"}
										{gift.receiptNumber != null ? (
											<span className="text-slate-500 tabular-nums">
												#{gift.receiptNumber}
											</span>
										) : null}
									</span>
									<span className="tabular-nums text-slate-700">
										{formatUsd(gift.amount, gift.currency)}
									</span>
								</Link>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
