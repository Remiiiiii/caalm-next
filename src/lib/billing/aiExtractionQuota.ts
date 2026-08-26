/**
 * Monthly AI document-extraction quota (org-scoped).
 * Uses Redis/KV when available; in-memory fallback for local/dev/tests.
 */

import {
	PILOT_AI_EXTRACTIONS_PER_MONTH,
	type PricingTier,
	TIER_LIMITS,
} from "@/lib/stripe/prices";
import { PlanLimitError } from "@/lib/billing/planLimits";

type MemoryBucket = { count: number; monthKey: string };

declare global {
	// eslint-disable-next-line no-var
	var __caalmAiExtractQuota: Map<string, MemoryBucket> | undefined;
}

function memoryRoot(): Map<string, MemoryBucket> {
	if (!globalThis.__caalmAiExtractQuota) {
		globalThis.__caalmAiExtractQuota = new Map();
	}
	return globalThis.__caalmAiExtractQuota;
}

export function resetAiExtractQuotaForTests(): void {
	globalThis.__caalmAiExtractQuota = new Map();
}

function monthKey(d = new Date()): string {
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function cacheKey(orgId: string, month = monthKey()): string {
	return `ai-extract:${orgId}:${month}`;
}

export function resolveAiExtractionLimit(params: {
	tier: PricingTier;
	billingStatus?: string | null;
}): number {
	if (params.billingStatus === "trialing") {
		return PILOT_AI_EXTRACTIONS_PER_MONTH;
	}
	return TIER_LIMITS[params.tier].maxAiExtractionsPerMonth;
}

async function readCount(orgId: string): Promise<number> {
	const key = cacheKey(orgId);
	try {
		if (typeof window === "undefined") {
			const { get } = await import("@/lib/services/redis-cache");
			const cached = await get<number>(key);
			if (typeof cached === "number") return cached;
		}
	} catch {
		// fall through to memory
	}
	const mem = memoryRoot().get(key);
	if (mem && mem.monthKey === monthKey()) return mem.count;
	return 0;
}

async function writeCount(orgId: string, count: number): Promise<void> {
	const key = cacheKey(orgId);
	const ttlSeconds = 40 * 24 * 60 * 60; // ~40 days
	memoryRoot().set(key, { count, monthKey: monthKey() });
	try {
		if (typeof window === "undefined") {
			const { set } = await import("@/lib/services/redis-cache");
			await set(key, count, ttlSeconds);
		}
	} catch {
		// memory already updated
	}
}

export async function getAiExtractionUsage(orgId: string): Promise<number> {
	return readCount(orgId);
}

export async function assertAndConsumeAiExtraction(params: {
	orgId: string;
	tier: PricingTier;
	billingStatus?: string | null;
}): Promise<{ used: number; limit: number }> {
	const limit = resolveAiExtractionLimit(params);
	if (!Number.isFinite(limit)) {
		const used = await readCount(params.orgId);
		await writeCount(params.orgId, used + 1);
		return { used: used + 1, limit };
	}

	const used = await readCount(params.orgId);
	if (used >= limit) {
		throw new PlanLimitError({
			kind: "ai_extractions",
			limit,
			used,
			tier: params.tier,
			message: `AI extraction limit reached: ${used}/${limit} this month on the ${params.tier} plan${
				params.billingStatus === "trialing" ? " (pilot cap)" : ""
			}. Upgrade in Settings → Billing or wait until next month.`,
		});
	}

	const next = used + 1;
	await writeCount(params.orgId, next);
	return { used: next, limit };
}
