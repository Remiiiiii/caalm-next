import { ID, Query } from "node-appwrite";
import type {
	ApprovalStepKind,
	ApprovalWorkflowStep,
} from "@/lib/approvals/contractApprovalWorkflow.types";

export type BuildDerivedStepsInput = {
	uploaderUserId: string;
	departmentManagerIds?: string[];
	internalApproverIds?: string[];
	executiveApproverIds?: string[];
	contractStatus?: string;
};
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";

export type ApprovalTemplateEntityType = "contract" | "license" | "both";

export type ApprovalAssigneeStrategy =
	| "uploader"
	| "department_managers"
	| "internal_approvers"
	| "executives";

export interface ApprovalTemplateStepSpec {
	kind: ApprovalStepKind;
	label?: string;
	assigneeStrategy: ApprovalAssigneeStrategy;
	parallelGroupId?: string;
}

export interface ApprovalTemplateRule {
	field: "contractValue" | "contractType" | "department" | "riskTier";
	op: "gte" | "lte" | "eq" | "in";
	value: string | number | string[];
}

export interface ApprovalWorkflowTemplate {
	$id: string;
	orgId: string;
	name: string;
	entityType: ApprovalTemplateEntityType;
	rules: ApprovalTemplateRule[];
	steps: ApprovalTemplateStepSpec[];
	isDefault: boolean;
	isActive: boolean;
}

export interface ApprovalRoutingMetadata {
	amount?: number;
	contractType?: string;
	department?: string;
	riskTier?: string;
}

export interface ApprovalTemplateInput {
	orgId: string;
	name: string;
	entityType: ApprovalTemplateEntityType;
	rules: ApprovalTemplateRule[];
	steps: ApprovalTemplateStepSpec[];
	isDefault?: boolean;
	isActive?: boolean;
}

const DEFAULT_STEPS: ApprovalTemplateStepSpec[] = [
	{ kind: "submitted", assigneeStrategy: "uploader", label: "Submitted" },
	{
		kind: "department_review",
		assigneeStrategy: "department_managers",
		label: "Department review",
	},
	{
		kind: "executive_approval",
		assigneeStrategy: "executives",
		label: "Executive approval",
	},
	{ kind: "activated", assigneeStrategy: "executives", label: "Activated" },
];

function uniqueIds(ids: Array<string | undefined | null>): string[] {
	return [
		...new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)),
	];
}

function stepId(kind: string, index: number): string {
	return `${kind}-${index}`;
}

function parseJson<T>(raw: unknown, fallback: T): T {
	if (Array.isArray(raw)) return raw as T;
	if (typeof raw !== "string" || !raw.trim()) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function rowToTemplate(row: Record<string, unknown>): ApprovalWorkflowTemplate {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		name: String(row.name || "Untitled template"),
		entityType: (row.entityType as ApprovalTemplateEntityType) || "both",
		rules: parseJson<ApprovalTemplateRule[]>(row.rules, []),
		steps: parseJson<ApprovalTemplateStepSpec[]>(row.steps, DEFAULT_STEPS),
		isDefault: Boolean(row.isDefault),
		isActive: row.isActive !== false,
	};
}

function ruleMatches(
	rule: ApprovalTemplateRule,
	meta: ApprovalRoutingMetadata,
): boolean {
	const actual =
		rule.field === "contractValue"
			? meta.amount
			: rule.field === "contractType"
				? meta.contractType
				: rule.field === "department"
					? meta.department
					: meta.riskTier;

	if (rule.op === "gte") {
		return Number(actual ?? 0) >= Number(rule.value);
	}
	if (rule.op === "lte") {
		return Number(actual ?? 0) <= Number(rule.value);
	}
	if (rule.op === "in") {
		const allowed = Array.isArray(rule.value) ? rule.value : [String(rule.value)];
		return allowed.map(String).includes(String(actual ?? ""));
	}
	return String(actual ?? "") === String(rule.value);
}

export function templateMatchesMetadata(
	template: ApprovalWorkflowTemplate,
	meta: ApprovalRoutingMetadata,
): boolean {
	if (!template.rules.length) return template.isDefault;
	return template.rules.every((rule) => ruleMatches(rule, meta));
}

export function pickWorkflowTemplate(
	templates: ApprovalWorkflowTemplate[],
	entityType: "contract" | "license",
	meta: ApprovalRoutingMetadata,
): ApprovalWorkflowTemplate | null {
	const active = templates.filter(
		(t) =>
			t.isActive &&
			(t.entityType === entityType || t.entityType === "both"),
	);
	const matched = active.find(
		(t) => t.rules.length > 0 && templateMatchesMetadata(t, meta),
	);
	if (matched) return matched;
	return active.find((t) => t.isDefault) || null;
}

