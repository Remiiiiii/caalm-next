import { appwriteConfig } from "@/lib/appwrite/config";
import { demoRowId } from "./constants";
import {
	createRowIfMissing,
	isoDateOffset,
	tableHasColumns,
} from "./helpers";
import type { SeededTeamUser } from "./seed-team-users";

/**
 * Seed Reports and Audit Logs when those tables have columns.
 */
export async function seedDemoAnalytics({
	orgId,
	ownerUserId,
	ownerName,
	ownerEmail,
	team,
}: {
	orgId: string;
	ownerUserId: string;
	ownerName: string;
	ownerEmail: string;
	team: SeededTeamUser[];
}): Promise<void> {
	const reportsTable = appwriteConfig.reportsCollectionId;
	const auditTable = appwriteConfig.auditLogsCollectionId;

	if (reportsTable && (await tableHasColumns(reportsTable))) {
		const reports = [
			{
				suffix: "rptops",
				title: "Operations Compliance Report",
				division: "operations",
				department: "Operations",
			},
			{
				suffix: "rptadm",
				title: "Administration Overview Report",
				division: "administration",
				department: "Administration",
			},
			{
				suffix: "rptfin",
				title: "Finance License Cost Report",
				division: "finance",
				department: "Finance",
			},
			{
				suffix: "rptall",
				title: "All Departments Report",
				division: "all",
				department: "all",
			},
		];

		for (const report of reports) {
			await createRowIfMissing(
				reportsTable,
				demoRowId(orgId, report.suffix),
				{
					title: report.title,
					status: "completed",
					content: `<h2>${report.title}</h2><p>Demo sandbox report for ${report.department}. Generated for walkthrough of Reports & Analytics.</p>`,
					userId: ownerUserId,
					userName: ownerName,
					userRole: "Organization Admin",
					division: report.division,
					generatedAt: new Date().toISOString(),
					contractsCount: 8,
					usersCount: 7,
					eventsCount: 5,
					filesCount: 4,
					orgId,
					reportData: JSON.stringify({
						department: report.department,
						metrics: {
							contracts: 8,
							users: 7,
							events: 5,
							files: 4,
						},
						generatedBy: ownerName,
						generatedRole: "Organization Admin",
						demo: true,
					}),
				},
				`report:${report.suffix}`,
			);
		}
	}

	if (auditTable && (await tableHasColumns(auditTable))) {
		const actors = [
			{
				id: ownerUserId,
				name: ownerName,
				email: ownerEmail,
			},
			...team.slice(0, 4).map((t) => ({
				id: t.userId,
				name: t.fullName,
				email: t.email,
			})),
		];

		const events = [
			{
				suffix: "aud01",
				module: "contracts",
				action: "create",
				title: "Contract created",
				summary: "Seeded grant agreement added to sandbox",
			},
			{
				suffix: "aud02",
				module: "contracts",
				action: "update",
				title: "Contract updated",
				summary: "CloudMail subscription marked pending review",
			},
			{
				suffix: "aud03",
				module: "licenses",
				action: "create",
				title: "License created",
				summary: "Residential license uploaded with sample PDF",
			},
			{
				suffix: "aud04",
				module: "licenses",
				action: "update",
				title: "License status changed",
				summary: "Clinical practice permit flagged at-risk",
			},
			{
				suffix: "aud05",
				module: "users",
				action: "create",
				title: "Team member added",
				summary: "Demo team personas provisioned",
			},
			{
				suffix: "aud06",
				module: "calendar",
				action: "create",
				title: "Calendar event created",
				summary: "Quarterly compliance review scheduled",
			},
			{
				suffix: "aud07",
				module: "calendar",
				action: "update",
				title: "Calendar approval requested",
				summary: "Contract renewal workshop awaiting approval",
			},
			{
				suffix: "aud08",
				module: "governance",
				action: "update",
				title: "Role assigned",
				summary: "Department Manager role granted to Alex Rivera",
			},
			{
				suffix: "aud09",
				module: "system",
				action: "export",
				title: "Report exported",
				summary: "Operations compliance report completed",
			},
			{
				suffix: "aud10",
				module: "contracts",
				action: "delete",
				title: "Draft discarded",
				summary: "Stale contract draft cleaned up",
			},
		];

		for (let i = 0; i < events.length; i++) {
			const ev = events[i];
			const actor = actors[i % actors.length];
			await createRowIfMissing(
				auditTable,
				demoRowId(orgId, ev.suffix),
				{
					event_id: `demo-${ev.suffix}-${isoDateOffset(-i)}`,
					event_title: ev.title,
					action: ev.action,
					source: "caalm",
					user_id: actor.id,
					user_name: actor.name,
					user_email: actor.email,
					orgId,
					status: "success",
					module: ev.module,
					summary: ev.summary,
					metadata: JSON.stringify({ demo: true, seededAt: new Date().toISOString() }),
				},
				`audit:${ev.suffix}`,
			);
		}
	}
}
