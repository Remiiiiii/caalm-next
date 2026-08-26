"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatUsd } from "@/lib/funding/constants";
import {
	PURSUIT_STAGES,
	type FundingPursuit,
	type PursuitStage,
} from "@/lib/funding/types";

const STAGE_LABEL: Record<PursuitStage, string> = {
	watching: "Watching",
	qualifying: "Qualifying",
	pursuing: "Pursuing",
	submitted: "Submitted",
	won: "Won",
	lost: "Lost",
	abandoned: "Abandoned",
};

export function PursuitsBoard({
	loading,
	pursuits,
	onChanged,
}: {
	loading: boolean;
	pursuits: FundingPursuit[];
	onChanged: () => void;
}) {
	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	async function createManual() {
		const parsed = Number(amount.replace(/[$,]/g, ""));
		if (!title.trim() || !Number.isFinite(parsed)) return;
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/funding/pursuits", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: title.trim(),
					amount: parsed,
					source: "manual",
					stage: "watching",
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Could not create pursuit");
			}
			setTitle("");
			setAmount("");
			onChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed");
		} finally {
			setSaving(false);
		}
	}

	async function setStage(id: string, stage: PursuitStage) {
		setBusyId(id);
		await fetch(`/api/funding/pursuits/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ stage }),
		});
		setBusyId(null);
		onChanged();
	}

	async function convertToProposal(id: string) {
		setBusyId(id);
		setError(null);
		try {
			const res = await fetch(`/api/funding/pursuits/${id}/convert`, {
				method: "POST",
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || "Convert failed");
			onChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Convert failed");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<div className="space-y-6">
			<div className="glass-card rounded-xl">
				<div className="glass-card-cap" />
				<div className="border-b border-slate-200 px-4 py-3 sm:px-6">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Add pursuit
					</h2>
					<p className="mt-1 text-sm text-slate-600">
						Manual lead, or save from Advanced Resources (SAM.gov). Won pursuits
						spawn a draft in Proposals & Approvals.
					</p>
				</div>
				<div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-6">
					<Input
						className="border border-slate-300 sm:col-span-2"
						placeholder="Opportunity title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
					<Input
						className="border border-slate-300"
						placeholder="Amount (USD)"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
					<div className="sm:col-span-3">
						{error ? <p className="mb-2 text-xs text-red">{error}</p> : null}
						<Button
							className="primary-btn px-3 sm:px-4"
							disabled={saving}
							onClick={() => void createManual()}
						>
							{saving ? "Saving…" : "Create pursuit"}
						</Button>
					</div>
				</div>
			</div>

			<div className="glass-card overflow-hidden rounded-xl">
				<div className="glass-card-cap" />
				<div className="border-b border-slate-200 px-4 py-3 sm:px-6">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Pursuit pipeline
					</h2>
				</div>
				{loading ? (
					<p className="p-4 text-sm text-slate-600 sm:p-6">Loading pursuits…</p>
				) : pursuits.length === 0 ? (
					<p className="p-4 text-sm text-slate-600 sm:p-6">
						No pursuits yet. Create one above or save a SAM.gov opportunity from
						Advanced Resources.
					</p>
				) : (
					<ul className="divide-y divide-slate-200">
						{pursuits.map((p) => (
							<li
								key={p.$id}
								className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
							>
								<div className="min-w-0">
									<p className="truncate font-medium text-slate-700">
										{p.title}
									</p>
									<p className="mt-1 text-xs text-slate-500">
										{p.source === "sam_gov" ? "SAM.gov" : "Manual"}
										{p.samNoticeId ? ` · ${p.samNoticeId}` : ""}
										{p.linkedProposalId
											? ` · linked proposal ${p.linkedProposalId.slice(0, 8)}…`
											: ""}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-3">
									<p className="text-lg font-semibold tabular-nums text-slate-700">
										{formatUsd(p.amount, p.currency)}
									</p>
									<Select
										value={p.stage}
										onValueChange={(v) =>
											void setStage(p.$id, v as PursuitStage)
										}
										disabled={busyId === p.$id}
									>
										<SelectTrigger className="w-[150px] border border-slate-300">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{PURSUIT_STAGES.map((stage) => (
												<SelectItem key={stage} value={stage}>
													{STAGE_LABEL[stage]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button
										className="primary-btn px-3 sm:px-4"
										variant="outline"
										disabled={busyId === p.$id}
										onClick={() => {
											void (async () => {
												if (p.stage !== "won") {
													await setStage(p.$id, "won");
												}
												await convertToProposal(p.$id);
											})();
										}}
									>
										{p.linkedProposalId ? "Linked" : "Mark won → proposal"}
									</Button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
