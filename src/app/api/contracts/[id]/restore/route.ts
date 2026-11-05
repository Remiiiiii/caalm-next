import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { clearSoftDeleteFields } from "@/lib/soft-delete";

/**
 * Soft-restore a contract (clears deletedAt / deletedBy).
 * Permission: contracts.edit (same gate as delete UX via EDIT/APPROVE).
 * Callers who may delete via APPROVE also need EDIT or we accept either.
 */
export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
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

		const { id } = await context.params;
		if (!id) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const { tablesDB } = await createAdminClient();
		let row: Record<string, unknown>;
		try {
			row = (await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.contractsCollectionId!,
				rowId: id,
			})) as unknown as Record<string, unknown>;
		} catch {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		if (String(row.orgId || "") !== defaultOrg.orgId) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		if (!row.deletedAt) {
			return NextResponse.json(
				{ error: "This contract is already active" },
				{ status: 409 },
			);
		}

		await writeRowWithSchemaDriftRecovery({
			tablesDB,
			mode: "update",
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			rowId: id,
			data: clearSoftDeleteFields(),
		});

		const label =
			(row.contractName as string) ||
			(row.name as string) ||
			id;
		const userName =
			(user as { fullName?: string }).fullName || user.email || "unknown";

		await logAuditEvent({
			event_id: `contract_restore_${id}`,
			event_title: `Contract restored: ${label}`,
			action: "restore",
			source: "caalm",
			user_id: user.$id,
			user_name: userName,
			user_email: user.email || "",
			orgId: defaultOrg.orgId,
			status: "success",
			module: "contracts",
			target_type: "contract",
			target_id: id,
			target_label: label,
			summary: `${userName} restored contract ${label}`,
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[SERVER] contracts/[id]/restore POST:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to restore contract",
			},
			{ status: 500 },
		);
	}
}
