"use client";

import { Clock, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type { ApprovalSlaPolicy } from "@/lib/approvals/ApprovalSlaService";

const STEP_LABELS: Record<string, string> = {
	department_review: "Department review",
	internal_approval: "Internal approval",
	executive_approval: "Executive approval",
	awaiting_executive: "Awaiting executive",
};

const emptyDraft = {
	entityType: "both" as const,
	stepKind: "department_review" as const,
	durationHours: 120,
	atRiskPercent: 50,
	dueSoonHours: 24,
	repeatEscalationHours: 48,
	escalateToRoleNames: "Department Manager, Organization Admin",
	channels: "in_app, email",
	isActive: true,
};

export function ApprovalSlaPoliciesManager({
	canEdit,
}: {
	canEdit: boolean;
}) {
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const [policies, setPolicies] = useState<ApprovalSlaPolicy[]>([]);
	const [loading, setLoading] = useState(true);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [draft, setDraft] = useState(emptyDraft);

	const load = useCallback(async () => {
		if (!orgId) return;
		setLoading(true);
		try {
			const res = await fetch(
				`/api/approvals/sla-policies?orgId=${encodeURIComponent(orgId)}`,
			);
			const json = await res.json();
			setPolicies(Array.isArray(json.policies) ? json.policies : []);
		} catch {
			setPolicies([]);
		} finally {
			setLoading(false);
		}
	}, [orgId]);

	useEffect(() => {
		void load();
	}, [load]);

	const openCreate = () => {
		setEditingId(null);
		setDraft(emptyDraft);
		setDialogOpen(true);
	};

	const openEdit = (policy: ApprovalSlaPolicy) => {
		setEditingId(policy.$id);
		setDraft({
			entityType: policy.entityType as typeof emptyDraft.entityType,
			stepKind: policy.stepKind as typeof emptyDraft.stepKind,
			durationHours: policy.durationHours,
			atRiskPercent: policy.atRiskPercent,
			dueSoonHours: policy.dueSoonHours,
			repeatEscalationHours: policy.repeatEscalationHours,
			escalateToRoleNames: policy.escalateToRoleNames.join(", "),
			channels: policy.channels.join(", "),
			isActive: policy.isActive,
		});
		setDialogOpen(true);
	};

	const save = async () => {
		if (!orgId) return;
		setSaving(true);
		try {
			const payload = {
				entityType: draft.entityType,
				stepKind: draft.stepKind,
				durationHours: draft.durationHours,
				atRiskPercent: draft.atRiskPercent,
				dueSoonHours: draft.dueSoonHours,
				repeatEscalationHours: draft.repeatEscalationHours,
				escalateToRoleNames: draft.escalateToRoleNames
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
				channels: draft.channels
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
				isActive: draft.isActive,
			};
			const url = editingId
				? `/api/approvals/sla-policies/${editingId}`
				: `/api/approvals/sla-policies?orgId=${encodeURIComponent(orgId)}`;
			const res = await fetch(url, {
				method: editingId ? "PATCH" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Save failed");
			toast({ title: editingId ? "Policy updated" : "Policy created" });
			setDialogOpen(false);
			await load();
		} catch {
			toast({
				title: "Could not save policy",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const remove = async (id: string) => {
		const res = await fetch(`/api/approvals/sla-policies/${id}`, {
			method: "DELETE",
		});
		if (!res.ok) {
			toast({ title: "Could not delete policy", variant: "destructive" });
			return;
		}
		toast({ title: "Policy deleted" });
		await load();
	};

	return (
		<GlassCard className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="space-y-4 bg-slate-50 p-4 sm:p-6">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-sm font-medium text-slate-700">
							Approval time limits
						</p>
						<p className="mt-1 text-xs text-slate-500">
							Set how long each review step may take before reminders and
							escalation. Missing a deadline does not auto-approve.
						</p>
					</div>
					{canEdit ? (
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							onClick={openCreate}
						>
							<Plus className="h-4 w-4" />
							Add policy
						</Button>
					) : null}
				</div>

				{loading ? (
					<p className="text-sm text-slate-500">Loading policies…</p>
				) : policies.length === 0 ? (
					<p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
						No custom policies yet. Defaults are 5 days for department review
						and 3 days for executive approval.
					</p>
				) : (
					<ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
						{policies.map((policy) => (
							<li
								key={policy.$id}
								className="flex items-center justify-between gap-3 px-4 py-3"
							>
								<div className="min-w-0">
									<p className="text-sm font-medium text-slate-700">
										{STEP_LABELS[policy.stepKind] || policy.stepKind}
										<span className="ml-2 inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
											{policy.entityType}
										</span>
									</p>
									<p className="mt-0.5 text-xs text-slate-500">
										{policy.durationHours}h window · at risk at{" "}
										{policy.atRiskPercent}% ·{" "}
										{policy.isActive ? "Active" : "Inactive"}
									</p>
								</div>
								{canEdit ? (
									<div className="flex shrink-0 gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="cursor-pointer"
											onClick={() => openEdit(policy)}
										>
											<Pencil className="h-3.5 w-3.5" />
											Edit
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="cursor-pointer text-red border-red/30"
											onClick={() => void remove(policy.$id)}
										>
											<Trash2 className="h-3.5 w-3.5" />
											Delete
										</Button>
									</div>
								) : null}
							</li>
						))}
					</ul>
				)}
			</CardContent>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<Clock className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								{editingId ? "Edit SLA policy" : "Add SLA policy"}
							</DialogTitle>
						</div>
						<p className="mt-1 ml-14 text-sm text-slate-600">
							Time limits apply when a step becomes current.
						</p>
					</div>
					<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>Applies to</Label>
								<Select
									value={draft.entityType}
									onValueChange={(value) =>
										setDraft((d) => ({
											...d,
											entityType: value as typeof d.entityType,
										}))
									}
								>
									<SelectTrigger className="border-[0.25px] border-slate-300 bg-white">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="both">Contracts and licenses</SelectItem>
										<SelectItem value="contract">Contracts only</SelectItem>
										<SelectItem value="license">Licenses only</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Step</Label>
								<Select
									value={draft.stepKind}
									onValueChange={(value) =>
										setDraft((d) => ({
											...d,
											stepKind: value as typeof d.stepKind,
										}))
									}
								>
									<SelectTrigger className="border-[0.25px] border-slate-300 bg-white">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(STEP_LABELS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Duration (hours)</Label>
								<Input
									type="number"
									min={1}
									value={draft.durationHours}
									onChange={(e) =>
										setDraft((d) => ({
											...d,
											durationHours: Number(e.target.value) || 1,
										}))
									}
									className="border-[0.25px] border-slate-300 bg-white"
								/>
							</div>
							<div className="space-y-2">
								<Label>At-risk percent</Label>
								<Input
									type="number"
									min={1}
									max={99}
									value={draft.atRiskPercent}
									onChange={(e) =>
										setDraft((d) => ({
											...d,
											atRiskPercent: Number(e.target.value) || 50,
										}))
									}
									className="border-[0.25px] border-slate-300 bg-white"
								/>
							</div>
							<div className="space-y-2">
								<Label>Due-soon hours</Label>
								<Input
									type="number"
									min={1}
									value={draft.dueSoonHours}
									onChange={(e) =>
										setDraft((d) => ({
											...d,
											dueSoonHours: Number(e.target.value) || 24,
										}))
									}
									className="border-[0.25px] border-slate-300 bg-white"
								/>
							</div>
							<div className="space-y-2">
								<Label>Repeat escalation hours</Label>
								<Input
									type="number"
									min={1}
									value={draft.repeatEscalationHours}
									onChange={(e) =>
										setDraft((d) => ({
											...d,
											repeatEscalationHours: Number(e.target.value) || 48,
										}))
									}
									className="border-[0.25px] border-slate-300 bg-white"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Escalate to roles</Label>
							<Input
								value={draft.escalateToRoleNames}
								onChange={(e) =>
									setDraft((d) => ({
										...d,
										escalateToRoleNames: e.target.value,
									}))
								}
								className="border-[0.25px] border-slate-300 bg-white"
							/>
						</div>
						<label className="flex items-center gap-2 text-sm text-slate-700">
							<Checkbox
								checked={draft.isActive}
								onCheckedChange={(value) =>
									setDraft((d) => ({ ...d, isActive: value === true }))
								}
							/>
							Policy is active
						</label>
					</div>
					<div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={saving}
							onClick={() => void save()}
						>
							<Save className="h-4 w-4" />
							Save policy
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</GlassCard>
	);
}
