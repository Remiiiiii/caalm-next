import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { buildOrgReadinessSummary } from "@/lib/audits/readiness/build-summary";
import { getOrgAuditSettings } from "@/lib/audits/readiness/org-settings";
import { runReadinessAuditForOrg } from "@/lib/audits/readiness/run-audit";
import { crawlPublicSite } from "@/lib/audits/readiness/site-crawl";
import {
	listReadinessSnapshots,
} from "@/lib/audits/readiness/snapshot.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	if (!defaultOrg?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
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

	const latest = history[0] ?? null;

	return NextResponse.json({
		success: true,
		data: {
			summary: {
				...summary,
				readinessScore:
					payloadBase.sourcesUsed.length === 0 ? null : summary.readinessScore,
			},
			sourcesUsed: payloadBase.sourcesUsed,
			disclaimer: payloadBase.disclaimer,
			evidenceMapHits: payloadBase.evidenceMapHits,
			siteCrawl,
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
			history: history.map((row) => ({
				id: row.$id,
				cadence: row.cadence,
				score: row.score,
				ragStatus: row.ragStatus,
				createdAt: row.createdAt,
			})),
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
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	if (!defaultOrg?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const body = await request.json().catch(() => ({}));
	const validated = runSchema.parse(body);

	const outcome = await runReadinessAuditForOrg({
		orgId: defaultOrg.orgId,
		cadence: validated.cadence,
		force: validated.force ?? true,
		sendAlerts: false,
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
