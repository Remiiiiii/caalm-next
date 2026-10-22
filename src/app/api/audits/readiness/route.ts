import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { buildOrgReadinessSummary } from "@/lib/audits/readiness/build-summary";
import {
	getCachedSiteCrawl,
	getOrgAuditSettings,
} from "@/lib/audits/readiness/org-settings";
import { runReadinessAuditForOrg } from "@/lib/audits/readiness/run-audit";
import { nextScheduledReadinessRun } from "@/lib/audits/readiness/schedule";
import { RAG_THRESHOLDS } from "@/lib/audits/readiness/score";
import {
	listReadinessSnapshots,
	parseSnapshotPayload,
} from "@/lib/audits/readiness/snapshot.service";
import { buildReadinessAssistantStructured } from "@/lib/audits/readiness/summary-tiles";
import type { AuditReadinessSnapshotRecord } from "@/lib/audits/readiness/types";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

function assistantFromSnapshot(row: AuditReadinessSnapshotRecord | null) {
	if (!row) return null;
	const parsed = parseSnapshotPayload(row.payload);
	if (!parsed) return null;
	return {
		snapshotId: row.$id,
		createdAt: row.createdAt,
		summary: row.aiSummary || "",
		structured: buildReadinessAssistantStructured(parsed),
	};
}

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

	const snapshotId = new URL(request.url).searchParams.get("snapshotId");

	const [org, history] = await Promise.all([
		getOrganization(defaultOrg.orgId),
		listReadinessSnapshots({
			orgId: defaultOrg.orgId,
			limit: snapshotId ? 100 : 12,
		}),
	]);
	const auditSettings = org
		? getOrgAuditSettings(org)
		: { timezone: "America/New_York", websiteUrl: null };

	let viewing: {
		snapshotId: string;
		createdAt: string;
		aiSummary: string;
		cadence: string;
	} | null = null;

	if (snapshotId) {
		const row = history.find((item) => item.$id === snapshotId);
		const stored = row ? parseSnapshotPayload(row.payload) : null;
		if (!row || !stored) {
			return NextResponse.json(
				{ error: "Snapshot not found" },
				{ status: 404 },
			);
		}
		viewing = {
			snapshotId: row.$id,
			createdAt: row.createdAt,
			aiSummary: row.aiSummary || "",
			cadence: row.cadence,
		};
		const permissions = await getUserPermissions(user.$id, defaultOrg.orgId);
		const canAssignOwners = {
			contract: permissions.includes(PERMISSIONS.CONTRACTS.EDIT),
			license: permissions.includes(PERMISSIONS.LICENSES.EDIT),
		};
		const nextRun = nextScheduledReadinessRun(
			new Date(),
			auditSettings.timezone,
		);
		const latest = history[0] ?? null;
		return NextResponse.json({
			success: true,
			data: {
				summary: stored.summary,
				sourcesUsed: stored.sourcesUsed,
				disclaimer: stored.disclaimer,
				ragThresholds: RAG_THRESHOLDS,
				evidenceMapHits: stored.evidenceMapHits,
				siteCrawl: stored.siteCrawl,
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
				assistant: assistantFromSnapshot(row),
				history: history.slice(0, 12).map((item) => {
					const parsed = parseSnapshotPayload(item.payload);
					return {
						id: item.$id,
						cadence: item.cadence,
						score: item.score,
						ragStatus: item.ragStatus,
						createdAt: item.createdAt,
						scoreDelta: parsed?.scoreDelta ?? null,
						source: parsed?.source ?? null,
					};
				}),
			},
		});
	}

	// Prefer the org-level crawl cache (kept fresh by both re-crawl and full
	// runs); fall back to the last snapshot's embedded crawl for orgs that
	// haven't re-crawled since this cache was introduced. Never crawl live
	// here — that's what made this GET miss the browser's 30s timeout.
	const siteCrawl =
		(org ? getCachedSiteCrawl(org) : null) ??
		(history[0]
			? (parseSnapshotPayload(history[0].payload)?.siteCrawl ?? null)
			: null);
	const historyScores = [...history]
		.reverse()
		.filter((row) => row.score !== null)
		.map((row, index) => ({
			label: `R${index + 1}`,
			value: row.score as number,
		}));

	const [{ summary, payloadBase }, permissions] = await Promise.all([
		buildOrgReadinessSummary({
			orgId: defaultOrg.orgId,
			siteCrawl,
			historyScores,
		}),
		getUserPermissions(user.$id, defaultOrg.orgId),
	]);

	const view = {
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
			assistant: assistantFromSnapshot(latest),
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

	const assistant = assistantFromSnapshot(outcome.snapshot);
	if (outcome.snapshot) {
		const userName =
			(user as { fullName?: string }).fullName || user.email || "unknown";
		const scoreLabel =
			outcome.snapshot.score == null ? "N/A" : `${outcome.snapshot.score}%`;
		await logAuditEvent({
			event_id: `readiness_snapshot_${outcome.snapshot.$id}`,
			event_title: "Saved a readiness snapshot",
			action: "create",
			source: "caalm",
			user_id: user.$id,
			user_name: userName,
			user_email: user.email || "",
			orgId: defaultOrg.orgId,
			status: "success",
			module: "system",
			target_type: "audit_readiness_snapshot",
			target_id: outcome.snapshot.$id,
			target_label: `Readiness snapshot ${scoreLabel}`,
			summary: `${userName} saved a ${validated.cadence} readiness snapshot (score ${scoreLabel})`,
		});
	}

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
			summary: assistant?.summary ?? outcome.snapshot?.aiSummary ?? "",
			structured: assistant?.structured ?? null,
		},
	});
}
