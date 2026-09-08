import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import {
	generateNegotiationToken,
	hashNegotiationToken,
	isAccessValid,
	normalizeInvitees,
	parseInviteesJson,
	serializeInvitees,
	type NegotiationInvitee,
} from "./access.logic";
import { accessTable, dbId, Query } from "./contract-scope";

export type { NegotiationInvitee };
export { flattenActiveInvitees } from "./access.logic";

export interface NegotiationAccess {
	$id: string;
	contractId: string;
	orgId: string;
	tokenHash: string;
	counterpartyEmail: string;
	/** Display name for the primary invitee (first in invitees). */
	counterpartyName: string;
	/** Everyone who can use this shared link. */
	invitees: NegotiationInvitee[];
	expiresAt: string;
	revokedAt: string;
	createdBy: string;
	$createdAt: string;
}

function mapAccess(row: Record<string, unknown>): NegotiationAccess {
	const counterpartyEmail = String(row.counterpartyEmail || "");
	const counterpartyName = String(row.counterpartyName || "").trim();
	const invitees = parseInviteesJson(
		row.inviteesJson,
		counterpartyEmail,
		counterpartyName,
	);
	const primary = invitees[0];
	return {
		$id: String(row.$id),
		contractId: String(row.contractId || ""),
		orgId: String(row.orgId || ""),
		tokenHash: String(row.tokenHash || ""),
		counterpartyEmail: primary?.email || counterpartyEmail,
		counterpartyName: primary?.name || counterpartyName,
		invitees,
		expiresAt: String(row.expiresAt || ""),
		revokedAt: String(row.revokedAt || ""),
		createdBy: String(row.createdBy || ""),
		$createdAt: String(row.$createdAt || ""),
	};
}

export async function listAccess(contractId: string): Promise<NegotiationAccess[]> {
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: accessTable(),
		queries: [
			Query.equal("contractId", contractId),
			Query.orderDesc("$createdAt"),
			Query.limit(50),
		],
	});
	return response.rows.map((row) =>
		mapAccess(row as unknown as Record<string, unknown>),
	);
}

export async function createAccess(input: {
	contractId: string;
	orgId: string;
	/** Preferred: every email with its own full name. */
	invitees?: Array<{ email: string; name: string }>;
	/** Legacy single-invitee fields (still accepted). */
	counterpartyEmail?: string;
	counterpartyName?: string;
	createdBy: string;
	expiresInDays?: number;
}): Promise<{ access: NegotiationAccess; token: string; urlPath: string }> {
	const invitees = normalizeInvitees(
		input.invitees && input.invitees.length > 0
			? input.invitees
			: [
					{
						email: input.counterpartyEmail || "",
						name: input.counterpartyName || "",
					},
				],
	);
	if (invitees.length === 0) {
		throw new Error("Add at least one invitee with email and full name");
	}
	const missingName = invitees.find((row) => !row.name.trim());
	if (missingName) {
		throw new Error(`Full name is required for ${missingName.email}`);
	}

	const primary = invitees[0];
	const token = generateNegotiationToken();
	const days = input.expiresInDays && input.expiresInDays > 0 ? input.expiresInDays : 14;
	const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
	const { tablesDB } = await createAdminClient();
	const baseData = {
		contractId: input.contractId,
		orgId: input.orgId,
		tokenHash: hashNegotiationToken(token),
		counterpartyEmail: primary.email,
		counterpartyName: primary.name,
		expiresAt,
		createdBy: input.createdBy,
	};
	let row: Record<string, unknown>;
	try {
		row = (await tablesDB.createRow({
			databaseId: dbId(),
			tableId: accessTable(),
			rowId: ID.unique(),
			data: {
				...baseData,
				inviteesJson: serializeInvitees(invitees),
			},
		})) as unknown as Record<string, unknown>;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// Older schemas may not have inviteesJson yet — still create the link.
		if (/inviteesJson|Unknown attribute|Invalid document structure/i.test(message)) {
			row = (await tablesDB.createRow({
				databaseId: dbId(),
				tableId: accessTable(),
				rowId: ID.unique(),
				data: baseData,
			})) as unknown as Record<string, unknown>;
		} else {
			throw error;
		}
	}
	return {
		access: mapAccess(row),
		token,
		urlPath: `/negotiate/${token}`,
	};
}

export async function revokeAccess(accessId: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: accessTable(),
		rowId: accessId,
		data: { revokedAt: new Date().toISOString() },
	});
}

export async function resolveAccessByToken(
	token: string,
): Promise<NegotiationAccess | null> {
	const hash = hashNegotiationToken(token);
	const { tablesDB } = await createAdminClient();
	const response = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: accessTable(),
		queries: [Query.equal("tokenHash", hash), Query.limit(1)],
	});
	const row = response.rows[0];
	if (!row) return null;
	const access = mapAccess(row as unknown as Record<string, unknown>);
	if (!isAccessValid(access)) return null;
	return access;
}
