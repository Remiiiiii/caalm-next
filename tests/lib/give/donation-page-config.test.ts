import { describe, expect, it, vi } from "vitest";
import { publicDonationPageConfigCacheTag } from "@/lib/give/donation-page-config/cache-invalidation";
import { DonationPageConfigError } from "@/lib/give/donation-page-config/errors";
import { createMemoryDonationPageConfigStore } from "@/lib/give/donation-page-config/memory-store";
import {
	createDonationPagePreviewToken,
	verifyDonationPagePreviewToken,
} from "@/lib/give/donation-page-config/preview-token";
import { createDonationPageConfigService } from "@/lib/give/donation-page-config/service";
import { createInMemoryDonationPageConfigAuditSink } from "@/lib/give/donation-page-config/audit";
import {
	createTestDonationStripePricePort,
} from "@/lib/give/donation-page-config/stripe-prices";
import type { DonationPageConfigPayload } from "@/lib/give/donation-page-config/types";
import {
	isValidEin,
	validateDonationPageConfigPayload,
} from "@/lib/give/donation-page-config/validation";

const ACTOR = {
	userId: "user_1",
	userName: "Victor Ramirez",
	userEmail: "victor@example.org",
};

function validPayload(
	overrides: Partial<DonationPageConfigPayload> = {},
): DonationPageConfigPayload {
	return {
		amountsCents: [2500, 5000, 10000],
		designations: ["Where it's needed most", "Literacy program"],
		impactStatements: {
			"2500": "provides tutoring materials for one student.",
		},
		ein: "47-3829102",
		legalText: "Your gift may be tax-deductible to the extent allowed by law.",
		frequencyOptions: ["one_time", "monthly"],
		stripePriceByAmountCents: {},
		...overrides,
	};
}

function buildService(options?: {
	activePriceIds?: Set<string>;
	invalidateCache?: (orgId: string) => Promise<void>;
}) {
	const store = createMemoryDonationPageConfigStore();
	const stripe = createTestDonationStripePricePort();
	const auditSink = createInMemoryDonationPageConfigAuditSink();
	const invalidateCache = vi.fn(async () => undefined);
	const service = createDonationPageConfigService({
		store,
		stripe,
		audit: auditSink,
		invalidateCache: options?.invalidateCache ?? invalidateCache,
		getActiveSubscriptionPriceIds: async () =>
			options?.activePriceIds ?? new Set(),
	});
	return { service, store, stripe, audit: auditSink, invalidateCache };
}

describe("donation page config validation", () => {
	it("accepts a well-formed payload", () => {
		expect(() => validateDonationPageConfigPayload(validPayload())).not.toThrow();
		expect(isValidEin("47-3829102")).toBe(true);
	});

	it("rejects non-ascending amounts", () => {
		expect(() =>
			validateDonationPageConfigPayload(
				validPayload({ amountsCents: [5000, 2500] }),
			),
		).toThrow(DonationPageConfigError);
	});

	it("rejects malformed EIN when provided", () => {
		expect(() =>
			validateDonationPageConfigPayload(validPayload({ ein: "473829102" })),
		).toThrow(/EIN/);
	});

	it("allows an empty EIN", () => {
		expect(() =>
			validateDonationPageConfigPayload(validPayload({ ein: "" })),
		).not.toThrow();
	});

	it("rejects duplicate designations", () => {
		expect(() =>
			validateDonationPageConfigPayload(
				validPayload({
					designations: ["General fund", "general fund"],
				}),
			),
		).toThrow(/unique/i);
	});
});

