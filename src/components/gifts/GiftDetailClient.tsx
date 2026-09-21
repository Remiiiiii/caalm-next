"use client";

import { Ban, Check, Gift } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { type Gift as GiftRow, giftStatusBadgeClass } from "@/lib/gifts";

export function GiftDetailClient({ giftId }: { giftId: string }) {
	const { permissions } = usePermissions();
	const canCreate = permissions.includes(PERMISSIONS.GIFTS.CREATE);
	const canVoid = permissions.includes(PERMISSIONS.GIFTS.VOID);
	const [gift, setGift] = useState<GiftRow | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/gifts/${giftId}`);
			const data = await res.json();
			setGift(res.ok ? data : null);
		} finally {
			setLoading(false);
		}
	}, [giftId]);

	useEffect(() => {
		void load();
	}, [load]);

	const postGift = async () => {
		setBusy(true);
		try {
			const res = await fetch(`/api/gifts/${giftId}/post`, { method: "POST" });
			if (res.ok) await load();
		} finally {
			setBusy(false);
		}
	};

	const voidGift = async () => {
		setBusy(true);
		try {
			const res = await fetch(`/api/gifts/${giftId}/void`, { method: "POST" });
			if (res.ok) await load();
		} finally {
			setBusy(false);
		}
	};

	if (loading) {
		return <p className="text-sm text-slate-600 px-4">Loading gift…</p>;
	}
	if (!gift) {
		return (
			<p className="text-sm text-slate-600 px-4">
				Gift not found.{" "}
				<Link href="/gifts" className="text-[#0f5384] hover:underline">
					Back to gifts
				</Link>
			</p>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4">
				<h1 className="h1 capitalize sidebar-gradient-text">Gift detail</h1>
			</div>
			<div className="mb-6 flex items-center justify-end gap-3">
				{gift.status === "draft" && canCreate ? (
					<Button
						className="primary-btn px-3 sm:px-4"
						disabled={busy}
						onClick={() => void postGift()}
					>
						<Check className="h-4 w-4" />
						Post gift
					</Button>
				) : null}
				{gift.status === "posted" && canVoid && !gift.voidOfId ? (
					<Button
						className="delete-btn px-3 sm:px-4"
						disabled={busy}
						onClick={() => void voidGift()}
					>
						<Ban className="h-4 w-4" />
						Void
					</Button>
				) : null}
			</div>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<div className="flex items-center gap-2">
						<Gift className="h-5 w-5 text-[#0f5384]" />
						<span
							className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border capitalize ${giftStatusBadgeClass(gift.status)}`}
						>
							{gift.status}
						</span>
					</div>
					<dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<dt className="text-slate-500">Receipt #</dt>
							<dd className="text-slate-700 tabular-nums">
								{gift.receiptNumber ?? "Not posted"}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Amount</dt>
							<dd className="text-slate-700 tabular-nums">
								{gift.currency}{" "}
								{gift.amount.toLocaleString(undefined, {
									minimumFractionDigits: 2,
								})}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Gift date</dt>
							<dd className="text-slate-700">{gift.giftDate.slice(0, 10)}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Method</dt>
							<dd className="text-slate-700 capitalize">{gift.method}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Donor</dt>
							<dd className="text-slate-700">
								{gift.anonymous ? (
									"Anonymous"
								) : (
									<Link
										href={`/constituents/${gift.constituentId}`}
										className="text-[#0f5384] hover:underline"
									>
										View constituent
									</Link>
								)}
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
		</div>
	);
}
