import { type NextRequest, NextResponse } from "next/server";
import * as sdk from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logSecurityAudit } from "@/lib/auth/security-audit";
import { requireStepUpForSession } from "@/lib/auth/step-up";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

/**
 * POST /api/admin/users/[userId]/revoke-sessions
 * Deletes all Auth sessions for the target user.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.EDIT,
		});
		if (permissionCheck) return permissionCheck;

		const stepUpCheck = await requireStepUpForSession(request);
		if (stepUpCheck) return stepUpCheck;

		const actor = await getCurrentUser();
		if (!actor) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const { userId } = await params;
		if (!userId) {
			return NextResponse.json({ error: "Missing userId" }, { status: 400 });
		}

		const { tablesDB } = await createAdminClient();
		const userDoc = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: userId,
		});

		const accountId = String(
			(userDoc as { accountId?: string }).accountId || "",
		);
		if (!accountId) {
			return NextResponse.json(
				{ error: "User account is incomplete" },
				{ status: 400 },
			);
		}

		const client = new sdk.Client()
			.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
			.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
			.setKey(process.env.NEXT_APPWRITE_API_KEY!);
		const users = new sdk.Users(client);

		await users.deleteSessions(accountId);

		const defaultOrg = await getUserDefaultOrganization(actor.$id);
		const target = userDoc as {
			fullName?: string;
			email?: string;
			orgId?: string;
		};
		await logSecurityAudit({
			kind: "session_revoke",
			actor: {
				$id: actor.$id,
				fullName: actor.fullName,
				email: actor.email,
			},
			target: {
				$id: userId,
				fullName: target.fullName,
				email: target.email,
				orgId: target.orgId,
			},
			orgId: defaultOrg?.orgId || target.orgId,
			request,
		});

		return NextResponse.json({
			success: true,
			message: "All active sessions revoked",
		});
	} catch (error) {
		console.error("Revoke sessions failed:", error);
		return NextResponse.json(
			{
				error: (error as Error).message || "Failed to revoke sessions",
			},
			{ status: 500 },
		);
	}
}