function assigneesForStrategy(
	strategy: ApprovalAssigneeStrategy,
	input: BuildDerivedStepsInput,
): string[] {
	const uploader = input.uploaderUserId;
	if (strategy === "uploader") return uploader ? [uploader] : [];
	if (strategy === "department_managers") {
		const managers = uniqueIds(input.departmentManagerIds || []);
		return managers.length > 0 ? managers : uploader ? [uploader] : [];
	}
	if (strategy === "internal_approvers") {
		return uniqueIds(input.internalApproverIds || []).filter(
			(id) => id !== uploader,
		);
	}
	return uniqueIds(input.executiveApproverIds || []).filter(
		(id) => id !== uploader,
	);
}

export function buildStepsFromTemplate(
	template: ApprovalWorkflowTemplate,
	input: BuildDerivedStepsInput,
): ApprovalWorkflowStep[] {
	const specs = template.steps.length > 0 ? template.steps : DEFAULT_STEPS;
	const steps: ApprovalWorkflowStep[] = specs.map((spec, index) => ({
		id: stepId(spec.kind, index),
		kind: spec.kind,
		label: spec.label || spec.kind.replace(/_/g, " "),
		assigneeUserIds: assigneesForStrategy(spec.assigneeStrategy, input),
		status: spec.kind === "submitted" ? "complete" : "pending",
		parallelGroupId: spec.parallelGroupId,
	}));

	const firstPending = steps.findIndex((s) => s.status === "pending");
	if (firstPending >= 0) {
		const group = steps[firstPending].parallelGroupId;
		for (let i = 0; i < steps.length; i++) {
			if (i === firstPending || (group && steps[i].parallelGroupId === group)) {
				if (steps[i].status === "pending") steps[i].status = "current";
			}
		}
	}

	if (input.contractStatus === "active") {
		for (const step of steps) {
			step.status = "complete";
		}
	}

	return steps;
}

export async function listWorkflowTemplates(
	orgId: string,
): Promise<ApprovalWorkflowTemplate[]> {
	const collectionId = appwriteConfig.approvalWorkflowTemplatesCollectionId;
	if (!collectionId) return [];
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: collectionId,
			queries: [Query.equal("orgId", orgId), Query.limit(100)],
		});
		return (result.rows || []).map((row) =>
			rowToTemplate(row as Record<string, unknown>),
		);
	} catch {
		return [];
	}
}

export async function resolveTemplateForSubmit(
	orgId: string | undefined,
	entityType: "contract" | "license",
	meta: ApprovalRoutingMetadata,
): Promise<ApprovalWorkflowTemplate | null> {
	if (!orgId) return null;
	const templates = await listWorkflowTemplates(orgId);
	return pickWorkflowTemplate(templates, entityType, meta);
}

export async function createWorkflowTemplate(
	data: ApprovalTemplateInput,
): Promise<ApprovalWorkflowTemplate> {
	const { tablesDB } = await createAdminClient();
	const row = await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "create",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.approvalWorkflowTemplatesCollectionId,
		rowId: ID.unique(),
		data: {
			orgId: data.orgId,
			name: data.name,
			entityType: data.entityType,
			rules: JSON.stringify(data.rules || []),
			steps: JSON.stringify(data.steps || DEFAULT_STEPS),
			isDefault: Boolean(data.isDefault),
			isActive: data.isActive !== false,
		},
	});
	return rowToTemplate(row as Record<string, unknown>);
}

export async function updateWorkflowTemplate(
	id: string,
	data: Partial<ApprovalTemplateInput>,
): Promise<ApprovalWorkflowTemplate> {
	const { tablesDB } = await createAdminClient();
	const payload: Record<string, unknown> = {};
	if (data.name !== undefined) payload.name = data.name;
	if (data.entityType !== undefined) payload.entityType = data.entityType;
	if (data.rules !== undefined) payload.rules = JSON.stringify(data.rules);
	if (data.steps !== undefined) payload.steps = JSON.stringify(data.steps);
	if (data.isDefault !== undefined) payload.isDefault = data.isDefault;
	if (data.isActive !== undefined) payload.isActive = data.isActive;
	const row = await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "update",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.approvalWorkflowTemplatesCollectionId,
		rowId: id,
		data: payload,
	});
	return rowToTemplate(row as Record<string, unknown>);
}

export async function deleteWorkflowTemplate(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.approvalWorkflowTemplatesCollectionId,
		rowId: id,
	});
}
