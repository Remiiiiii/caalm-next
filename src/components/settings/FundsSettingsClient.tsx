"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FinanceScopeHelp } from "@/components/funding/FinanceScopeHelp";
import {
	NET_ASSET_CLASSES,
	netAssetClassLabel,
	type NetAssetClass,
	type OrgFund,
} from "@/lib/funds";

export function FundsSettingsClient() {
	const [items, setItems] = useState<OrgFund[]>([]);
	const [loading, setLoading] = useState(true);
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [netAssetClass, setNetAssetClass] =
		useState<NetAssetClass>("unrestricted");
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/funds");
			const json = await res.json();
			if (res.ok) setItems(json.items || []);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	async function addFund() {
		setSaving(true);
		try {
			const res = await fetch("/api/funds", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code, name, netAssetClass }),
			});
			if (res.ok) {
				setCode("");
				setName("");
				await load();
			}
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<FinanceScopeHelp />
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<p className="text-sm font-medium sidebar-gradient-text">Org funds</p>
					{loading ? (
						<p className="text-sm text-slate-600">Loading funds…</p>
					) : (
						<ul className="space-y-2 text-sm text-slate-700">
							{items.map((fund) => (
								<li
									key={fund.$id}
									className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2"
								>
									<span className="font-medium">{fund.name}</span>
									<span className="tabular-nums text-slate-600">{fund.code}</span>
									<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-blue/10 text-blue border-blue/20">
										{netAssetClassLabel(fund.netAssetClass)}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<p className="text-sm font-medium sidebar-gradient-text">Add fund</p>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-1">
							<Label htmlFor="fund-code">Code</Label>
							<Input
								id="fund-code"
								value={code}
								onChange={(e) => setCode(e.target.value)}
								className="border-[0.25px] border-slate-300"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="fund-name">Name</Label>
							<Input
								id="fund-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="border-[0.25px] border-slate-300"
							/>
						</div>
						<div className="space-y-1">
							<Label>Net asset class</Label>
							<Select
								value={netAssetClass}
								onValueChange={(v) => setNetAssetClass(v as NetAssetClass)}
							>
								<SelectTrigger className="border-[0.25px] border-slate-300">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{NET_ASSET_CLASSES.map((value) => (
										<SelectItem key={value} value={value}>
											{netAssetClassLabel(value)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={saving || !code.trim() || !name.trim()}
							onClick={addFund}
						>
							<Plus className="h-4 w-4" />
							Add fund
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
