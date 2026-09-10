import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import type { EsignResourceType } from "./types";

export type EsignResource = {
	id: string;
	orgId: string;
	title: string;
	status: string;
	documentFileId: string;
	digitalSignatureRequired: boolean;
	ownerUserId?: string;
	ownerEmail?: string;
};

function truthyRequired(value: unknown): boolean {
	return value === true || value === "true" || value === 1 || value === "1";
}

async function loadEnterpriseFlag(contractId: string): Promise<boolean> {
	const tableId = appwriteConfig.contractsEnterpriseMetadataCollectionId;
	if (!tableId || !appwriteConfig.databaseId) return false;
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId,
			queries: [Query.equal("contractId", contractId), Query.limit(1)],
		});
		const row = result.rows?.[0] as Record<string, unknown> | undefined;
		return truthyRequired(row?.digitalSignatureRequired);
	} catch {
		return false;
	}
}

/**
 * Mirror signature detail fields onto Contracts enterprise metadata when present.
 * Source of truth for envelope linkage stays on signature_envelopes; this is UI/cache.
 */
async function upsertContractEnterpriseSignatureFields(
	contractId: string,
	orgId: string | undefined,
	fields: Record<string, unknown>,
): Promise<void> {
	const tableId =
		appwriteConfig.contractsEnterpriseMetadataCollectionId ||
		appwriteConfig.contractExtensionsCollectionId;
	if (!tableId || !appwriteConfig.databaseId) return;
	if (Object.keys(fields).length === 0) return;

	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId,
			queries: [Query.equal("contractId", contractId), Query.limit(1)],
		});
		const existing = result.rows?.[0] as { $id?: string } | undefined;

		if (existing?.$id) {
			await writeRowWithSchemaDriftRecovery({
				tablesDB,
				mode: "update",
				databaseId: appwriteConfig.databaseId,
				tableId,
				rowId: existing.$id,
				data: fields,
			});
			return;
		}

		await writeRowWithSchemaDriftRecovery({
			tablesDB,
			mode: "create",
			databaseId: appwriteConfig.databaseId,
			tableId,
			rowId: ID.unique(),
			data: {
				contractId,
				...(orgId ? { orgId } : {}),
				...fields,
			},
		});
	} catch (error) {
		console.warn(
			"[esign] enterprise signature metadata write skipped:",
			error instanceof Error ? error.message : error,
		);
	}
}

export async function loadEsignResource(
	resourceType: EsignResourceType,
	resourceId: string,
): Promise<EsignResource | null> {
	const { tablesDB } = await createAdminClient();
	const tableId =
		resourceType === "license"
			? appwriteConfig.licensesCollectionId
			: appwriteConfig.contractsCollectionId;
	if (!tableId || !appwriteConfig.databaseId) return null;

	try {
		const row = (await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId,
			rowId: resourceId,
		})) as Record<string, unknown> & { $id: string };

		const requiredOnRow = truthyRequired(row.digitalSignatureRequired);
		const required =
			resourceType === "contract"
				? requiredOnRow || (await loadEnterpriseFlag(resourceId))
				: requiredOnRow;

		const documentFileId = String(
			row.bucketFileId || row.fileId || row.fileRef || "",
		);

		return {
			id: row.$id,
			orgId: String(row.orgId || ""),
			title: String(
				row.contractName || row.licenseName || row.name || "Untitled",
			),
			status: String(row.status || ""),
			documentFileId,
			digitalSignatureRequired: required,
			ownerUserId: String(
				row.contractOwnerId || row.licenseOwnerId || row.owner || "",
			),
			ownerEmail: row.ownerEmail ? String(row.ownerEmail) : undefined,
		};
	} catch {
		return null;
	}
}

export async function updateResourceSignatureState(input: {
	resourceType: EsignResourceType;
	resourceId: string;
	status?: string;
	digitalSignatureStatus?: string;
	digitalSignatureEnvelopeId?: string;
	digitalSignatureCompletedAt?: string;
	digitalSignaturePlatform?: string;
}): Promise<void> {
	const { tablesDB } = await createAdminClient();
	const tableId =
		input.resourceType === "license"
			? appwriteConfig.licensesCollectionId
			: appwriteConfig.contractsCollectionId;
	if (!tableId || !appwriteConfig.databaseId) return;

	const signatureFields: Record<string, unknown> = {};
	if (input.digitalSignatureStatus !== undefined) {
		signatureFields.digitalSignatureStatus = input.digitalSignatureStatus;
	}
	if (input.digitalSignatureEnvelopeId !== undefined) {
		signatureFields.digitalSignatureEnvelopeId =
			input.digitalSignatureEnvelopeId;
	}
	if (input.digitalSignatureCompletedAt !== undefined) {
		signatureFields.digitalSignatureCompletedAt =
			input.digitalSignatureCompletedAt;
	}
	if (input.digitalSignaturePlatform !== undefined) {
		signatureFields.digitalSignaturePlatform = input.digitalSignaturePlatform;
	}

	const data: Record<string, unknown> = { ...signatureFields };
	if (input.status !== undefined) data.status = input.status;

	if (Object.keys(data).length === 0) return;

	// Drift recovery drops columns that are not on the resource table yet.
	try {
		await writeRowWithSchemaDriftRecovery({
			tablesDB,
			mode: "update",
			databaseId: appwriteConfig.databaseId,
			tableId,
			rowId: input.resourceId,
			data,
		});
	} catch (error) {
		// Status is the only field that must land on the resource row when present.
		if (input.status !== undefined) {
			await writeRowWithSchemaDriftRecovery({
				tablesDB,
				mode: "update",
				databaseId: appwriteConfig.databaseId,
				tableId,
				rowId: input.resourceId,
				data: { status: input.status },
			});
		} else {
			console.warn(
				"[esign] resource signature fields not writable on primary table:",
				error instanceof Error ? error.message : error,
			);
		}
	}

	// Contracts: also mirror detail fields onto enterprise metadata (columns exist there).
	if (input.resourceType === "contract" && Object.keys(signatureFields).length) {
		let orgId: string | undefined;
		try {
			const row = (await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId,
				tableId,
				rowId: input.resourceId,
			})) as { orgId?: string };
			orgId = row.orgId;
		} catch {
			orgId = undefined;
		}
		await upsertContractEnterpriseSignatureFields(
			input.resourceId,
			orgId,
			signatureFields,
		);
	}
}
