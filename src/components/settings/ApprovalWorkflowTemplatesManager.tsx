"use client";

import { GitBranch, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type {
	ApprovalAssigneeStrategy,
	ApprovalTemplateEntityType,
	ApprovalTemplateRule,
	ApprovalTemplateStepSpec,
	ApprovalWorkflowTemplate,
} from "@/lib/approvals/workflowTemplates";
import type { ApprovalStepKind } from "@/lib/approvals/contractApprovalWorkflow.types";

type DraftRule = {
	field: ApprovalTemplateRule["field"];
	op: ApprovalTemplateRule["op"];
	value: string;
};

type DraftStep = {
	kind: ApprovalStepKind;
	label: string;
	assigneeStrategy: ApprovalAssigneeStrategy;
	parallelGroupId: string;
};

type Draft = {
	$id?: string;
	name: string;
	entityType: ApprovalTemplateEntityType;
	isDefault: boolean;
	isActive: boolean;
	rules: DraftRule[];
	steps: DraftStep[];
};

const FIELD_OPTIONS: Array<{ value: ApprovalTemplateRule["field"]; label: string }> =
	[
		{ value: "contractValue", label: "Amount / value" },
		{ value: "contractType", label: "Type" },
		{ value: "department", label: "Department" },
		{ value: "riskTier", label: "Risk tier" },
	];

const OP_OPTIONS: Array<{ value: ApprovalTemplateRule["op"]; label: string }> = [
	{ value: "gte", label: "≥" },
	{ value: "lte", label: "≤" },
	{ value: "eq", label: "equals" },
	{ value: "in", label: "in list" },
];

const KIND_OPTIONS: ApprovalStepKind[] = [
	"submitted",
	"department_review",
	"internal_approval",
	"executive_approval",
	"activated",
];

const STRATEGY_OPTIONS: ApprovalAssigneeStrategy[] = [
	"uploader",
	"department_managers",
	"internal_approvers",
	"executives",
];

const DEFAULT_STEPS: DraftStep[] = [
	{
		kind: "submitted",
		label: "Submitted",
		assigneeStrategy: "uploader",
		parallelGroupId: "",
	},
	{
		kind: "department_review",
		label: "Department review",
		assigneeStrategy: "department_managers",
		parallelGroupId: "",
	},
	{
		kind: "executive_approval",
		label: "Executive approval",
		assigneeStrategy: "executives",
		parallelGroupId: "",
	},
	{
		kind: "activated",
		label: "Activated",
		assigneeStrategy: "executives",
		parallelGroupId: "",
	},
];

const PARALLEL_PRESET_STEPS: DraftStep[] = [
	{
		kind: "submitted",
		label: "Submitted",
		assigneeStrategy: "uploader",
		parallelGroupId: "",
	},
	{
		kind: "department_review",
		label: "Department review",
		assigneeStrategy: "department_managers",
		parallelGroupId: "",
	},
	{
		kind: "internal_approval",
		label: "Legal",
		assigneeStrategy: "internal_approvers",
		parallelGroupId: "legal-finance",
	},
	{
		kind: "internal_approval",
		label: "Finance",
		assigneeStrategy: "internal_approvers",
		parallelGroupId: "legal-finance",
	},
	{
		kind: "executive_approval",
		label: "Executive approval",
		assigneeStrategy: "executives",
		parallelGroupId: "",
	},
	{
		kind: "activated",
		label: "Activated",
		assigneeStrategy: "executives",
		parallelGroupId: "",
	},
];

const emptyDraft = (): Draft => ({
	name: "Default routing",
	entityType: "both",
	isDefault: true,
	isActive: true,
	rules: [],
	steps: DEFAULT_STEPS.map((s) => ({ ...s })),
});

function templateToDraft(template: ApprovalWorkflowTemplate): Draft {
	return {
		$id: template.$id,
		name: template.name,
		entityType: template.entityType,
		isDefault: template.isDefault,
		isActive: template.isActive,
		rules: (template.rules || []).map((rule) => ({
			field: rule.field,
			op: rule.op,
			value: Array.isArray(rule.value)
				? rule.value.join(", ")
				: String(rule.value ?? ""),
		})),
		steps: (template.steps || DEFAULT_STEPS).map((step) => ({
			kind: step.kind,
			label: step.label || step.kind.replace(/_/g, " "),
			assigneeStrategy: step.assigneeStrategy,
			parallelGroupId: step.parallelGroupId || "",
		})),
	};
}

function draftToPayload(draft: Draft): {
	name: string;
	entityType: ApprovalTemplateEntityType;
	rules: ApprovalTemplateRule[];
	steps: ApprovalTemplateStepSpec[];
	isDefault: boolean;
	isActive: boolean;
} {
	const rules: ApprovalTemplateRule[] = draft.rules
		.filter((r) => r.value.trim().length > 0)
		.map((r) => {
			if (r.op === "in") {
				return {
					field: r.field,
					op: r.op,
					value: r.value
						.split(",")
						.map((part) => part.trim())
						.filter(Boolean),
				};
			}
			if (r.field === "contractValue") {
				return {
					field: r.field,
					op: r.op,
					value: Number(r.value),
				};
			}
			return {
				field: r.field,
				op: r.op,
				value: r.value.trim(),
			};
		});

	const steps: ApprovalTemplateStepSpec[] = draft.steps.map((step) => ({
		kind: step.kind,
		label: step.label.trim() || step.kind.replace(/_/g, " "),
		assigneeStrategy: step.assigneeStrategy,
		...(step.parallelGroupId.trim()
			? { parallelGroupId: step.parallelGroupId.trim() }
			: {}),
	}));

	return {
		name: draft.name.trim() || "Untitled template",
		entityType: draft.entityType,
		rules,
		steps,
		isDefault: draft.isDefault,
		isActive: draft.isActive,
	};
}

function summarizeRules(rules: ApprovalTemplateRule[]): string {
	if (!rules.length) return "default (no rules)";
	return rules
		.map((rule) => {
			const value = Array.isArray(rule.value)
				? rule.value.join("|")
				: String(rule.value);
			return `${rule.field} ${rule.op} ${value}`;
		})
		.join("; ");
}

const selectClass =
	"h-10 w-full rounded-md border-[0.25px] border-slate-300 bg-white px-3 text-sm text-slate-700";

export function ApprovalWorkflowTemplatesManager({
	canEdit,
}: {
	canEdit: boolean;
}) {
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const [templates, setTemplates] = useState<ApprovalWorkflowTemplate[]>([]);
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft>(emptyDraft);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		if (!orgId) return;
		const res = await fetch(
			`/api/approvals/workflow-templates?orgId=${encodeURIComponent(orgId)}`,
		);
		const json = await res.json();
		setTemplates(Array.isArray(json.templates) ? json.templates : []);
	}, [orgId]);

	useEffect(() => {
		void load();
	}, [load]);

	const save = async () => {
		if (!orgId) return;
		const payload = draftToPayload(draft);
		if (!payload.isDefault && payload.rules.length === 0) {
			toast({
				title: "Rules required",
				description:
					"Non-default templates need at least one routing rule so they match the right items.",
				variant: "destructive",
			});
			return;
		}
		if (payload.steps.length < 2) {
			toast({
				title: "Steps required",
				description: "Add at least two workflow steps.",
				variant: "destructive",
			});
			return;
		}

		setSaving(true);
		try {
			const res = draft.$id
				? await fetch(`/api/approvals/workflow-templates/${draft.$id}`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(payload),
					})
				: await fetch(
						`/api/approvals/workflow-templates?orgId=${encodeURIComponent(orgId)}`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(payload),
						},
					);
			const json = await res.json();
			if (!res.ok || !json.success) {
				toast({
					title: "Save failed",
					description: json.message || "Could not save template",
					variant: "destructive",
				});
				return;
			}
			setOpen(false);
			await load();
		} finally {
			setSaving(false);
		}
	};

	return (
		<GlassCard className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="space-y-4 p-4 sm:p-6">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">
							Approval routing templates
						</p>
						<p className="text-xs text-slate-600">
							Route by value, type, department, or risk. Use the same parallel
							group ID on steps that should run together.
						</p>
					</div>
					{canEdit ? (
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							onClick={() => {
								setDraft(emptyDraft());
								setOpen(true);
							}}
						>
							<Plus className="h-4 w-4" />
							Add template
						</Button>
					) : null}
				</div>
				{templates.length === 0 ? (
					<p className="text-sm text-slate-500">
						No custom templates. New items use the default three-step path.
					</p>
				) : (
					<ul className="space-y-2">
						{templates.map((template) => (
							<li
								key={template.$id}
								className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
							>
								<div className="min-w-0">
									<p className="text-sm font-medium text-slate-700">
										{template.name}
									</p>
									<p className="truncate text-xs text-slate-500">
										{template.entityType} · {template.steps.length} steps
										{template.isDefault ? " · default" : ""} ·{" "}
										{summarizeRules(template.rules)}
									</p>
								</div>
								{canEdit ? (
									<div className="flex shrink-0 gap-2">
										<Button
											type="button"
											variant="outline"
											className="primary-btn px-3"
											onClick={() => {
												setDraft(templateToDraft(template));
												setOpen(true);
											}}
										>
											<Pencil className="h-4 w-4" />
											Edit
										</Button>
										<Button
											type="button"
											variant="outline"
											className="delete-btn px-3"
											onClick={() => {
												void fetch(
													`/api/approvals/workflow-templates/${template.$id}`,
													{ method: "DELETE" },
												).then(() => load());
											}}
										>
											<Trash2 className="h-4 w-4" />
											Delete
										</Button>
									</div>
								) : null}
							</li>
						))}
					</ul>
				)}
			</CardContent>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-[720px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
					<div className="sticky top-0 z-10 bg-linear-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
						<div className="flex items-center gap-3 px-6">
							<GitBranch className="w-5 h-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								{draft.$id ? "Edit routing template" : "Routing template"}
							</DialogTitle>
						</div>
						<p className="text-sm text-slate-600 mt-1 ml-14">
							Rules decide when this path applies. Matching steps run in order;
							shared parallel group IDs run together.
						</p>
					</div>
					<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-5">
						<div className="grid gap-3 md:grid-cols-2">
							<div>
								<Label>Name</Label>
								<Input
									className="border-[0.25px] border-slate-300"
									value={draft.name}
									onChange={(e) =>
										setDraft((d) => ({ ...d, name: e.target.value }))
									}
								/>
							</div>
							<div>
								<Label>Applies to</Label>
								<select
									className={selectClass}
									value={draft.entityType}
									onChange={(e) =>
										setDraft((d) => ({
											...d,
											entityType: e.target.value as ApprovalTemplateEntityType,
										}))
									}
								>
									<option value="both">Contracts and licenses</option>
									<option value="contract">Contracts only</option>
									<option value="license">Licenses only</option>
								</select>
							</div>
						</div>

						<div className="flex flex-wrap gap-4 text-sm text-slate-700">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={draft.isDefault}
									onChange={(e) =>
										setDraft((d) => ({ ...d, isDefault: e.target.checked }))
									}
								/>
								Default fallback
							</label>
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={draft.isActive}
									onChange={(e) =>
										setDraft((d) => ({ ...d, isActive: e.target.checked }))
									}
								/>
								Active
							</label>
						</div>

						<section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium text-slate-700">
									When this template matches
								</p>
								<Button
									type="button"
									variant="outline"
									className="primary-btn px-3"
									onClick={() =>
										setDraft((d) => ({
											...d,
											rules: [
												...d.rules,
												{ field: "contractValue", op: "gte", value: "" },
											],
										}))
									}
								>
									<Plus className="h-4 w-4" />
									Add rule
								</Button>
							</div>
							{draft.rules.length === 0 ? (
								<p className="text-xs text-slate-500">
									No rules — use as the default path, or add rules to match
									amount / type / department / risk.
								</p>
							) : (
								<ul className="space-y-2">
									{draft.rules.map((rule, index) => (
										<li
											key={`rule-${index}`}
											className="grid gap-2 md:grid-cols-[1.2fr_0.8fr_1.4fr_auto]"
										>
											<select
												className={selectClass}
												value={rule.field}
												onChange={(e) =>
													setDraft((d) => {
														const rules = [...d.rules];
														rules[index] = {
															...rules[index],
															field: e.target
																.value as ApprovalTemplateRule["field"],
														};
														return { ...d, rules };
													})
												}
											>
												{FIELD_OPTIONS.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.label}
													</option>
												))}
											</select>
											<select
												className={selectClass}
												value={rule.op}
												onChange={(e) =>
													setDraft((d) => {
														const rules = [...d.rules];
														rules[index] = {
															...rules[index],
															op: e.target.value as ApprovalTemplateRule["op"],
														};
														return { ...d, rules };
													})
												}
											>
												{OP_OPTIONS.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.label}
													</option>
												))}
											</select>
											<Input
												className="border-[0.25px] border-slate-300"
												value={rule.value}
												placeholder={
													rule.op === "in"
														? "High, Critical"
														: rule.field === "contractValue"
															? "50000"
															: "Value"
												}
												onChange={(e) =>
													setDraft((d) => {
														const rules = [...d.rules];
														rules[index] = {
															...rules[index],
															value: e.target.value,
														};
														return { ...d, rules };
													})
												}
											/>
											<Button
												type="button"
												variant="outline"
												className="delete-btn px-3"
												onClick={() =>
													setDraft((d) => ({
														...d,
														rules: d.rules.filter((_, i) => i !== index),
													}))
												}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</li>
									))}
								</ul>
							)}
						</section>

						<section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-sm font-medium text-slate-700">Steps</p>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										variant="outline"
										className="primary-btn px-3"
										onClick={() =>
											setDraft((d) => ({
												...d,
												name: d.name || "Legal + Finance parallel",
												isDefault: false,
												steps: PARALLEL_PRESET_STEPS.map((s) => ({ ...s })),
												rules:
													d.rules.length > 0
														? d.rules
														: [
																{
																	field: "riskTier",
																	op: "eq",
																	value: "High",
																},
															],
											}))
										}
									>
										<GitBranch className="h-4 w-4" />
										Legal + Finance preset
									</Button>
									<Button
										type="button"
										variant="outline"
										className="primary-btn px-3"
										onClick={() =>
											setDraft((d) => ({
												...d,
												steps: [
													...d.steps,
													{
														kind: "internal_approval",
														label: "Review",
														assigneeStrategy: "internal_approvers",
														parallelGroupId: "",
													},
												],
											}))
										}
									>
										<Plus className="h-4 w-4" />
										Add step
									</Button>
								</div>
							</div>
							<ul className="space-y-3">
								{draft.steps.map((step, index) => (
									<li
										key={`step-${index}`}
										className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-2"
									>
										<div>
											<Label>Kind</Label>
											<select
												className={selectClass}
												value={step.kind}
												onChange={(e) =>
													setDraft((d) => {
														const steps = [...d.steps];
														steps[index] = {
															...steps[index],
															kind: e.target.value as ApprovalStepKind,
														};
														return { ...d, steps };
													})
												}
											>
												{KIND_OPTIONS.map((kind) => (
													<option key={kind} value={kind}>
														{kind.replace(/_/g, " ")}
													</option>
												))}
											</select>
										</div>
										<div>
											<Label>Label</Label>
											<Input
												className="border-[0.25px] border-slate-300"
												value={step.label}
												onChange={(e) =>
													setDraft((d) => {
														const steps = [...d.steps];
														steps[index] = {
															...steps[index],
															label: e.target.value,
														};
														return { ...d, steps };
													})
												}
											/>
										</div>
										<div>
											<Label>Assignee strategy</Label>
											<select
												className={selectClass}
												value={step.assigneeStrategy}
												onChange={(e) =>
													setDraft((d) => {
														const steps = [...d.steps];
														steps[index] = {
															...steps[index],
															assigneeStrategy: e.target
																.value as ApprovalAssigneeStrategy,
														};
														return { ...d, steps };
													})
												}
											>
												{STRATEGY_OPTIONS.map((strategy) => (
													<option key={strategy} value={strategy}>
														{strategy.replace(/_/g, " ")}
													</option>
												))}
											</select>
										</div>
										<div>
											<Label>Parallel group ID (optional)</Label>
											<div className="flex gap-2">
												<Input
													className="border-[0.25px] border-slate-300"
													value={step.parallelGroupId}
													placeholder="e.g. legal-finance"
													onChange={(e) =>
														setDraft((d) => {
															const steps = [...d.steps];
															steps[index] = {
																...steps[index],
																parallelGroupId: e.target.value,
															};
															return { ...d, steps };
														})
													}
												/>
												<Button
													type="button"
													variant="outline"
													className="delete-btn px-3"
													onClick={() =>
														setDraft((d) => ({
															...d,
															steps: d.steps.filter((_, i) => i !== index),
														}))
													}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</li>
								))}
							</ul>
						</section>
					</div>
					<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={saving}
							onClick={() => void save()}
						>
							<Plus className="h-4 w-4" />
							{draft.$id ? "Update template" : "Save template"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</GlassCard>
	);
}
