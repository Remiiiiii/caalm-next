"use client";

import { Megaphone, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";

type CampaignRow = {
	$id: string;
	name: string;
	goalAmount?: number;
	currency: string;
	postedTotal?: number;
};

export function CampaignsPageClient() {
	const { permissions } = usePermissions();
	const canCreate = permissions.includes(PERMISSIONS.GIFTS.CREATE);
	const [items, setItems] = useState<CampaignRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [name, setName] = useState("");
	const [goal, setGoal] = useState("");
	const [creating, setCreating] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/campaigns");
			const data = await res.json();
			setItems(res.ok ? data.items || [] : []);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const createCampaign = async () => {
		if (!name.trim()) return;
		setCreating(true);
		try {
			const res = await fetch("/api/campaigns", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					goalAmount: goal ? Number(goal) : undefined,
				}),
			});
			if (res.ok) {
				setName("");
				setGoal("");
				await load();
			}
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4">
				<h1 className="h1 capitalize sidebar-gradient-text">Campaigns</h1>
			</div>
			{canCreate ? (
				<Card className="glass-card mb-6">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 flex flex-wrap items-end gap-3">
						<label className="text-sm text-slate-600 flex-1 min-w-[200px]">
							Name
							<Input
								className="mt-1 border-[0.25px] border-slate-300"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</label>
						<label className="text-sm text-slate-600 w-40">
							Goal
							<Input
								className="mt-1 border-[0.25px] border-slate-300"
								type="number"
								value={goal}
								onChange={(e) => setGoal(e.target.value)}
							/>
						</label>
						<div className="ml-auto flex justify-end">
							<Button
								className="primary-btn px-3 sm:px-4"
								disabled={creating}
								onClick={() => void createCampaign()}
							>
								<Plus className="h-4 w-4" />
								Add campaign
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					{loading ? (
						<p className="text-sm text-slate-600">Loading campaigns…</p>
					) : items.length === 0 ? (
						<p className="text-sm text-slate-600">No campaigns yet.</p>
					) : (
						<ul className="space-y-3">
							{items.map((c) => (
								<li
									key={c.$id}
									className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
								>
									<div className="flex items-center gap-3">
										<Megaphone className="h-5 w-5 text-[#0f5384]" />
										<div>
											<p className="font-medium text-slate-700">{c.name}</p>
											<p className="text-xs text-slate-600 tabular-nums">
												Posted total: {c.currency}{" "}
												{(c.postedTotal ?? 0).toLocaleString(undefined, {
													minimumFractionDigits: 2,
												})}
												{c.goalAmount != null
													? ` / goal ${c.goalAmount.toLocaleString()}`
													: ""}
											</p>
										</div>
									</div>
									<Link
										href={`/campaigns/${c.$id}`}
										className="text-sm text-[#0f5384] hover:underline"
									>
										View
									</Link>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
