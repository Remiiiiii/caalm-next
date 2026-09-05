import { ID, Query } from "node-appwrite";
import { parseWorkflowState } from "@/lib/approvals/ContractApprovalWorkflowService";
import type {
	AttestationEntityType,
	AttestationIntent,
	AttestationPhase,
	AttestationStatus,
	ExpirationAttestation,
	ExpirationReasonCategory,
} from "@/lib/approvals/expirationAttestation.types";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { getUsersByRoleNames } from "@/lib/utils/get-users-by-role";
import { triggerNotification } from "@/lib/utils/notificationTriggers";

export type {
	AttestationEntityType,
	AttestationIntent,
	AttestationPhase,
	AttestationStatus,
	ExpirationAttestation,
	ExpirationReasonCategory,
} from "@/lib/approvals/expirationAttestation.types";
export { REASON_CATEGORY_LABELS } from "@/lib/approvals/expirationAttestation.types";

function tableId(): string {
	return appwriteConfig.documentExpirationAttestationsCollectionId;
}

function rowToAttestation(row: Record<string, unknown>): ExpirationAttestation {
	return {
		$id: String(row.$id || ""),
		orgId: String(row.orgId || ""),
		entityType: (row.entityType as AttestationEntityType) || "contract",
		entityId: String(row.entityId || ""),
		entityName: String(row.entityName || ""),
		phase: (row.phase as AttestationPhase) || "post_expiry",
		intent: (row.intent as AttestationIntent) || "unintentional",
		status: (row.status as AttestationStatus) || "pending",
		reasonCategory: row.reasonCategory as ExpirationReasonCategory | undefined,
		narrative: row.narrative as string | undefined,
		accountableUserId: row.accountableUserId as string | undefined,
		submittedBy: row.submittedBy as string | undefined,
		submittedAt: row.submittedAt as string | undefined,
		reviewedBy: row.reviewedBy as string | undefined,
		reviewedAt: row.reviewedAt as string | undefined,
		signatureFileId: row.signatureFileId as string | undefined,
		expiredAt: row.expiredAt as string | undefined,
		priorExpiryDate: row.priorExpiryDate as string | undefined,
		linkedStepKind: row.linkedStepKind as string | undefined,
		slaStatusAtExpiry: row.slaStatusAtExpiry as string | undefined,
		snoozeCount: Number(row.snoozeCount || 0),
		alertDismissCount: Number(row.alertDismissCount || 0),
		renewalBlocked: row.renewalBlocked === true,
	};
}

async function audit(
	title: string,
	orgId: string | undefined,
	userId: string,
	attestation: ExpirationAttestation,
	summary: string,
): Promise<void> {
	await logAuditEvent({
		event_id: ID.unique(),
		event_title: title,
		action: "update",
		source: "caalm",
		user_id: userId,
		user_name: "Expiration accountability",
		user_email: "",
		orgId,
		status: "success",
		module: attestation.entityType === "license" ? "licenses" : "contracts",
		target_type: attestation.entityType,
		target_id: attestation.entityId,
		target_label: attestation.entityName,
		summary,
		metadata: {
			attestationId: attestation.$id,
			reasonCategory: attestation.reasonCategory,
			intent: attestation.intent,
			phase: attestation.phase,
			accountableUserId: attestation.accountableUserId,
			linkedStepKind: attestation.linkedStepKind,
			slaStatusAtExpiry: attestation.slaStatusAtExpiry,
		},
	});
}

export async function listAttestationsForOrg(
	orgId: string,
	status?: AttestationStatus,
): Promise<ExpirationAttestation[]> {
	if (!orgId || !appwriteConfig.databaseId) return [];
	const { tablesDB } = await createAdminClient();
	const queries = [Query.equal("orgId", orgId), Query.limit(200)];
	if (status) queries.push(Query.equal("status", status));
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: tableId(),
		queries,
	});
	return (result.rows as Array<Record<string, unknown>>).map(rowToAttestation);
}

export async function getAttestationForEntity(
	orgId: string,
	entityType: AttestationEntityType,
	entityId: string,
): Promise<ExpirationAttestation | null> {
	if (!orgId || !entityId || !appwriteConfig.databaseId) return null;
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("entityType", entityType),
			Query.equal("entityId", entityId),
			Query.limit(5),
			Query.orderDesc("$createdAt"),
		],
	});
	const row = result.rows[0] as Record<string, unknown> | undefined;
	return row ? rowToAttestation(row) : null;
}

