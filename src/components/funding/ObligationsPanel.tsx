"use client";

import { Check, Link2, Plus, Trash2 } from "lucide-react";
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
import {
	type ContractObligation,
	OBLIGATION_KINDS,
	OBLIGATION_STATUSES,
	type ObligationKind,
	type ObligationStatus,
	type RetentionStream,
} from "@/lib/funding/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ObligationKind, string> = {
	renewal: "Renewal",
	reporting: "Reporting",
	deliverable: "Deliverable",
	compliance: "Compliance",
	payment: "Payment",
	other: "Other",
};

const STATUS_LABEL: Record<ObligationStatus, string> = {
	open: "Open",
	in_progress: "In progress",
	done: "Done",
	waived: "Waived",
	overdue: "Overdue",
};

const emptyForm = {
	title: "",
	description: "",
	kind: "renewal" as ObligationKind,
	status: "open" as ObligationStatus,
	ownerName: "",
	dueDate: "",
	reminderDaysBefore: "7",
	linkUrl: "",
	renewalLinked: true,
};

function statusBadgeClass(status: ObligationStatus): string {
	if (status === "done") {
		return "bg-green/10 text-green border-green/20";
	}
	if (status === "overdue") {
		return "bg-red/10 text-red border-red/20";
	}
	if (status === "in_progress") {
		return "bg-blue/10 text-blue border-blue/20";
	}
	if (status === "waived") {
		return "bg-slate-100 text-slate-600 border-slate-200";
	}
	return "bg-orange/10 text-orange border-orange/20";
}

