import { Query } from "node-appwrite";
import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { onlySoftDeletedQuery } from "@/lib/soft-delete";
import type { UIFileDoc } from "@/types/files";

/**
 * List soft-deleted contracts for the Removed tab.
 * Permission: contracts.edit or contracts.approve (same as delete UX).
 */
export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.EDIT, PERMISSIONS.CONTRACTS.APPROVE],
		requireOrg: true,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg?.orgId) {
			return NextResponse.json(
				{ error: "No organization on this account" },
				{ status: 400 },
			);
		}

		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			queries: [
				Query.equal("orgId", defaultOrg.orgId),
				onlySoftDeletedQuery("contracts"),
				Query.orderDesc("$updatedAt"),
				Query.limit(200),
			],
		});

		const files: UIFileDoc[] = result.rows.map((row) => {
			const r = row as unknown as Record<string, unknown>;
			const name =
				String(r.contractName || r.name || "Untitled contract");
			return {
				$id: String(r.$id),
				$createdAt: String(r.$createdAt || ""),
				$updatedAt: String(r.$updatedAt || ""),
				$type: "documents",
				$typeId: "documents",
				$permissions: [],
				$typeSequence: 0,
				$sequence: 0,
				$typeDatabaseId: "",
				$typeCollectionId: "",
				type: "document",
				extension: "pdf",
				url: "",
				name,
				size: 0,
				owner: "unknown",
				users: [],
				contractId: String(r.$id),
				contractName: name,
				contractOwnerId: (r.contractOwnerId as string) || undefined,
				contractExpiryDate: (r.contractExpiryDate as string) || undefined,
				status: (r.status as UIFileDoc["status"]) || "inactive",
				contractType: (r.contractType as string) || undefined,
				amount: r.amount == null ? undefined : Number(r.amount),
				vendor: (r.vendor as string) || undefined,
				contractNumber: (r.contractNumber as string) || undefined,
				department: (r.department as string) || undefined,
				division: (r.division as string) || undefined,
				assignedManagers: Array.isArray(r.assignedManagers)
					? (r.assignedManagers as string[])
					: undefined,
				deletedAt: (r.deletedAt as string) || null,
				deletedBy: (r.deletedBy as string) || null,
			} as UIFileDoc;
		});

		return NextResponse.json({
			success: true,
			data: { files },
		});
	} catch (error) {
		console.error("[SERVER] contracts/removed GET:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to load removed contracts",
			},
			{ status: 500 },
		);
	}
}
