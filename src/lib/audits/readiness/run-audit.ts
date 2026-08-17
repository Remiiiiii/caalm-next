import { getOrganization } from "@/lib/rbac/organizations";
import { notifyAuditViewUsers } from "./alerts";
import { generateReadinessAutoSummary } from "./ai-summary";
import { buildOrgReadinessSummary } from "./build-summary";
import { getOrgAuditSettings } from "./org-settings";
import { crawlPublicSite } from "./site-crawl";
import {
	createReadinessSnapshot,
	getLatestSnapshot,
	hasSnapshotOnLocalDay,
	listReadinessSnapshots,
} from "./snapshot.service";
import { cadencesDueNow, localDayKey, resolveOrgTimezone } from "./timezone";
import type { AuditCadence, AuditReadinessSnapshotRecord } from "./types";
import { computeRag } from "./score";

export async function runReadinessAuditForOrg(options: {
	orgId: string;
	cadence: AuditCadence;
	force?: boolean;
	includeCrawl?: boolean;
	includeAiSummary?: boolean;
	sendAlerts?: boolean;
}): Promise<{
	snapshot: AuditReadinessSnapshotRecord | null;
	skipped?: string;
	alertsSent?: number;
}> {
	const org = await getOrganization(options.orgId);
	if (!org) return { snapshot: null, skipped: "org_not_found" };
	if (org.status === "suspended") {
		return { snapshot: null, skipped: "org_suspended" };
	}

	const auditSettings = getOrgAuditSettings(org);
	const timezone = resolveOrgTimezone(auditSettings.timezone);
	const dayKey = localDayKey(new Date(), timezone);

	if (!options.force) {
		const already = await hasSnapshotOnLocalDay({
			orgId: options.orgId,
			cadence: options.cadence,
			dayKey,
			timezone,
		});
		if (already) return { snapshot: null, skipped: "already_ran_today" };
	}

	const history = await listReadinessSnapshots({
		orgId: options.orgId,
		cadence: options.cadence,
		limit: 8,
	});
	const historyScores = [...history]
		.reverse()
		.filter((row) => row.score !== null)
		.map((row, index) => ({
			label: `R${index + 1}`,
			value: row.score as number,
		}));

	let siteCrawl = null;
	if (options.includeCrawl !== false && auditSettings.websiteUrl) {
		try {
			siteCrawl = await crawlPublicSite(auditSettings.websiteUrl);
		} catch (error) {
			console.warn(
				"[SERVER] site crawl failed",
				error instanceof Error ? error.message : error,
			);
		}
	}

	const { summary, payloadBase } = await buildOrgReadinessSummary({
		orgId: options.orgId,
		siteCrawl,
		historyScores,
	});

	const previous = await getLatestSnapshot(options.orgId, options.cadence);
	const previousScore = previous?.score ?? null;
	const score = summary.readinessScore;
	const liveScore =
		payloadBase.sourcesUsed.length === 0 ? null : score;
	const scoreDelta =
		liveScore !== null && previousScore !== null
			? liveScore - previousScore
			: null;

	const payload = {
		...payloadBase,
		summary: {
			...summary,
			readinessScore: liveScore ?? 0,
			ragStatus: computeRag(liveScore) ?? summary.ragStatus,
		},
		previousScore,
		scoreDelta,
	};

	let aiSummary = "";
	if (options.includeAiSummary !== false) {
		try {
			aiSummary = await generateReadinessAutoSummary(payload);
		} catch (error) {
			console.warn(
				"[SERVER] auto summary failed",
				error instanceof Error ? error.message : error,
			);
		}
	}

	const snapshot = await createReadinessSnapshot({
		orgId: options.orgId,
		cadence: options.cadence,
		score: liveScore,
		ragStatus: computeRag(liveScore),
		timezone,
		payload,
		aiSummary,
	});

	let alertsSent = 0;
	const shouldAlert =
		options.sendAlerts !== false &&
		options.cadence === "weekly" &&
		(summary.severity.critical > 0 ||
			(scoreDelta !== null && scoreDelta <= -5));

	if (shouldAlert) {
		alertsSent = await notifyAuditViewUsers({
			orgId: options.orgId,
			title: "Weekly CAALM readiness alert",
			message: [
				READINESS_ALERT_DISCLAIMER_SHORT,
				liveScore === null
					? "No readiness score yet (add contracts or licenses)."
					: `Score ${liveScore} (${computeRag(liveScore)}).`,
				`Critical items: ${summary.severity.critical}.`,
				scoreDelta !== null ? `Change: ${scoreDelta >= 0 ? "+" : ""}${scoreDelta}.` : "",
			]
				.filter(Boolean)
				.join(" "),
			score: liveScore,
			ragStatus: computeRag(liveScore),
			critical: summary.severity.critical,
		});
	}

	return { snapshot, alertsSent };
}

const READINESS_ALERT_DISCLAIMER_SHORT =
	"CAALM readiness (not an official audit).";

export async function runDueReadinessAudits(now = new Date()): Promise<{
	processed: number;
	results: Array<{
		orgId: string;
		cadence: AuditCadence;
		skipped?: string;
		snapshotId?: string;
		alertsSent?: number;
	}>;
}> {
	const { listOrganizations } = await import("@/lib/rbac/organizations");
	const orgs = await listOrganizations();
	const results: Array<{
		orgId: string;
		cadence: AuditCadence;
		skipped?: string;
		snapshotId?: string;
		alertsSent?: number;
	}> = [];
	let processed = 0;

	for (const org of orgs) {
		if (org.status === "suspended") continue;
		const { timezone } = getOrgAuditSettings(org);
		const due = cadencesDueNow(now, timezone);
		for (const cadence of due) {
			processed += 1;
			try {
				const outcome = await runReadinessAuditForOrg({
					orgId: org.$id,
					cadence,
				});
				results.push({
					orgId: org.$id,
					cadence,
					skipped: outcome.skipped,
					snapshotId: outcome.snapshot?.$id,
					alertsSent: outcome.alertsSent,
				});
			} catch (error) {
				results.push({
					orgId: org.$id,
					cadence,
					skipped:
						error instanceof Error ? error.message : "run_failed",
				});
			}
		}
	}

	return { processed, results };
}