export function ObligationsPanel({
	stream,
	onChanged,
}: {
	stream: RetentionStream | null;
	onChanged: () => void;
}) {
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
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

	function updateField<K extends keyof typeof emptyForm>(
		key: K,
		value: (typeof emptyForm)[K],
	) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	async function addObligation() {
		const selected = stream;
		if (!selected || !form.title.trim()) return;
		setSaving(true);
		setError(null);
		try {
			const reminder = Number(form.reminderDaysBefore);
			const res = await fetch("/api/funding/obligations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contractId: selected.contractId,
					contractName: selected.contractName,
					title: form.title.trim(),
					description: form.description.trim() || undefined,
					kind: form.kind,
					status: form.status,
					ownerName: form.ownerName.trim() || undefined,
					dueDate: form.dueDate || undefined,
					reminderDaysBefore: Number.isFinite(reminder)
						? reminder
						: undefined,
					linkUrl: form.linkUrl.trim() || undefined,
					renewalLinked: form.renewalLinked,
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Could not add obligation");
			}
			setForm(emptyForm);
			onChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	async function patchObligation(
		id: string,
		body: Record<string, unknown>,
	) {
		setBusyId(id);
		setError(null);
		try {
			const res = await fetch(`/api/funding/obligations/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Could not update obligation");
			}
			onChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update");
		} finally {
			setBusyId(null);
		}
	}

	async function removeObligation(id: string) {
		setBusyId(id);
		setError(null);
		try {
			const res = await fetch(`/api/funding/obligations/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Could not delete obligation");
			}
			onChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<div className="glass-card rounded-xl">
			<div className="glass-card-cap" />
			<div className="border-b border-slate-200 px-4 py-3 sm:px-6">
				<h2 className="text-xl font-semibold sidebar-gradient-text">
					Obligations
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Structured work that keeps{" "}
					<span className="font-medium text-slate-700">
						{stream.contractName}
					</span>{" "}
					funded — owner, due date, status, link, and reminders.
				</p>
			</div>
			<div className="space-y-4 p-4 sm:p-6">
				<ul className="space-y-2">
					{stream.obligations.length === 0 ? (
						<li className="text-sm text-slate-500">
							No obligations yet. Add a checklist item with an owner and due
							date to start protecting this stream.
						</li>
					) : (
						stream.obligations.map((ob) => (
							<ObligationRow
								key={ob.$id}
								obligation={ob}
								busy={busyId === ob.$id}
								onStatusChange={(status) =>
									void patchObligation(ob.$id, { status })
								}
								onMarkDone={() =>
									void patchObligation(ob.$id, { status: "done" })
								}
								onDelete={() => void removeObligation(ob.$id)}
							/>
						))
					)}
				</ul>

				<div className="space-y-3 border-t border-slate-200 pt-4">
					<p className="text-sm font-medium text-slate-700">Add obligation</p>
					<Input
						className="border-[0.25px] border-slate-300"
						placeholder="Title — e.g. Confirm renewal owner + evidence plan"
						value={form.title}
						onChange={(e) => updateField("title", e.target.value)}
					/>
					<textarea
						className="min-h-18 w-full rounded-md border-[0.25px] border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-[#078FAB] focus-visible:outline-none"
						placeholder="Description (optional)"
						value={form.description}
						onChange={(e) => updateField("description", e.target.value)}
					/>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						<Select
							value={form.kind}
							onValueChange={(value) =>
								updateField("kind", value as ObligationKind)
							}
						>
							<SelectTrigger className="border-[0.25px] border-slate-300">
								<SelectValue placeholder="Kind" />
							</SelectTrigger>
							<SelectContent>
								{OBLIGATION_KINDS.map((kind) => (
									<SelectItem key={kind} value={kind}>
										{KIND_LABEL[kind]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={form.status}
							onValueChange={(value) =>
								updateField("status", value as ObligationStatus)
							}
						>
							<SelectTrigger className="border-[0.25px] border-slate-300">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								{OBLIGATION_STATUSES.map((status) => (
									<SelectItem key={status} value={status}>
										{STATUS_LABEL[status]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							className="border-[0.25px] border-slate-300"
							placeholder="Owner name"
							value={form.ownerName}
							onChange={(e) => updateField("ownerName", e.target.value)}
						/>
						<Input
							type="date"
							className="border-[0.25px] border-slate-300"
							value={form.dueDate}
							onChange={(e) => updateField("dueDate", e.target.value)}
						/>
						<Input
							type="number"
							min={0}
							className="border-[0.25px] border-slate-300"
							placeholder="Remind N days before due"
							value={form.reminderDaysBefore}
							onChange={(e) =>
								updateField("reminderDaysBefore", e.target.value)
							}
						/>
						<Input
							className="border-[0.25px] border-slate-300"
							placeholder="Link URL (optional)"
							value={form.linkUrl}
							onChange={(e) => updateField("linkUrl", e.target.value)}
						/>
					</div>
					<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
						<input
							type="checkbox"
							className="h-4 w-4 rounded border-slate-300"
							checked={form.renewalLinked}
							onChange={(e) => updateField("renewalLinked", e.target.checked)}
						/>
						Link to renewal / retention checklist
					</label>
					{error ? <p className="text-xs text-red">{error}</p> : null}
					<Button
						className="primary-btn px-3 sm:px-4"
						disabled={saving || !form.title.trim()}
						onClick={() => void addObligation()}
					>
						<Plus className="h-4 w-4" />
						{saving ? "Saving…" : "Add obligation"}
					</Button>
				</div>
			</div>
		</div>
	);
}

function ObligationRow({
	obligation,
	busy,
	onStatusChange,
	onMarkDone,
	onDelete,
}: {
	obligation: ContractObligation;
	busy: boolean;
	onStatusChange: (status: ObligationStatus) => void;
	onMarkDone: () => void;
	onDelete: () => void;
}) {
	const closed =
		obligation.status === "done" || obligation.status === "waived";

	return (
		<li className="rounded-lg border border-slate-200 bg-white p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-sm font-medium text-slate-700">
							{obligation.title}
						</p>
						<span
							className={cn(
								"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
								statusBadgeClass(obligation.status),
							)}
						>
							{STATUS_LABEL[obligation.status]}
						</span>
					</div>
					{obligation.description ? (
						<p className="text-xs text-slate-600">{obligation.description}</p>
					) : null}
					<p className="text-xs text-slate-500">
						{KIND_LABEL[obligation.kind]}
						{obligation.ownerName ? ` · ${obligation.ownerName}` : ""}
						{obligation.dueDate
							? ` · due ${obligation.dueDate.slice(0, 10)}`
							: ""}
						{obligation.reminderDaysBefore != null
							? ` · remind ${obligation.reminderDaysBefore}d before`
							: ""}
						{obligation.renewalLinked ? " · renewal-linked" : ""}
					</p>
					{obligation.linkUrl ? (
						<a
							href={obligation.linkUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1 text-xs text-[#0f5384] hover:underline"
						>
							<Link2 className="h-3 w-3" />
							Open link
						</a>
					) : null}
				</div>
				<div className="flex shrink-0 flex-col items-end gap-2">
					{!closed ? (
						<Button
							className="primary-btn px-3"
							disabled={busy}
							onClick={onMarkDone}
						>
							<Check className="h-4 w-4" />
							Done
						</Button>
					) : null}
					<Button
						variant="outline"
						className="delete-btn px-3"
						disabled={busy}
						onClick={onDelete}
						aria-label={`Delete ${obligation.title}`}
					>
						<Trash2 className="h-4 w-4" />
						Delete
					</Button>
				</div>
			</div>
			{!closed ? (
				<div className="mt-3 max-w-xs">
					<Select
						value={obligation.status}
						onValueChange={(value) =>
							onStatusChange(value as ObligationStatus)
						}
						disabled={busy}
					>
						<SelectTrigger className="h-9 border-[0.25px] border-slate-300">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							{OBLIGATION_STATUSES.map((status) => (
								<SelectItem key={status} value={status}>
									{STATUS_LABEL[status]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : null}
		</li>
	);
}
