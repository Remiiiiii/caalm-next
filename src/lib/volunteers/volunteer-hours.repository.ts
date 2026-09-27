import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	VolunteerHourApprovalStatus,
	VolunteerHourLog,
	VolunteerHourSource,
} from "./types";

function tableId(): string {
	return (
		appwriteConfig.volunteerHoursCollectionId || "69f0b801001f4e8c2b27"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): VolunteerHourLog {
	const source =
		row.source === "self" || row.source === "proxy" ? row.source : "proxy";
	const approvalStatus =
		row.approvalStatus === "approved" || row.approvalStatus === "pending"
			? row.approvalStatus
			: "pending";
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		eventId: String(row.eventId || ""),
		volunteerConstituentId: String(row.volunteerConstituentId || ""),
		actorUserId: String(row.actorUserId || ""),
		source,
		minutesWorked: Number(row.minutesWorked ?? 0),
		approvalStatus,
		approvedByUserId: row.approvedByUserId
			? String(row.approvedByUserId)
			: undefined,
		approvedAt: row.approvedAt ? String(row.approvedAt) : undefined,
		grantContractId: row.grantContractId
			? String(row.grantContractId)
			: undefined,
		roleLabel: row.roleLabel ? String(row.roleLabel) : undefined,
		workedAt: String(row.workedAt || ""),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
	};
}

export async function listHoursForShift(
	orgId: string,
	eventId: string,
): Promise<VolunteerHourLog[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("eventId", eventId),
			Query.limit(500),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function listHoursForGrant(
	orgId: string,
	grantContractId: string,
): Promise<VolunteerHourLog[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("grantContractId", grantContractId),
			Query.limit(500),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function listApprovedHoursForVolunteer(
	orgId: string,
	volunteerConstituentId: string,
	fromIso?: string,
	toIso?: string,
): Promise<VolunteerHourLog[]> {
	const { tablesDB } = await createAdminClient();
	const queries = [
		Query.equal("orgId", orgId),
		Query.equal("volunteerConstituentId", volunteerConstituentId),
		Query.equal("approvalStatus", "approved"),
		Query.limit(500),
	];
	if (fromIso) queries.push(Query.greaterThanEqual("workedAt", fromIso));
	if (toIso) queries.push(Query.lessThanEqual("workedAt", toIso));

	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries,
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export function sumApprovedMinutes(logs: VolunteerHourLog[]): number {
	return logs
		.filter((row) => row.approvalStatus === "approved")
		.reduce((sum, row) => sum + row.minutesWorked, 0);
}

export async function createVolunteerHourLog(input: {
	orgId: string;
	eventId: string;
	volunteerConstituentId: string;
	actorUserId: string;
	source: VolunteerHourSource;
	minutesWorked: number;
	workedAt: string;
	roleLabel?: string;
}): Promise<VolunteerHourLog> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			eventId: input.eventId,
			volunteerConstituentId: input.volunteerConstituentId,
			actorUserId: input.actorUserId,
			source: input.source,
			minutesWorked: input.minutesWorked,
			approvalStatus: "pending" as VolunteerHourApprovalStatus,
			workedAt: input.workedAt,
			roleLabel: input.roleLabel,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function approveVolunteerHourLog(input: {
	orgId: string;
	hourId: string;
	approvedByUserId: string;
	grantContractId?: string;
}): Promise<VolunteerHourLog | null> {
	const { tablesDB } = await createAdminClient();
	let existing: Record<string, unknown>;
	try {
		existing = (await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: input.hourId,
		})) as Record<string, unknown>;
	} catch {
		return null;
	}
	if (String(existing.orgId || "") !== input.orgId) return null;

	const patch: Record<string, unknown> = {
		approvalStatus: "approved",
		approvedByUserId: input.approvedByUserId,
		approvedAt: new Date().toISOString(),
	};
	if (input.grantContractId) patch.grantContractId = input.grantContractId;

	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: input.hourId,
		data: patch,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function getVolunteerHourById(
	orgId: string,
	hourId: string,
): Promise<VolunteerHourLog | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = (await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: hourId,
		})) as Record<string, unknown>;
		if (String(row.orgId || "") !== orgId) return null;
		return mapRow(row);
	} catch {
		return null;
	}
}
