import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.IT.MANAGE_DATABASE,
		});
		if (permissionCheck) return permissionCheck;

		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listTables({
			databaseId: appwriteConfig.databaseId!,
		});

		const tables = result.tables.map((t) => ({
			id: t.$id,
			name: t.name,
			enabled: t.enabled,
			columns: (t.columns || []).length,
		}));

		return NextResponse.json({
			success: true,
			data: { tables, total: result.total },
		});
	} catch (error) {
		console.error("IT schema list error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to list tables",
			},
			{ status: 500 },
		);
	}
}
