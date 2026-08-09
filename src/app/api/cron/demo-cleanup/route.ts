/**
 * Expire and delete demo sandbox orgs past settings.expiresAt.
 * Also deletes Appwrite Auth users with @caalm.demo emails older than DEMO_ORG_TTL_DAYS.
 * Protected by CRON_SECRET. Only meaningful when APP_MODE=demo.
 */

import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getDemoOrgTtlDays, isDemoMode } from "@/lib/config/demo-mode";

const DEMO_AUTH_EMAIL_SUFFIX = "@caalm.demo";

const ORG_SCOPED_TABLES = [
	appwriteConfig.contractsCollectionId,
	appwriteConfig.licensesCollectionId,
	appwriteConfig.calendarEventsCollectionId,
	appwriteConfig.calendarApprovalRequestsCollectionId,
	appwriteConfig.newsArticlesCollectionId,
	appwriteConfig.notesCollectionId,
	appwriteConfig.notificationsCollectionId,
	appwriteConfig.recentActivityCollectionId,
	appwriteConfig.filesCollectionId,
	appwriteConfig.reportsCollectionId,
	appwriteConfig.auditLogsCollectionId,
	appwriteConfig.tasksCollectionId,
	appwriteConfig.contractDraftsCollectionId,
	appwriteConfig.licenseDraftsCollectionId,
	appwriteConfig.invitationsCollectionId,
	appwriteConfig.calendarResourcesCollectionId,
	appwriteConfig.resourceBookingsCollectionId,
	appwriteConfig.contractExtensionsCollectionId,
].filter(Boolean) as string[];

function parseSettings(raw: unknown): Record<string, unknown> {
	if (typeof raw === "string") {
		try {
			return JSON.parse(raw) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	if (raw && typeof raw === "object") {
		return raw as Record<string, unknown>;
	}
	return {};
}

async function deleteRowsByOrg(
	tableId: string,
	orgId: string,
): Promise<number> {
	const { tablesDB } = await createAdminClient();
	let deleted = 0;
	let hasMore = true;

	while (hasMore) {
		const batch = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId,
			queries: [Query.equal("orgId", orgId), Query.limit(50)],
		});

		if (batch.rows.length === 0) {
			hasMore = false;
			break;
		}

		for (const row of batch.rows) {
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId,
				rowId: row.$id,
			});
			deleted += 1;
		}

		if (batch.rows.length < 50) {
			hasMore = false;
		}
	}

	return deleted;
}

async function deleteExpiredDemoAuthUsers(): Promise<{
	scanned: number;
	deleted: string[];
	errors: string[];
}> {
	const { Client, Users } = await import("node-appwrite");
	const client = new Client()
		.setEndpoint(appwriteConfig.endpointUrl)
		.setProject(appwriteConfig.projectId)
		.setKey(appwriteConfig.secretKey);
	const users = new Users(client);

	const cutoff = Date.now() - getDemoOrgTtlDays() * 24 * 60 * 60 * 1000;
	const deleted: string[] = [];
	const errors: string[] = [];
	let scanned = 0;
	let cursor: string | undefined;

	for (;;) {
		const queries = [Query.limit(100)];
		if (cursor) queries.push(Query.cursorAfter(cursor));

		const page = await users.list({ queries });
		if (!page.users.length) break;

		for (const user of page.users) {
			scanned += 1;
			cursor = user.$id;
			const email = (user.email || "").toLowerCase();
			if (!email.endsWith(DEMO_AUTH_EMAIL_SUFFIX)) continue;

			const createdAt = Date.parse(user.$createdAt);
			if (!Number.isFinite(createdAt) || createdAt > cutoff) continue;

			try {
				await users.delete(user.$id);
				deleted.push(user.$id);
			} catch (error) {
				errors.push(
					`${user.$id}: ${error instanceof Error ? error.message : "unknown"}`,
				);
			}
		}

		if (page.users.length < 100) break;
	}

	return { scanned, deleted, errors };
}

export async function GET(request: NextRequest) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!isDemoMode()) {
		return NextResponse.json({
			success: true,
			skipped: true,
			reason: "Not in demo mode",
		});
	}

	const { assertDemoNotUsingProdDatabase } = await import(
		"@/lib/config/demo-mode"
	);
	try {
		assertDemoNotUsingProdDatabase();
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unsafe demo config",
			},
			{ status: 500 },
		);
	}

	try {
		const { tablesDB } = await createAdminClient();
		const now = Date.now();
		const orgs = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "organizations",
			queries: [Query.limit(100)],
		});

		const results = {
			scanned: orgs.rows.length,
			expired: 0,
			deletedOrgs: [] as string[],
			deletedAuthUsers: [] as string[],
			authScanned: 0,
			errors: [] as string[],
		};

		for (const org of orgs.rows) {
			const settings = parseSettings(org.settings);
			if (settings.isDemo !== true) continue;

			const expiresAt = settings.expiresAt;
			if (typeof expiresAt !== "string" || Date.parse(expiresAt) > now) {
				continue;
			}

			results.expired += 1;
			const orgId = org.$id;

			try {
				for (const tableId of ORG_SCOPED_TABLES) {
					await deleteRowsByOrg(tableId, orgId);
				}

				// Shared calendars use organizationId (not orgId)
				if (appwriteConfig.sharedCalendarsCollectionId) {
					try {
						let hasMore = true;
						while (hasMore) {
							const batch = await tablesDB.listRows({
								databaseId: appwriteConfig.databaseId || "default-db",
								tableId: appwriteConfig.sharedCalendarsCollectionId,
								queries: [
									Query.equal("organizationId", orgId),
									Query.limit(50),
								],
							});
							if (batch.rows.length === 0) {
								hasMore = false;
								break;
							}
							for (const row of batch.rows) {
								await tablesDB.deleteRow({
									databaseId: appwriteConfig.databaseId || "default-db",
									tableId: appwriteConfig.sharedCalendarsCollectionId,
									rowId: row.$id,
								});
							}
							if (batch.rows.length < 50) hasMore = false;
						}
					} catch {
						// table may be empty / missing columns
					}
				}

				await deleteRowsByOrg("user_organizations", orgId);
				await deleteRowsByOrg("user_roles", orgId);

				// Demo team users (fictional) share orgId on users table
				await deleteRowsByOrg(
					appwriteConfig.usersCollectionId || "users",
					orgId,
				);

				await tablesDB.deleteRow({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: "organizations",
					rowId: orgId,
				});

				results.deletedOrgs.push(orgId);
			} catch (error) {
				results.errors.push(
					`${orgId}: ${error instanceof Error ? error.message : "unknown"}`,
				);
			}
		}

		const authCleanup = await deleteExpiredDemoAuthUsers();
		results.authScanned = authCleanup.scanned;
		results.deletedAuthUsers = authCleanup.deleted;
		results.errors.push(...authCleanup.errors);

		return NextResponse.json({ success: true, ...results });
	} catch (error) {
		console.error("[demo-cleanup] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Cleanup failed",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	return GET(request);
}