export async function getAttestationById(
	id: string,
): Promise<ExpirationAttestation | null> {
	if (!id || !appwriteConfig.databaseId) return null;
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.getRow({
		databaseId: appwriteConfig.databaseId,
		tableId: tableId(),
		rowId: id,
	});
	return rowToAttestation(row as unknown as Record<string, unknown>);
}

export async function isRenewalBlocked(
	orgId: string,
	entityType: AttestationEntityType,
	entityId: string,
): Promise<boolean> {
	const existing = await getAttestationForEntity(orgId, entityType, entityId);
	if (!existing) return false;
	if (existing.phase === "pre_expiry" && existing.intent === "intentional") {
		return false;
	}
	if (existing.status === "reviewed" || existing.status === "waived") {
		return false;
	}
	return existing.renewalBlocked;
}

export async function createPreExpiryAttestation(input: {
	orgId: string;
	entityType: AttestationEntityType;
	entityId: string;
	entityName: string;
	reasonCategory: ExpirationReasonCategory;
	narrative: string;
	accountableUserId: string;
	submittedBy: string;
	priorExpiryDate?: string;
	signatureFileId?: string;
}): Promise<ExpirationAttestation> {
	const { tablesDB } = await createAdminClient();
	const existing = await getAttestationForEntity(
		input.orgId,
		input.entityType,
		input.entityId,
	);
	if (existing && existing.status !== "pending") {
		return existing;
	}

	const data = {
		orgId: input.orgId,
		entityType: input.entityType,
		entityId: input.entityId,
		entityName: input.entityName,
		phase: "pre_expiry" as const,
		intent: "intentional" as const,
		status: "reviewed" as const,
		reasonCategory: input.reasonCategory,
		narrative: input.narrative,
		accountableUserId: input.accountableUserId,
		submittedBy: input.submittedBy,
		submittedAt: new Date().toISOString(),
		reviewedBy: input.submittedBy,
		reviewedAt: new Date().toISOString(),
		signatureFileId: input.signatureFileId,
		priorExpiryDate: input.priorExpiryDate,
		renewalBlocked: false,
	};

	const row = existing
		? await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: tableId(),
				rowId: existing.$id,
				data,
			})
		: await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: tableId(),
				rowId: ID.unique(),
				data,
			});

	const attestation = rowToAttestation(row as unknown as Record<string, unknown>);
	await audit(
		`Intentional expiration declared: ${input.entityName}`,
		input.orgId,
		input.submittedBy,
		attestation,
		`${input.entityName} marked for intentional expiration (${input.reasonCategory})`,
	);
	return attestation;
}

