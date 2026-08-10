import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.IT.MANAGE_DATABASE,
	});
	if (permissionCheck) {
		return permissionCheck;
	}

	return NextResponse.json({
		databaseId: appwriteConfig.databaseId,
	});
}
