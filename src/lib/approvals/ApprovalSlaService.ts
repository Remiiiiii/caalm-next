import { ID, Query } from "node-appwrite";
import type {
	ApprovalSlaStatus,
	ApprovalStepKind,
	ApprovalWorkflowState,
	ApprovalWorkflowStep,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { excludeSoftDeletedQuery } from "@/lib/soft-delete";
import { getUsersByRoleNames } from "@/lib/utils/get-users-by-role";
import { triggerNotification } from "@/lib/utils/notificationTriggers";

export {
	hoursRemaining,
	slaCountdownLabel,
} from "@/lib/approvals/approvalSlaDisplay";

export type SlaEntityType = "contract" | "license" | "both";

export interface ApprovalSlaPolicy {
	$id: string;
	orgId: string;
	entityType: SlaEntityType;
	stepKind: ApprovalStepKind;
	durationHours: number;
	atRiskPercent: number;
	dueSoonHours: number;
	repeatEscalationHours: number;
	escalateToRoleNames: string[];
	channels: string[];
	isActive: boolean;
}

export type ApprovalSlaPolicyInput = Omit<ApprovalSlaPolicy, "$id">;

const SLA_STEP_KINDS: ApprovalStepKind[] = [
	"department_review",
	"internal_approval",
	"executive_approval",
	"awaiting_executive",
];

const DEFAULT_DURATION_HOURS: Partial<Record<ApprovalStepKind, number>> = {
	department_review: 120,
	internal_approval: 72,
	executive_approval: 72,
	awaiting_executive: 72,
};

function uniqueIds(ids: Array<string | undefined | null>): string[] {
	return [
		...new Set(ids.filter((id): id is string => Boolean(id?.trim()))),
	];
}

function policyTableId(): string {
	return appwriteConfig.approvalSlaPoliciesCollectionId;
}

function rowToPolicy(row: Record<string, unknown>): ApprovalSlaPolicy {
	return {
		$id: String(row.$id || ""),
		orgId: String(row.orgId || ""),
		entityType: (row.entityType as SlaEntityType) || "both",
		stepKind: row.stepKind as ApprovalStepKind,
		durationHours: Number(row.durationHours || 120),
		atRiskPercent: Number(row.atRiskPercent ?? 50),
		dueSoonHours: Number(row.dueSoonHours ?? 24),
		repeatEscalationHours: Number(row.repeatEscalationHours ?? 48),
		escalateToRoleNames: Array.isArray(row.escalateToRoleNames)
			? (row.escalateToRoleNames as string[])
			: ["Department Manager", "Organization Admin"],
		channels: Array.isArray(row.channels)
			? (row.channels as string[])
			: ["in_app", "email"],
		isActive: row.isActive !== false,
	};
}

export function defaultPolicyForStep(
	stepKind: ApprovalStepKind,
	orgId: string,
	entityType: SlaEntityType = "both",
): ApprovalSlaPolicy {
	return {
		$id: "",
		orgId,
		entityType,
		stepKind,
		durationHours: DEFAULT_DURATION_HOURS[stepKind] || 120,
		atRiskPercent: 50,
		dueSoonHours: 24,
		repeatEscalationHours: 48,
		escalateToRoleNames: ["Department Manager", "Organization Admin"],
		channels: ["in_app", "email"],
		isActive: true,
	};
}

export function computeSlaStatus(
	step: ApprovalWorkflowStep,
	policy: ApprovalSlaPolicy,
	now = new Date(),
): ApprovalSlaStatus {
	if (!step.dueAt || !step.startedAt) return "on_track";
	const due = new Date(step.dueAt).getTime();
	const start = new Date(step.startedAt).getTime();
	if (Number.isNaN(due) || Number.isNaN(start)) return "on_track";
	if (now.getTime() > due) return "breached";
	const windowMs = Math.max(1, due - start);
	const elapsed = now.getTime() - start;
	const atRiskAfter = windowMs * (policy.atRiskPercent / 100);
	if (elapsed >= atRiskAfter) return "at_risk";
	return "on_track";
}

export function applySlaToStep(
	step: ApprovalWorkflowStep,
	policy: ApprovalSlaPolicy,
	now = new Date(),
): ApprovalWorkflowStep {
	if (step.status !== "current" || !SLA_STEP_KINDS.includes(step.kind)) {
		return step;
	}
	const startedAt = step.startedAt || now.toISOString();
	const dueAt =
		step.dueAt ||
		new Date(
			new Date(startedAt).getTime() + policy.durationHours * 60 * 60 * 1000,
		).toISOString();
	const next = { ...step, startedAt, dueAt };
	next.slaStatus = computeSlaStatus(next, policy, now);
	return next;
}

export function clearSlaProgress(step: ApprovalWorkflowStep): ApprovalWorkflowStep {
	return {
		...step,
		startedAt: undefined,
		dueAt: undefined,
		slaStatus: undefined,
		slaBreachedAt: undefined,
		lastReminderAt: undefined,
		escalationLevel: undefined,
	};
}

export async function listSlaPolicies(
	orgId: string,
): Promise<ApprovalSlaPolicy[]> {
	if (!orgId || !appwriteConfig.databaseId) return [];
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: policyTableId(),
		queries: [Query.equal("orgId", orgId), Query.limit(100)],
	});
	return (result.rows as Array<Record<string, unknown>>).map(rowToPolicy);
}

