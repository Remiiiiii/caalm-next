/**
 * Purge orgs whose tenant-deletion grace period has elapsed.
 * Protected by CRON_SECRET.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	listOrgsPendingTenantDeletion,
	purgeTenantOrganization,
} from "@/lib/portability/tenant-deletion.service";
import { logAuditEvent } from "@/lib/services/audit-logger";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const pending = await listOrgsPendingTenantDeletion();
		const results = {
			scanned: pending.length,
			purged: [] as string[],
			errors: [] as string[],
		};

		for (const item of pending) {
			try {
				const purge = await purgeTenantOrganization(item.orgId);

				await logAuditEvent({
					event_id: `org_deletion_complete_${item.orgId}_${Date.now()}`,
					event_title: `Tenant deleted after grace period: ${item.orgId}`,
					action: "delete",
					source: "caalm",
					user_id: "system",
					user_name: "tenant-deletion-cron",
					user_email: "",
					status: purge.organizationDeleted ? "success" : "failed",
					orgId: item.orgId,
					module: "system",
					target_type: "organization",
					target_id: item.orgId,
					summary: `Org-scoped data purged after grace period (scheduled ${item.scheduledAt})`,
					metadata: {
						scheduledAt: item.scheduledAt,
						organizationDeleted: purge.organizationDeleted,
						deletedTables: purge.deletedTables.map((row) => ({
							tableId: row.tableId,
							deleted: row.deleted,
							error: row.error,
						})),
					},
				}).catch(() => undefined);

				if (purge.organizationDeleted) {
					results.purged.push(item.orgId);
				} else {
					results.errors.push(`${item.orgId}: organization row not deleted`);
				}
			} catch (error) {
				results.errors.push(
					`${item.orgId}: ${error instanceof Error ? error.message : "unknown"}`,
				);
			}
		}

		return NextResponse.json({ success: true, ...results });
	} catch (error) {
		console.error("[cron/tenant-deletion] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Tenant deletion failed",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	return GET(request);
}