export async function createPendingPostExpiryAttestation(input: {
	orgId: string;
	entityType: AttestationEntityType;
	entityId: string;
	entityName: string;
	accountableUserId?: string;
	expiredAt?: string;
	priorExpiryDate?: string;
	workflowState?: string;
	snoozeCount?: number;
	alertDismissCount?: number;
}): Promise<ExpirationAttestation | null> {
	if (!input.orgId || !appwriteConfig.databaseId) return null;
	const existing = await getAttestationForEntity(
		input.orgId,
		input.entityType,
		input.entityId,
	);
	if (existing) {
		if (existing.phase === "pre_expiry" && existing.intent === "intentional") {
			return existing;
		}
		return existing;
	}

	const parsed = parseWorkflowState(input.workflowState);
	const current = parsed?.steps[parsed.currentStepIndex];
	const slaStatus = current?.slaStatus;
	const suggested: ExpirationReasonCategory =
		slaStatus === "breached" ? "approval_bottleneck" : "missed_renewal";

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId,
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			entityType: input.entityType,
			entityId: input.entityId,
			entityName: input.entityName,
			phase: "post_expiry",
			intent: "unintentional",
			status: "pending",
			reasonCategory: suggested,
			accountableUserId: input.accountableUserId,
			expiredAt: input.expiredAt || new Date().toISOString(),
			priorExpiryDate: input.priorExpiryDate,
			linkedStepKind: current?.kind,
			slaStatusAtExpiry: slaStatus,
			snoozeCount: input.snoozeCount ?? 0,
			alertDismissCount: input.alertDismissCount ?? 0,
			renewalBlocked: true,
		},
	});

	const attestation = rowToAttestation(row as unknown as Record<string, unknown>);

	const recipients = new Set<string>();
	if (input.accountableUserId) recipients.add(input.accountableUserId);
	try {
		const managers = await getUsersByRoleNames(
			["Department Manager", "Organization Admin"],
			input.orgId,
			{ activeOnly: true },
		);
		for (const user of managers) {
			if (user.$id) recipients.add(user.$id);
		}
	} catch {
		/* role lookup is best-effort */
	}

	const actionUrl =
		input.entityType === "contract"
			? "/contracts/approvals"
			: "/licenses/approvals";
	for (const userId of recipients) {
		try {
			await triggerNotification("info", {
				userId,
				title: `Expiration needs explanation: ${input.entityName}`,
				message: `"${input.entityName}" expired without a pre-declared reason. File an attestation before renewing.`,
				priority: "high",
				metadata: {
					attestationId: attestation.$id,
					actionUrl,
					actionText: "Open accountability",
				},
			});
		} catch {
			/* keep cron moving */
		}
	}

	await audit(
		`Unattested expiration: ${input.entityName}`,
		input.orgId,
		"system",
		attestation,
		`${input.entityName} expired without a pre-expiry declaration`,
	);

	return attestation;
}

export async function submitAttestation(input: {
	id: string;
	submittedBy: string;
	reasonCategory: ExpirationReasonCategory;
	narrative: string;
	intent?: AttestationIntent;
	signatureFileId?: string;
}): Promise<ExpirationAttestation> {
	const existing = await getAttestationById(input.id);
	if (!existing) throw new Error("Attestation not found");
	if (!input.narrative.trim()) throw new Error("Narrative is required");

	const { tablesDB } = await createAdminClient();
	const now = new Date().toISOString();
	const nextStatus: AttestationStatus =
		input.intent === "intentional" ? "reviewed" : "submitted";
	const row = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		rowId: input.id,
		data: {
			reasonCategory: input.reasonCategory,
			narrative: input.narrative.trim(),
			intent: input.intent || existing.intent,
			status: nextStatus,
			submittedBy: input.submittedBy,
			submittedAt: now,
			reviewedBy: nextStatus === "reviewed" ? input.submittedBy : undefined,
			reviewedAt: nextStatus === "reviewed" ? now : undefined,
			signatureFileId: input.signatureFileId,
			renewalBlocked: nextStatus !== "reviewed",
		},
	});
	const attestation = rowToAttestation(row as unknown as Record<string, unknown>);
	await audit(
		`Expiration attestation submitted: ${existing.entityName}`,
		existing.orgId,
		input.submittedBy,
		attestation,
		`${existing.entityName} expiration explained (${input.reasonCategory})`,
	);
	return attestation;
}

export async function reviewAttestation(input: {
	id: string;
	reviewedBy: string;
	notes?: string;
}): Promise<ExpirationAttestation> {
	const existing = await getAttestationById(input.id);
	if (!existing) throw new Error("Attestation not found");
	if (existing.status === "pending") {
		throw new Error("Owner must submit the explanation before review");
	}

	const { tablesDB } = await createAdminClient();
	const now = new Date().toISOString();
	const row = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		rowId: input.id,
		data: {
			status: "reviewed",
			reviewedBy: input.reviewedBy,
			reviewedAt: now,
			renewalBlocked: false,
			narrative: input.notes
				? `${existing.narrative || ""}\n\nReviewer: ${input.notes}`.trim()
				: existing.narrative,
		},
	});
	const attestation = rowToAttestation(row as unknown as Record<string, unknown>);
	await audit(
		`Expiration attestation reviewed: ${existing.entityName}`,
		existing.orgId,
		input.reviewedBy,
		attestation,
		`${existing.entityName} expiration explanation accepted`,
	);
	return attestation;
}

export async function countPendingAttestations(orgId: string): Promise<number> {
	const rows = await listAttestationsForOrg(orgId, "pending");
	return rows.length;
}