export async function getPolicyForStep(
	orgId: string | undefined,
	entityType: "contract" | "license",
	stepKind: ApprovalStepKind,
): Promise<ApprovalSlaPolicy> {
	const fallback = defaultPolicyForStep(stepKind, orgId || "", entityType);
	if (!orgId || !appwriteConfig.databaseId) return fallback;
	try {
		const policies = await listSlaPolicies(orgId);
		const match = policies.find(
			(p) =>
				p.isActive &&
				p.stepKind === stepKind &&
				(p.entityType === entityType || p.entityType === "both"),
		);
		return match || fallback;
	} catch {
		return fallback;
	}
}

export async function createSlaPolicy(
	data: ApprovalSlaPolicyInput,
): Promise<ApprovalSlaPolicy> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: policyTableId(),
		rowId: ID.unique(),
		data: {
			orgId: data.orgId,
			entityType: data.entityType,
			stepKind: data.stepKind,
			durationHours: data.durationHours,
			atRiskPercent: data.atRiskPercent,
			dueSoonHours: data.dueSoonHours,
			repeatEscalationHours: data.repeatEscalationHours,
			escalateToRoleNames: data.escalateToRoleNames,
			channels: data.channels,
			isActive: data.isActive,
		},
	});
	return rowToPolicy(row as unknown as Record<string, unknown>);
}

export async function updateSlaPolicy(
	id: string,
	data: Partial<ApprovalSlaPolicyInput>,
): Promise<ApprovalSlaPolicy> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: policyTableId(),
		rowId: id,
		data,
	});
	return rowToPolicy(row as unknown as Record<string, unknown>);
}

export async function deleteSlaPolicy(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: policyTableId(),
		rowId: id,
	});
}

export async function stampCurrentStepSla(
	state: ApprovalWorkflowState,
	orgId: string | undefined,
	entityType: "contract" | "license",
	now = new Date(),
): Promise<ApprovalWorkflowState> {
	const idx = state.currentStepIndex;
	const current = state.steps[idx];
	if (!current || current.status !== "current") return state;
	const policy = await getPolicyForStep(orgId, entityType, current.kind);
	const stamped = applySlaToStep(current, policy, now);
	if (stamped === current && stamped.slaStatus === current.slaStatus) {
		return state;
	}
	return {
		...state,
		steps: state.steps.map((step, i) => (i === idx ? stamped : step)),
		derivedAt: now.toISOString(),
	};
}

function parseWorkflowState(
	raw: string | ApprovalWorkflowState | null | undefined,
): ApprovalWorkflowState | null {
	if (!raw) return null;
	if (typeof raw === "object") return raw;
	try {
		const parsed = JSON.parse(raw) as ApprovalWorkflowState;
		if (!parsed?.steps || !Array.isArray(parsed.steps)) return null;
		return parsed;
	} catch {
		return null;
	}
}

