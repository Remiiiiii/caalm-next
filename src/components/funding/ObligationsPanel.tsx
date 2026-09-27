"use client";

import {
	Bell,
	Check,
	Clock,
	ExternalLink,
	Loader2,
	Plus,
	Tag,
	Trash2,
	User,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	formatRetentionExpiryPhrase,
	formatUsd,
	RETENTION_HEALTH_LABEL,
} from "@/lib/funding/constants";
import {
	formatObligationDueLine,
	OBLIGATION_KIND_LABEL,
	OBLIGATION_STATUS_LABEL,
	obligationStatusBadgeClass,
} from "@/lib/funding/obligation-display";
import {
	type ContractObligation,
	OBLIGATION_KINDS,
	OBLIGATION_STATUSES,
	type ObligationKind,
	type ObligationStatus,
	type RetentionStream,
} from "@/lib/funding/types";
import { parseAllowedHttpUrl } from "@/lib/funding/safe-link-url";
import { cn } from "@/lib/utils";
import { FundingLinkedGifts } from "@/components/funding/FundingLinkedGifts";
import { FunderSnapshotPanel } from "@/components/funding/FunderSnapshotPanel";
import { GrantBudgetPanel } from "@/components/funding/GrantBudgetPanel";
import { GrantFundSelector } from "@/components/funding/GrantFundSelector";
import { RestrictionReleasePanel } from "@/components/funding/RestrictionReleasePanel";
import { contractRequiresFundId } from "@/lib/funding/grant-fund";

/** Statuses a user can pick in the pill dropdown — Done is Mark done only. */
const STATUS_DROPDOWN_OPTIONS: ObligationStatus[] = [
	"open",
	"in_progress",
	"waived",
	"overdue",
];

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

