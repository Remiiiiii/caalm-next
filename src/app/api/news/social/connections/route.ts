import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	deleteNewsFeed,
	listNewsFeeds,
} from "@/lib/database/news-feeds";
import {
	deleteNewsSocialConnection,
	listNewsSocialConnections,
} from "@/lib/database/news-social-connections";
import { logNewsAudit } from "@/lib/news/audit";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

async function resolveUserName(userId: string | null | undefined): Promise<string> {
	if (!userId) return "Unknown";
	try {
		const { tablesDB } = await createAdminClient();
		const user = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.usersCollectionId!,
			rowId: userId,
		});
		return (
			(user as { fullName?: string; email?: string }).fullName ||
			(user as { email?: string }).email ||
			"Unknown"
		);
	} catch {
		try {
			const { tablesDB } = await createAdminClient();
			const byAccount = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.usersCollectionId!,
				queries: [Query.equal("accountId", userId), Query.limit(1)],
			});
			const row = byAccount.rows[0] as
				| { fullName?: string; email?: string }
				| undefined;
			return row?.fullName || row?.email || "Unknown";
		} catch {
			return "Unknown";
		}
	}
}

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}

	const [connections, organization] = await Promise.all([
		listNewsSocialConnections(org.orgId),
		getOrganization(org.orgId),
	]);
	const orgName =
		(organization as { name?: string } | null)?.name?.trim() || "Organization";

	const enriched = await Promise.all(
		connections.map(async (connection) => {
			const connectedByName = await resolveUserName(connection.connectedBy);
			const accountLabel =
				connection.provider === "linkedin"
					? `${orgName} — Company page`
					: connection.externalAccountId
						? `@${connection.externalAccountId}`
						: `${orgName} — X account`;
			return {
				id: connection.$id,
				provider: connection.provider,
				accountLabel,
				connectedBy: connection.connectedBy,
				connectedByName,
				connectedAt: (connection as { $createdAt?: string }).$createdAt || null,
				expiresAt: connection.expiresAt || null,
				externalAccountId: connection.externalAccountId || null,
				pageId: connection.pageId || null,
			};
		}),
	);

	return NextResponse.json({ connections: enriched });
}

export async function DELETE(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}

	const provider = request.nextUrl.searchParams.get("provider");
	const id = request.nextUrl.searchParams.get("id");
	const connections = await listNewsSocialConnections(org.orgId);
	const target = connections.find(
		(row) => row.$id === id || (provider && row.provider === provider),
	);
	if (!target) {
		return NextResponse.json({ error: "Connection not found" }, { status: 404 });
	}

	const feeds = await listNewsFeeds(org.orgId);
	for (const feed of feeds) {
		if (feed.socialConnectionId === target.$id) {
			await deleteNewsFeed(feed.$id);
		}
	}
	await deleteNewsSocialConnection(target.$id);
	await logNewsAudit({
		action: "delete",
		eventId: `news_social_disconnect_${target.$id}`,
		eventTitle: `Disconnected ${target.provider}`,
		userId: user.$id,
		userName: user.fullName || user.email,
		userEmail: user.email,
		orgId: org.orgId,
		targetId: target.$id,
		targetLabel: target.provider,
		summary: `${user.fullName || user.email} disconnected ${target.provider}`,
	});
	return NextResponse.json({ success: true });
}