async function notifyUsers(
	userIds: string[],
	title: string,
	message: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	for (const userId of uniqueIds(userIds)) {
		try {
			await triggerNotification("info", {
				userId,
				title,
				message,
				priority: "high",
				metadata,
			});
		} catch (error) {
			console.error(`Failed to send SLA notice to ${userId}:`, error);
		}
	}
}

async function resolveEscalationRecipients(
	orgId: string | undefined,
	roleNames: string[],
): Promise<string[]> {
	if (!orgId || roleNames.length === 0) return [];
	try {
		const users = await getUsersByRoleNames(roleNames, orgId, {
			status: "active",
		});
		return uniqueIds(
			users.map((u: { $id?: string; accountId?: string }) => u.accountId || u.$id),
		);
	} catch {
		return [];
	}
}

async function auditSla(
	title: string,
	orgId: string | undefined,
	targetId: string,
	targetLabel: string,
	entity: "contract" | "license",
	metadata: Record<string, unknown>,
): Promise<void> {
	await logAuditEvent({
		event_id: ID.unique(),
		event_title: title,
		action: "update",
		source: "caalm",
		user_id: "system",
		user_name: "Approval SLA",
		user_email: "",
		orgId,
		status: "success",
		module: entity === "license" ? "licenses" : "contracts",
		target_type: entity,
		target_id: targetId,
		target_label: targetLabel,
		summary: title,
		metadata,
	});
}

type ProcessResult = {
	processed: number;
	reminded: number;
	breached: number;
	escalated: number;
};

