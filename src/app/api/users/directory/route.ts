import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

export type ShareDirectoryUser = {
	$id: string;
	fullName: string;
	email: string;
	department: string;
};

/**
 * Lightweight org user directory for Share pickers.
 * Requires contracts.view or users.view (anyone who can share files).
 */
export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: [PERMISSIONS.CONTRACTS.VIEW, PERMISSIONS.USERS.VIEW],
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const orgId = getOrgIdFromRequest(request);
		const { tablesDB } = await createAdminClient();
		const databaseId = appwriteConfig.databaseId || "default-db";
		const usersTableId = appwriteConfig.usersCollectionId || "users";

		const queries = [Query.limit(500), Query.orderAsc("fullName")];
		if (orgId) {
			queries.unshift(Query.equal("orgId", orgId));
		}

		let rows: Array<Record<string, unknown>> = [];
		try {
			const result = await tablesDB.listRows({
				databaseId,
				tableId: usersTableId,
				queries,
			});
			rows = result.rows as Array<Record<string, unknown>>;
		} catch {
			// orgId attribute may be missing on some environments — fall back to all users
			const result = await tablesDB.listRows({
				databaseId,
				tableId: usersTableId,
				queries: [Query.limit(500), Query.orderAsc("fullName")],
			});
			rows = result.rows as Array<Record<string, unknown>>;
		}

		const users: ShareDirectoryUser[] = rows
			.map((user) => {
				const email = String(user.email || "").trim();
				const status = String(user.status || "active").toLowerCase();
				if (!email || status === "inactive" || status === "suspended") {
					return null;
				}
				return {
					$id: String(user.$id || ""),
					fullName: String(user.fullName || "Unknown").trim() || "Unknown",
					email,
					department:
						String(user.department || user.division || "Other").trim() ||
						"Other",
				};
			})
			.filter((u): u is ShareDirectoryUser => Boolean(u?.$id && u.email));

		return NextResponse.json(users);
	} catch (error) {
		console.error("Error fetching share directory:", error);
		return NextResponse.json(
			{ error: "Failed to load users" },
			{ status: 500 },
		);
	}
}
