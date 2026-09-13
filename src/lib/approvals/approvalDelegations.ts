import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";

export type DelegationEntityType = "contract" | "license" | "both";

export interface ApprovalDelegation {
	$id: string;
	orgId: string;
	userId: string;
	delegateUserId: string;
	entityType: DelegationEntityType;
	startsAt: string;
	endsAt: string;
}

export interface ApprovalDelegationInput {
	orgId: string;
	userId: string;
	delegateUserId: string;
	entityType?: DelegationEntityType;
	startsAt: string;
	endsAt: string;
}

function rowToDelegation(row: Record<string, unknown>): ApprovalDelegation {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		userId: String(row.userId || ""),
		delegateUserId: String(row.delegateUserId || ""),
		entityType: (row.entityType as DelegationEntityType) || "both",
		startsAt: String(row.startsAt || ""),
		endsAt: String(row.endsAt || ""),
	};
}

export function isDelegationActive(
	delegation: ApprovalDelegation,
	now = new Date(),
	entityType?: "contract" | "license",
): boolean {
	if (
		entityType &&
		delegation.entityType !== "both" &&
		delegation.entityType !== entityType
	) {
		return false;
	}
	const start = new Date(delegation.startsAt).getTime();
	const end = new Date(delegation.endsAt).getTime();
	const t = now.getTime();
	return t >= start && t <= end;
}

export async function listDelegationsForUser(
	orgId: string,
	userId: string,
): Promise<ApprovalDelegation[]> {
	const collectionId = appwriteConfig.approvalDelegationsCollectionId;
	if (!collectionId) return [];
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: collectionId,
			queries: [
				Query.equal("orgId", orgId),
				Query.equal("userId", userId),
				Query.limit(50),
			],
		});
		return (result.rows || []).map((row) =>
			rowToDelegation(row as Record<string, unknown>),
		);
	} catch {
		return [];
	}
}

export async function listActiveDelegations(
	orgId?: string,
	now = new Date(),
): Promise<ApprovalDelegation[]> {
	const collectionId = appwriteConfig.approvalDelegationsCollectionId;
	if (!collectionId) return [];
	try {
		const { tablesDB } = await createAdminClient();
		const queries = [Query.limit(200)];
		if (orgId) queries.unshift(Query.equal("orgId", orgId));
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: collectionId,
			queries,
		});
		return (result.rows || [])
			.map((row) => rowToDelegation(row as Record<string, unknown>))
			.filter((row) => isDelegationActive(row, now));
	} catch {
		return [];
	}
}

export function applyDelegationsToAssignees(
	assigneeUserIds: string[],
	delegations: ApprovalDelegation[],
	entityType: "contract" | "license",
	now = new Date(),
): string[] {
	const extra: string[] = [];
	for (const assignee of assigneeUserIds) {
		for (const delegation of delegations) {
			if (
				delegation.userId === assignee &&
				isDelegationActive(delegation, now, entityType)
			) {
				extra.push(delegation.delegateUserId);
			}
		}
	}
	return [...new Set([...assigneeUserIds, ...extra])];
}

export async function createDelegation(
	data: ApprovalDelegationInput,
): Promise<ApprovalDelegation> {
	const { tablesDB } = await createAdminClient();
	const row = await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "create",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.approvalDelegationsCollectionId,
		rowId: ID.unique(),
		data: {
			orgId: data.orgId,
			userId: data.userId,
			delegateUserId: data.delegateUserId,
			entityType: data.entityType || "both",
			startsAt: data.startsAt,
			endsAt: data.endsAt,
		},
	});
	return rowToDelegation(row as Record<string, unknown>);
}

export async function deleteDelegation(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.approvalDelegationsCollectionId,
		rowId: id,
	});
}