describe("DonationPageConfigService", () => {
	it("keeps draft edits off the published config until publish", async () => {
		const { service } = buildService();
		const orgId = "org_alpha";
		const draft = await service.getOrCreateDraft(orgId);
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: validPayload({ amountsCents: [3000, 6000] }),
		});
		expect(await service.getPublished(orgId)).toBeNull();
		await service.publish({ orgId, actor: ACTOR });
		const published = await service.getPublished(orgId);
		expect(published?.payload.amountsCents).toEqual([3000, 6000]);
		await service.updateDraft({
			orgId,
			expectedVersion: (await service.getOrCreateDraft(orgId)).version,
			payload: validPayload({ amountsCents: [4000, 8000] }),
		});
		expect(published?.payload.amountsCents).toEqual([3000, 6000]);
	});

	it("publish creates immutable snapshot and version history", async () => {
		const { service } = buildService();
		const orgId = "org_beta";
		const draft = await service.getOrCreateDraft(orgId);
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: validPayload(),
		});
		const { version } = await service.publish({
			orgId,
			actor: ACTOR,
			changeSummary: "Initial setup",
		});
		expect(version.versionNumber).toBe(1);
		expect(version.isLive).toBe(true);
		const versions = await service.listVersions(orgId);
		expect(versions).toHaveLength(1);
		expect(versions[0].changeSummary).toBe("Initial setup");
	});

	it("revert appends a new version copied from an older snapshot", async () => {
		const { service } = buildService();
		const orgId = "org_gamma";
		let draft = await service.getOrCreateDraft(orgId);
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: validPayload({ amountsCents: [2500, 5000] }),
		});
		await service.publish({ orgId, actor: ACTOR, changeSummary: "v1" });
		draft = await service.getOrCreateDraft(orgId);
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: validPayload({ amountsCents: [9900, 10000] }),
		});
		await service.publish({ orgId, actor: ACTOR, changeSummary: "v2" });
		const reverted = await service.revert({
			orgId,
			targetVersionNumber: 1,
			actor: ACTOR,
		});
		expect(reverted.version.versionNumber).toBe(3);
		expect(reverted.published.payload.amountsCents).toEqual([2500, 5000]);
		const versions = await service.listVersions(orgId);
		expect(versions).toHaveLength(3);
		expect(versions.filter((v) => v.isLive)).toHaveLength(1);
		expect(versions[0].versionNumber).toBe(3);
	});

	it("rejects stale draft writes", async () => {
		const { service } = buildService();
		const orgId = "org_delta";
		const draft = await service.getOrCreateDraft(orgId);
		await expect(
			service.updateDraft({
				orgId,
				expectedVersion: draft.version - 1,
				payload: validPayload(),
			}),
		).rejects.toMatchObject({ code: "STALE_DRAFT", status: 409 });
	});

	it("creates new Stripe prices when amounts change and records replacements", async () => {
		const active = new Set(["price_live_2500"]);
		const { service, stripe, store } = buildService({
			activePriceIds: active,
		});
		const orgId = "org_stripe";
		let draft = await service.getOrCreateDraft(orgId);
		const base = validPayload({
			stripePriceByAmountCents: { "2500": "price_live_2500" },
		});
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: base,
		});
		draft = await service.getOrCreateDraft(orgId);
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: validPayload({
				amountsCents: [3000, 5000, 10000],
				stripePriceByAmountCents: draft.payload.stripePriceByAmountCents,
			}),
		});
		expect(stripe.created.some((c) => c.amountCents === 3000)).toBe(true);
		expect(stripe.updateCalls).toBe(0);
		const replacements = await store.listPriceReplacements(orgId);
		expect(replacements.some((r) => r.stripePriceId === "price_live_2500")).toBe(
			true,
		);
	});

	it("invalidates public cache on publish", async () => {
		const invalidateCache = vi.fn(async () => undefined);
		const { service } = buildService({ invalidateCache });
		const orgId = "org_cache";
		const draft = await service.getOrCreateDraft(orgId);
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: validPayload(),
		});
		await service.publish({ orgId, actor: ACTOR });
		expect(invalidateCache).toHaveBeenCalledWith(orgId);
		expect(publicDonationPageConfigCacheTag(orgId)).toBe(
			"give:donation-page-config:org_cache",
		);
	});

	it("writes audit entries for publish and revert", async () => {
		const { service, audit } = buildService();
		const orgId = "org_audit";
		let draft = await service.getOrCreateDraft(orgId);
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: validPayload(),
		});
		await service.publish({ orgId, actor: ACTOR });
		draft = await service.getOrCreateDraft(orgId);
		await service.updateDraft({
			orgId,
			expectedVersion: draft.version,
			payload: validPayload({ amountsCents: [5000, 10000] }),
		});
		await service.publish({ orgId, actor: ACTOR });
		await service.revert({ orgId, targetVersionNumber: 1, actor: ACTOR });
		expect(audit.entries.map((e) => e.action)).toEqual([
			"publish",
			"publish",
			"revert",
		]);
	});
});

describe("donation page preview token", () => {
	it("issues a signed draft preview reference", () => {
		const secret = "test-preview-secret";
		const token = createDonationPagePreviewToken("org_preview", {
			secret,
			expiresAt: 4_000_000_000,
		});
		const verified = verifyDonationPagePreviewToken(token, {
			secret,
			nowSeconds: 3_000_000_000,
		});
		expect(verified).toEqual({ ok: true, orgId: "org_preview" });
	});
});
