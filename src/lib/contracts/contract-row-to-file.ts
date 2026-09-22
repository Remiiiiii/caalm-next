import type { UIFileDoc } from "@/types/files";

/** Appwrite Tables rows may nest fields under `data`. Flatten so list UIs read one shape. */
export function flattenTableRow<T extends Record<string, unknown>>(row: T): T {
	const nested = (row as { data?: unknown }).data;
	if (nested && typeof nested === "object") {
		return { ...row, ...(nested as Record<string, unknown>) };
	}
	return row;
}

export function contractRowToFileDoc(
	contract: Record<string, unknown>,
	fileData?: Record<string, unknown> | null,
): UIFileDoc {
	const row = flattenTableRow(contract);
	const file = fileData ? flattenTableRow(fileData) : undefined;

	return {
		$id: String(row.$id || ""),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		$permissions: (row.$permissions as string[]) || [],
		$collectionId: String(row.$collectionId || row.$tableId || ""),
		$databaseId: String(row.$databaseId || ""),
		$sequence: Number(row.$sequence || 0),
		name: String(row.contractName || row.name || "Untitled Contract"),
		type: "document",
		extension: String(file?.extension || "pdf"),
		url: String(file?.url || ""),
		size: Number(file?.size || 0),
		owner:
			(row.contractOwnerId as string) ||
			(row.owner as string) ||
			(file?.owner as string) ||
			"",
		users: (row.users as string[]) || (file?.users as string[]) || [],
		contractId: String(row.$id || ""),
		contractName: row.contractName as string | undefined,
		contractOwnerId: row.contractOwnerId as string | undefined,
		contractExpiryDate: row.contractExpiryDate as string | undefined,
		status: row.status as UIFileDoc["status"],
		lifecycleStatus: row.lifecycleStatus as string | undefined,
		contractType: row.contractType as string | undefined,
		amount: row.amount as number | undefined,
		vendor: row.vendor as string | undefined,
		contractNumber: row.contractNumber as string | undefined,
		priority: row.priority as string | undefined,
		compliance: row.compliance as string | undefined,
		department: row.department as string | undefined,
		division: (row.division as string | undefined) || undefined,
		assignedManagers: row.assignedManagers as string[] | undefined,
		description: row.description as string | undefined,
		riskLevel: row.riskLevel as string | undefined,
		bucketFileId: (file?.bucketFileId || row.bucketFileId) as
			| string
			| undefined,
		approvalWorkflowState: row.approvalWorkflowState as string | undefined,
		digitalSignatureStatus: row.digitalSignatureStatus as string | undefined,
		digitalSignatureEnvelopeId: row.digitalSignatureEnvelopeId as
			| string
			| undefined,
		deletedAt: (row.deletedAt as string | null | undefined) ?? null,
	};
}
