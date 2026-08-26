"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RetentionStream } from "@/lib/funding/types";

export function ObligationsPanel({
	stream,
	onChanged,
}: {
	stream: RetentionStream | null;
	onChanged: () => void;
}) {
	const [title, setTitle] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!stream) {
		return (
			<div className="glass-card rounded-xl p-4 text-sm text-slate-600 sm:p-6">
				<div className="glass-card-cap" />
				Select a funding stream to see and add obligations (renewal checklist,
				reporting, deliverables).
			</div>
		);
	}

	async function addObligation() {
		if (!stream || !title.trim()) return;
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/funding/obligations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contractId: stream.contractId,
					contractName: stream.contractName,
					title: title.trim(),
					kind: "renewal",
					renewalLinked: true,
					dueDate: dueDate || undefined,
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Could not add obligation");
			}
			setTitle("");
			setDueDate("");
			onChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	async function markDone(id: string) {
		await fetch(`/api/funding/obligations/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "done" }),
		});
		onChanged();
	}

	return (
		<div className="glass-card rounded-xl">
			<div className="glass-card-cap" />
			<div className="border-b border-slate-200 px-4 py-3 sm:px-6">
				<h2 className="text-xl font-semibold sidebar-gradient-text">
					Obligations
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Work that keeps{" "}
					<span className="font-medium text-slate-700">
						{stream.contractName}
					</span>{" "}
					funded.
				</p>
			</div>
			<div className="space-y-4 p-4 sm:p-6">
				<ul className="space-y-2">
					{stream.obligations.length === 0 ? (
						<li className="text-sm text-slate-500">
							No obligations yet. Add a renewal checklist item to start
							protecting this stream.
						</li>
					) : (
						stream.obligations.map((ob) => (
							<li
								key={ob.$id}
								className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
							>
								<div className="min-w-0">
									<p className="text-sm font-medium text-slate-700">
										{ob.title}
									</p>
									<p className="text-xs text-slate-500">
										{ob.kind} · {ob.status}
										{ob.dueDate ? ` · due ${ob.dueDate.slice(0, 10)}` : ""}
									</p>
								</div>
								{ob.status !== "done" && ob.status !== "waived" ? (
									<Button
										variant="outline"
										className="primary-btn shrink-0 px-3"
										onClick={() => void markDone(ob.$id)}
									>
										Done
									</Button>
								) : null}
							</li>
						))
					)}
				</ul>

				<div className="space-y-2 border-t border-slate-200 pt-4">
					<p className="text-sm font-medium text-slate-700">Add obligation</p>
					<Input
						className="border border-slate-300"
						placeholder="e.g. Confirm renewal owner + evidence plan"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
					<Input
						type="date"
						className="border border-slate-300"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
					/>
					{error ? <p className="text-xs text-red">{error}</p> : null}
					<Button
						className="primary-btn px-3 sm:px-4"
						disabled={saving || !title.trim()}
						onClick={() => void addObligation()}
					>
						{saving ? "Saving…" : "Add to checklist"}
					</Button>
				</div>
			</div>
		</div>
	);
}