function SectionLabel({ children }: { children: string }) {
	return (
		<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
			{children}
		</p>
	);
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

	const showGrantTools = stream
		? contractRequiresFundId(stream.contractType)
		: false;

	if (!stream) {
		return (
			<div className="glass-card flex h-full flex-col rounded-xl p-4 text-sm text-slate-600 sm:p-6">
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
					reminderDaysBefore: Number.isFinite(reminder) ? reminder : undefined,
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

	async function patchObligation(id: string, body: Record<string, unknown>) {
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
		<div className="glass-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
			<div className="glass-card-cap" />
			<div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 px-4 py-4 mt-4 sm:px-6">
				<h2 className="truncate text-xl font-semibold">
					<span className="sidebar-gradient-text">{stream.contractName}</span>
					{stream.contractNumber ? (
						<span className="ml-2 text-sm font-normal text-slate-500">
							· #{stream.contractNumber}
						</span>
					) : null}
				</h2>
				<p className="mt-1 truncate text-sm text-slate-600">
					{formatUsd(stream.amount, stream.currency)} ·{" "}
					{RETENTION_HEALTH_LABEL[stream.health]} ·{" "}
					{formatRetentionExpiryPhrase(stream.daysUntilExpiry)}
				</p>
			</div>

			<div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
				<FundingLinkedGifts contractId={stream.contractId} />
				{showGrantTools ? (
					<>
						<GrantFundSelector stream={stream} onUpdated={onChanged} />
						<FunderSnapshotPanel stream={stream} />
						<GrantBudgetPanel stream={stream} />
						<RestrictionReleasePanel stream={stream} />
					</>
				) : null}

				<ul className="space-y-2">
					{stream.obligations.length === 0 ? (
						<li className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
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

				<div className="space-y-3">
					<SectionLabel>What needs to happen</SectionLabel>
					<div className="space-y-1.5">
						<Label htmlFor="obligation-title">Title</Label>
						<Input
							id="obligation-title"
							className="border-[0.25px] border-slate-300"
							placeholder="e.g. Confirm renewal owner + evidence"
							value={form.title}
							onChange={(e) => updateField("title", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="obligation-description">
							Description (optional)
						</Label>
						<Textarea
							id="obligation-description"
							placeholder="Description (optional)"
							value={form.description}
							onChange={(e) => updateField("description", e.target.value)}
						/>
					</div>
				</div>

				<div className="space-y-3">
					<SectionLabel>Classification</SectionLabel>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="obligation-kind">Type</Label>
							<Select
								value={form.kind}
								onValueChange={(value) =>
									updateField("kind", value as ObligationKind)
								}
							>
								<SelectTrigger
									id="obligation-kind"
									className="border-[0.25px] border-slate-300"
								>
									<SelectValue placeholder="Type" />
								</SelectTrigger>
								<SelectContent>
									{OBLIGATION_KINDS.map((kind) => (
										<SelectItem key={kind} value={kind}>
											{OBLIGATION_KIND_LABEL[kind]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="obligation-status">Status</Label>
							<Select
								value={form.status}
								onValueChange={(value) =>
									updateField("status", value as ObligationStatus)
								}
							>
								<SelectTrigger
									id="obligation-status"
									className="border-[0.25px] border-slate-300"
								>
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									{OBLIGATION_STATUSES.map((status) => (
										<SelectItem key={status} value={status}>
											{OBLIGATION_STATUS_LABEL[status]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<div className="space-y-3">
					<SectionLabel>Assignment & schedule</SectionLabel>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="obligation-owner">Owner</Label>
							<Input
								id="obligation-owner"
								className="border-[0.25px] border-slate-300"
								placeholder="Owner name"
								value={form.ownerName}
								onChange={(e) => updateField("ownerName", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="obligation-due">Due date</Label>
							<Input
								id="obligation-due"
								type="date"
								className="border-[0.25px] border-slate-300"
								value={form.dueDate}
								onChange={(e) => updateField("dueDate", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="obligation-remind">
								Remind before due (days)
							</Label>
							<Input
								id="obligation-remind"
								type="number"
								min={0}
								className="border-[0.25px] border-slate-300"
								value={form.reminderDaysBefore}
								onChange={(e) =>
									updateField("reminderDaysBefore", e.target.value)
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="obligation-link">Link URL (optional)</Label>
							<Input
								id="obligation-link"
								className="border-[0.25px] border-slate-300"
								placeholder="https://"
								value={form.linkUrl}
								onChange={(e) => updateField("linkUrl", e.target.value)}
							/>
						</div>
					</div>
				</div>

				<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
					<Checkbox
						checked={form.renewalLinked}
						onCheckedChange={(checked) =>
							updateField("renewalLinked", checked === true)
						}
					/>
					Link to renewal / retention checklist
				</label>
			</div>

			<div className="shrink-0 space-y-3 border-t border-slate-200 px-4 py-4 sm:px-6">
				{error ? <p className="text-xs text-red">{error}</p> : null}
				<Button
					className="primary-btn w-full! px-3 sm:px-4"
					disabled={saving || !form.title.trim()}
					onClick={() => void addObligation()}
				>
					{saving ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Plus className="h-4 w-4" />
					)}
					{saving ? "Saving…" : "Add obligation"}
				</Button>
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
	const isDone = obligation.status === "done";
	const dueLine = formatObligationDueLine(obligation.dueDate);
	const safeLinkHref = parseAllowedHttpUrl(obligation.linkUrl);

	return (
		<li className="rounded-lg border border-slate-200 bg-white p-4">
			<div className="flex items-start justify-between gap-3">
				<p className="min-w-0 text-sm font-semibold text-slate-700">
					{obligation.title}
				</p>
				{isDone ? (
					<span
						className={cn(
							"inline-block shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
							obligationStatusBadgeClass("done"),
						)}
					>
						Done
					</span>
				) : (
					<Select
						value={obligation.status}
						onValueChange={(value) => onStatusChange(value as ObligationStatus)}
						disabled={busy}
					>
						<SelectTrigger
							aria-label={`Status for ${obligation.title}`}
							className={cn(
								"h-auto w-auto shrink-0 gap-1 rounded-md border px-2 py-0.5 text-xs font-medium shadow-none",
								"hover:opacity-90 focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								"[&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-slate-500 [&_svg]:opacity-100",
								obligationStatusBadgeClass(obligation.status),
							)}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent align="end">
							{STATUS_DROPDOWN_OPTIONS.map((status) => (
								<SelectItem key={status} value={status}>
									{OBLIGATION_STATUS_LABEL[status]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			{obligation.description ? (
				<p className="mt-1 text-sm text-slate-600">{obligation.description}</p>
			) : null}

			<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-slate-200 py-3 text-xs text-slate-600">
				<div className="flex min-w-0 items-center gap-2">
					<Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
					<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
						{OBLIGATION_KIND_LABEL[obligation.kind]}
					</span>
				</div>
				<div className="flex min-w-0 items-center gap-2">
					<User className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
					<span className="truncate">
						{obligation.ownerName?.trim() || "Unassigned"}
					</span>
				</div>
				<div className="flex min-w-0 items-center gap-2 text-slate-600">
					<Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
					<span className="truncate">{dueLine || "No due date"}</span>
				</div>
				<div className="flex min-w-0 items-center gap-2">
					<Bell className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
					<span className="truncate">
						{obligation.reminderDaysBefore != null
							? `Reminds ${obligation.reminderDaysBefore}d before`
							: "No reminder"}
					</span>
				</div>
			</div>

			<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
				{safeLinkHref ? (
					<a
						href={safeLinkHref}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 text-sm text-[#0f5384] hover:underline"
					>
						<ExternalLink className="h-3.5 w-3.5" aria-hidden />
						Open link
					</a>
				) : (
					<span />
				)}
				<div className="ml-auto flex flex-wrap items-center justify-end gap-2">
					{!isDone ? (
						<Button
							className="primary-btn px-3 sm:px-4"
							disabled={busy}
							onClick={onMarkDone}
						>
							<Check className="h-4 w-4" />
							Mark done
						</Button>
					) : null}
					<Button
						variant="outline"
						className="delete-btn px-3 sm:px-4"
						disabled={busy}
						onClick={onDelete}
						aria-label={`Delete ${obligation.title}`}
					>
						<Trash2 className="h-4 w-4" />
						Delete
					</Button>
				</div>
			</div>
		</li>
	);
}
