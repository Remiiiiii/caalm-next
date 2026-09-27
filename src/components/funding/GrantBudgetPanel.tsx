"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatUsd } from "@/lib/funding/constants";
import { GRANT_BUDGET_CATEGORIES } from "@/lib/funding/grant-budget.types";
import type { RetentionStream } from "@/lib/funding/types";

type BudgetLine = {
	$id: string;
	category: string;
	amount: number;
	periodStart: string;
	periodEnd: string;
	label?: string;
};

type VsActualLine = {
	lineId: string;
	category: string;
	budgetAmount: number;
	actualAmount: number;
	overBudget: boolean;
};

export function GrantBudgetPanel({
	stream,
}: {
	stream: RetentionStream;
}) {
	const [lines, setLines] = useState<BudgetLine[]>([]);
	const [vsActual, setVsActual] = useState<VsActualLine[]>([]);
	const [category, setCategory] = useState<string>("program");
	const [amount, setAmount] = useState("");
	const [periodStart, setPeriodStart] = useState("");
	const [periodEnd, setPeriodEnd] = useState("");
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		const [linesRes, actualRes] = await Promise.all([
			fetch(
				`/api/funding/grants/${encodeURIComponent(stream.contractId)}/budget-lines`,
			),
			fetch(
				`/api/funding/grants/${encodeURIComponent(stream.contractId)}/budget-vs-actual`,
			),
		]);
		if (linesRes.ok) {
			const json = await linesRes.json();
			setLines(json.items || []);
		}
		if (actualRes.ok) {
			const json = await actualRes.json();
			setVsActual(json.lines || []);
		}
	}, [stream.contractId]);

	useEffect(() => {
		void load();
	}, [load]);

	async function addLine() {
		setSaving(true);
		try {
			const res = await fetch(
				`/api/funding/grants/${encodeURIComponent(stream.contractId)}/budget-lines`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						category,
						amount: Number(amount),
						periodStart,
						periodEnd,
					}),
				},
			);
			if (res.ok) {
				setAmount("");
				await load();
			}
		} finally {
			setSaving(false);
		}
	}

	const actualByLine = new Map(vsActual.map((row) => [row.lineId, row]));

	return (
		<div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
			<p className="text-sm font-medium sidebar-gradient-text">Grant budget</p>
			<ul className="space-y-2 text-sm text-slate-700">
				{lines.map((line) => {
					const actual = actualByLine.get(line.$id);
					const over = actual?.overBudget;
					return (
						<li
							key={line.$id}
							className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2"
						>
							<span className="capitalize">{line.category}</span>
							<span className="tabular-nums">
								Budget {formatUsd(line.amount)} · Actual{" "}
								{formatUsd(actual?.actualAmount ?? 0)}
							</span>
							{over ? (
								<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-red/10 text-red border-red/20">
									Over budget
								</span>
							) : (
								<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-green/10 text-green border-green/20">
									On track
								</span>
							)}
						</li>
					);
				})}
			</ul>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label>Category</Label>
					<Select value={category} onValueChange={setCategory}>
						<SelectTrigger className="border-[0.25px] border-slate-300">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{GRANT_BUDGET_CATEGORIES.map((value) => (
								<SelectItem key={value} value={value}>
									{value}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<Label>Amount</Label>
					<Input
						type="number"
						min={1}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						className="border-[0.25px] border-slate-300"
					/>
				</div>
				<div className="space-y-1">
					<Label>Period start</Label>
					<Input
						type="date"
						value={periodStart}
						onChange={(e) => setPeriodStart(e.target.value)}
						className="border-[0.25px] border-slate-300"
					/>
				</div>
				<div className="space-y-1">
					<Label>Period end</Label>
					<Input
						type="date"
						value={periodEnd}
						onChange={(e) => setPeriodEnd(e.target.value)}
						className="border-[0.25px] border-slate-300"
					/>
				</div>
			</div>
			<div className="flex justify-end">
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4"
					disabled={saving || !amount || !periodStart || !periodEnd}
					onClick={addLine}
				>
					<Plus className="h-4 w-4" />
					Add budget line
				</Button>
			</div>
		</div>
	);
}
