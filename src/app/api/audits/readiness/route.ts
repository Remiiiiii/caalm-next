import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { buildOrgReadinessSummary } from "@/lib/audits/readiness/build-summary";
import { getOrgAuditSettings } from "@/lib/audits/readiness/org-settings";
import { runReadinessAuditForOrg } from "@/lib/audits/readiness/run-audit";
import { nextScheduledReadinessRun } from "@/lib/audits/readiness/schedule";
import { RAG_THRESHOLDS } from "@/lib/audits/readiness/score";
import { crawlPublicSite } from "@/lib/audits/readiness/site-crawl";
import {
	listReadinessSnapshots,
	parseSnapshotPayload,
} from "@/lib/audits/readiness/snapshot.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.VIEW,
	});
	if (denied) return denied;

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
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const org = await getOrganization(defaultOrg.orgId);
	const auditSettings = org
		? getOrgAuditSettings(org)
		: { timezone: "America/New_York", websiteUrl: null };

	let siteCrawl = null;
	if (auditSettings.websiteUrl) {
		try {
			siteCrawl = await crawlPublicSite(auditSettings.websiteUrl);
		} catch {
			siteCrawl = null;
		}
	}

	const history = await listReadinessSnapshots({
		orgId: defaultOrg.orgId,
		limit: 12,
	});
	const historyScores = [...history]
		.reverse()
		.filter((row) => row.score !== null)
		.map((row, index) => ({
			label: `R${index + 1}`,
			value: row.score as number,
		}));

	const { summary, payloadBase } = await buildOrgReadinessSummary({
		orgId: defaultOrg.orgId,
		siteCrawl,
		historyScores,
	});

	// ?snapshotId= shows a saved snapshot (packet preview) instead of live data.
	const snapshotId = new URL(request.url).searchParams.get("snapshotId");
	let view = {
		summary: {
			...summary,
			readinessScore:
				payloadBase.sourcesUsed.length === 0 ? null : summary.readinessScore,
		},
		sourcesUsed: payloadBase.sourcesUsed,
		disclaimer: payloadBase.disclaimer,
		evidenceMapHits: payloadBase.evidenceMapHits,
		siteCrawl,
	};
	let viewing: {
		snapshotId: string;
		createdAt: string;
		aiSummary: string;
		cadence: string;
	} | null = null;
	if (snapshotId) {
		const row =
			history.find((item) => item.$id === snapshotId) ??
			(
				await listReadinessSnapshots({ orgId: defaultOrg.orgId, limit: 100 })
			).find((item) => item.$id === snapshotId);
		const stored = row ? parseSnapshotPayload(row.payload) : null;
		if (!row || !stored) {
			return NextResponse.json(
				{ error: "Snapshot not found" },
				{ status: 404 },
			);
		}
		view = {
			summary: stored.summary as unknown as typeof view.summary,
			sourcesUsed: stored.sourcesUsed,
			disclaimer: stored.disclaimer,
			evidenceMapHits: stored.evidenceMapHits,
			siteCrawl: stored.siteCrawl,
		};
		viewing = {
			snapshotId: row.$id,
			createdAt: row.createdAt,
			aiSummary: row.aiSummary || "",
			cadence: row.cadence,
		};
	}

	const permissions = await getUserPermissions(user.$id, defaultOrg.orgId);
	// Same gates as the Assign action on /contracts and /licenses.
	const canAssignOwners = {
		contract: permissions.includes(PERMISSIONS.CONTRACTS.EDIT),
		license: permissions.includes(PERMISSIONS.LICENSES.EDIT),
	};
	const nextRun = nextScheduledReadinessRun(new Date(), auditSettings.timezone);

	const latest = history[0] ?? null;

	return NextResponse.json({
		success: true,
		data: {
			summary: view.summary,
			sourcesUsed: view.sourcesUsed,
			disclaimer: view.disclaimer,
			ragThresholds: RAG_THRESHOLDS,
			evidenceMapHits: view.evidenceMapHits,
			siteCrawl: view.siteCrawl,
			viewing,
			nextRun,
			canAssignOwners,
			org: {
				id: defaultOrg.orgId,
				name: org?.name ?? "Organization",
				timezone: auditSettings.timezone,
				websiteUrl: auditSettings.websiteUrl,
			},
			latestSnapshot: latest
				? {
						id: latest.$id,
						cadence: latest.cadence,
						score: latest.score,
						ragStatus: latest.ragStatus,
						createdAt: latest.createdAt,
						aiSummary: latest.aiSummary || "",
					}
				: null,
			history: history.map((row) => {
				const parsed = parseSnapshotPayload(row.payload);
				return {
					id: row.$id,
					cadence: row.cadence,
					score: row.score,
					ragStatus: row.ragStatus,
					createdAt: row.createdAt,
					scoreDelta: parsed?.scoreDelta ?? null,
					source: parsed?.source ?? null,
				};
			}),
		},
	});
}

const runSchema = z.object({
	cadence: z.enum(["weekly", "monthly", "quarterly"]).default("weekly"),
	force: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.VIEW,
	});
	if (denied) return denied;

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
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const body = await request.json().catch(() => ({}));
	const validated = runSchema.parse(body);

	const outcome = await runReadinessAuditForOrg({
		orgId: defaultOrg.orgId,
		cadence: validated.cadence,
		force: validated.force ?? true,
		sendAlerts: false,
		source: "manual",
	});

	return NextResponse.json({
		success: true,
		data: {
			skipped: outcome.skipped,
			snapshot: outcome.snapshot
				? {
						id: outcome.snapshot.$id,
						cadence: outcome.snapshot.cadence,
						score: outcome.snapshot.score,
						ragStatus: outcome.snapshot.ragStatus,
						createdAt: outcome.snapshot.createdAt,
						aiSummary: outcome.snapshot.aiSummary,
					}
				: null,
		},
	});
}