async function processEntityRows(
	entity: "contract" | "license",
	result: ProcessResult,
): Promise<void> {
	const tableId =
		entity === "contract"
			? appwriteConfig.contractsCollectionId
			: appwriteConfig.licensesCollectionId;
	if (!tableId || !appwriteConfig.databaseId) return;

	const { tablesDB } = await createAdminClient();
	const listed = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId,
		queries: [
			Query.or([
				Query.equal("status", "pending-review"),
				Query.equal("status", "action-required"),
			]),
			excludeSoftDeletedQuery(entity === "contract" ? "contracts" : "licenses"),
			Query.limit(200),
		],
	});

	const now = new Date();

	for (const row of listed.rows as Array<Record<string, unknown>>) {
		const rowStatus = String(row.status || "").toLowerCase();
		if (rowStatus === "expired" || rowStatus === "inactive") continue;
		const orgId = String(row.orgId || "");
		const name =
			entity === "contract"
				? String(row.contractName || "Contract")
				: String(row.licenseName || "License");
		const uploader = String(
			entity === "contract"
				? row.contractOwnerId || row.owner || ""
				: row.licenseOwnerId || row.createdBy || "",
		);
		let state = parseWorkflowState(row.approvalWorkflowState as string);
		if (!state) continue;

		const priorCurrent = state.steps[state.currentStepIndex];
		const priorDueAt = priorCurrent?.dueAt;
		const priorSlaStatus = priorCurrent?.slaStatus;
		state = await stampCurrentStepSla(state, orgId, entity, now);
		const current = state.steps[state.currentStepIndex];
		if (!current || current.status !== "current") continue;

		const policy = await getPolicyForStep(orgId, entity, current.kind);
		const slaStatus = computeSlaStatus(current, policy, now);
		current.slaStatus = slaStatus;
		result.processed += 1;

		const dueMs = current.dueAt ? new Date(current.dueAt).getTime() : 0;
		const startMs = current.startedAt
			? new Date(current.startedAt).getTime()
			: 0;
		const level = current.escalationLevel || 0;
		const dueSoonMs = policy.dueSoonHours * 60 * 60 * 1000;
		const isDueSoon =
			slaStatus !== "breached" &&
			dueMs > 0 &&
			dueMs - now.getTime() <= dueSoonMs &&
			dueMs - now.getTime() > 0;
		const windowMs = Math.max(1, dueMs - startMs);
		const isAtRisk =
			slaStatus === "at_risk" &&
			startMs > 0 &&
			now.getTime() - startMs >= windowMs * (policy.atRiskPercent / 100);

		const assignees = uniqueIds(current.assigneeUserIds);
		const actionUrl =
			entity === "contract" ? "/contracts/approvals" : "/licenses/approvals";
		const metadata = {
			[entity === "contract" ? "contractId" : "licenseId"]: row.$id,
			actionUrl,
			actionText: "Open Approvals",
			stepId: current.id,
			dueAt: current.dueAt,
		};

		let dirty =
			current.dueAt !== priorDueAt || current.slaStatus !== priorSlaStatus;

		const alreadyDueSoon = (state.notifications || []).some(
			(note) => note.type === "sla_due_soon" && note.stepId === current.id,
		);

		if (isAtRisk && level < 1) {
			current.escalationLevel = 1;
			current.lastReminderAt = now.toISOString();
			state.notifications = [
				...(state.notifications || []),
				{
					id: ID.unique(),
					type: "sla_at_risk",
					sentAt: now.toISOString(),
					recipientUserIds: assignees,
					stepId: current.id,
					label: "SLA at risk",
				},
			];
			await notifyUsers(
				assignees,
				`Approval at risk: ${name} — ${current.label}`,
				`"${name}" is past the halfway mark for ${current.label}. Please review before the deadline.`,
				metadata,
			);
			await auditSla(
				`SLA at risk: ${name}`,
				orgId,
				String(row.$id),
				name,
				entity,
				metadata,
			);
			result.reminded += 1;
			dirty = true;
		} else if (
			isDueSoon &&
			!alreadyDueSoon &&
			level < 2 &&
			slaStatus !== "breached"
		) {
			current.lastReminderAt = now.toISOString();
			state.notifications = [
				...(state.notifications || []),
				{
					id: ID.unique(),
					type: "sla_due_soon",
					sentAt: now.toISOString(),
					recipientUserIds: uniqueIds([...assignees, uploader]),
					stepId: current.id,
					label: "SLA due soon",
				},
			];
			await notifyUsers(
				uniqueIds([...assignees, uploader]),
				`Approval due soon: ${name} — ${current.label}`,
				`"${name}" is due for ${current.label} ${slaCountdownLabel(current.dueAt, now).toLowerCase()}.`,
				metadata,
			);
			result.reminded += 1;
			dirty = true;
		}

		if (slaStatus === "breached" && level < 2) {
			current.escalationLevel = 2;
			current.slaBreachedAt = current.slaBreachedAt || now.toISOString();
			current.lastReminderAt = now.toISOString();
			const escalateIds = await resolveEscalationRecipients(
				orgId,
				policy.escalateToRoleNames,
			);
			const recipients = uniqueIds([...assignees, uploader, ...escalateIds]);
			state.notifications = [
				...(state.notifications || []),
				{
					id: ID.unique(),
					type: "sla_breached",
					sentAt: now.toISOString(),
					recipientUserIds: recipients,
					stepId: current.id,
					label: "SLA breached",
				},
			];
			await notifyUsers(
				assignees,
				`SLA breached: ${name} — assigned to you`,
				`"${name}" missed the ${current.label} deadline. Review it now to keep the approval moving.`,
				metadata,
			);
			await notifyUsers(
				uploader ? [uploader] : [],
				`Approval delayed: ${name}`,
				`"${name}" is overdue at ${current.label}. Assignees have been notified.`,
				metadata,
			);
			await notifyUsers(
				escalateIds,
				`SLA breach escalation: ${name}`,
				`"${name}" exceeded the ${current.label} SLA. Follow up with the assigned reviewers.`,
				metadata,
			);
			await auditSla(
				`SLA breached: ${name}`,
				orgId,
				String(row.$id),
				name,
				entity,
				{ ...metadata, breachedAt: current.slaBreachedAt },
			);
			result.breached += 1;
			dirty = true;
		} else if (slaStatus === "breached" && level === 2 && current.slaBreachedAt) {
			const breachedAt = new Date(current.slaBreachedAt).getTime();
			const repeatMs = policy.repeatEscalationHours * 60 * 60 * 1000;
			if (now.getTime() - breachedAt >= repeatMs) {
				current.escalationLevel = 3;
				current.lastReminderAt = now.toISOString();
				const escalateIds = await resolveEscalationRecipients(orgId, [
					"Organization Admin",
					"Super Admin",
				]);
				state.notifications = [
					...(state.notifications || []),
					{
						id: ID.unique(),
						type: "sla_escalated",
						sentAt: now.toISOString(),
						recipientUserIds: escalateIds,
						stepId: current.id,
						label: "SLA repeat escalation",
					},
				];
				await notifyUsers(
					escalateIds,
					`Repeat SLA escalation: ${name}`,
					`"${name}" is still overdue at ${current.label}. Leadership follow-up is required.`,
					metadata,
				);
				await auditSla(
					`SLA repeat escalation: ${name}`,
					orgId,
					String(row.$id),
					name,
					entity,
					metadata,
				);
				result.escalated += 1;
				dirty = true;
			}
		}

		if (dirty) {
			state.derivedAt = now.toISOString();
			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId,
				tableId,
				rowId: String(row.$id),
				data: {
					approvalWorkflowState: JSON.stringify(state),
				},
			});
		}
	}
}

