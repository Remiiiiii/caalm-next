import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	UNRESTRICTED_DESIGNATION_LABEL,
	UNRESTRICTED_FUND_CODE,
} from "./constants";
import type { GiftDesignation } from "./types";

function tableId(): string {
	return (
		appwriteConfig.giftDesignationsCollectionId || "69d91401001f4e8c2b04"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): GiftDesignation {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		label: String(row.label || ""),
		fundCode: String(row.fundCode || UNRESTRICTED_FUND_CODE),
		active: row.active !== false,
	};
}

export class DesignationDomainError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

export async function listDesignationsForOrg(
	orgId: string,
): Promise<GiftDesignation[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("active", true),
			Query.limit(200),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getDesignationById(
	id: string,
	orgId: string,
): Promise<GiftDesignation | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: id,
		});
		const designation = mapRow(row as unknown as Record<string, unknown>);
		if (designation.orgId !== orgId) return null;
		return designation;
	} catch {
		return null;
	}
}

export async function resolveFundForGift(
	orgId: string,
	designationId?: string,
): Promise<{ fundCode: string; designationLabel: string }> {
	if (!designationId) {
		return {
			fundCode: UNRESTRICTED_FUND_CODE,
			designationLabel: UNRESTRICTED_DESIGNATION_LABEL,
		};
	}
	const designation = await getDesignationById(designationId, orgId);
	if (!designation) {
		throw new DesignationDomainError("Designation not found", 404);
	}
	return {
		fundCode: designation.fundCode,
		designationLabel: designation.label,
	};
}

export async function createDesignation(input: {
	orgId: string;
	label: string;
	fundCode: string;
}): Promise<GiftDesignation> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			label: input.label.trim(),
			fundCode: input.fundCode.trim().toUpperCase(),
			active: true,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