export async function processApprovalSlas(): Promise<ProcessResult> {
	const result: ProcessResult = {
		processed: 0,
		reminded: 0,
		breached: 0,
		escalated: 0,
	};
	await processEntityRows("contract", result);
	await processEntityRows("license", result);
	return result;
}

export interface ApprovalSlaMetrics {
	openItems: number;
	atRisk: number;
	breached: number;
	avgStepHours: number | null;
	breachRate: number;
	byStepKind: Array<{ stepKind: string; open: number; breached: number }>;
}

function parseStateFromRow(
	row: Record<string, unknown>,
): ApprovalWorkflowState | null {
	return parseWorkflowState(row.approvalWorkflowState as string);
}

export async function computeSlaMetrics(
	orgId?: string,
): Promise<ApprovalSlaMetrics> {
	const empty: ApprovalSlaMetrics = {
		openItems: 0,
		atRisk: 0,
		breached: 0,
		avgStepHours: null,
		breachRate: 0,
		byStepKind: [],
	};
	if (!appwriteConfig.databaseId) return empty;

	const { tablesDB } = await createAdminClient();
	const queries = [
		Query.or([
			Query.equal("status", "pending-review"),
			Query.equal("status", "action-required"),
		]),
		Query.limit(200),
	];
	if (orgId) queries.unshift(Query.equal("orgId", orgId));

	const [contracts, licenses] = await Promise.all([
		tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId!,
			queries: [
				...queries,
				excludeSoftDeletedQuery("contracts"),
			],
		}),
		tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.licensesCollectionId!,
			queries: [
				...queries,
				excludeSoftDeletedQuery("licenses"),
			],
		}),
	]);

	const rows = [
		...(contracts.rows as Array<Record<string, unknown>>),
		...(licenses.rows as Array<Record<string, unknown>>),
	];
	const byKind = new Map<string, { open: number; breached: number }>();
	let durations = 0;
	let durationCount = 0;
	let atRisk = 0;
	let breached = 0;
	let openItems = 0;

	for (const row of rows) {
		const state = parseStateFromRow(row);
		if (!state) continue;
		const current = state.steps[state.currentStepIndex];
		if (!current || current.status !== "current") continue;
		openItems += 1;
		const kind = current.kind;
		const bucket = byKind.get(kind) || { open: 0, breached: 0 };
		bucket.open += 1;
		if (current.slaStatus === "at_risk") atRisk += 1;
		if (current.slaStatus === "breached") {
			breached += 1;
			bucket.breached += 1;
		}
		byKind.set(kind, bucket);
		if (current.startedAt) {
			const start = new Date(current.startedAt).getTime();
			if (!Number.isNaN(start)) {
				durations += (Date.now() - start) / (1000 * 60 * 60);
				durationCount += 1;
			}
		}
	}

	return {
		openItems,
		atRisk,
		breached,
		avgStepHours:
			durationCount > 0 ? Math.round((durations / durationCount) * 10) / 10 : null,
		breachRate: openItems > 0 ? Math.round((breached / openItems) * 100) : 0,
		byStepKind: Array.from(byKind.entries()).map(([stepKind, counts]) => ({
			stepKind,
			...counts,
		})),
	};
}
