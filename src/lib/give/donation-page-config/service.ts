import { DonationPageConfigError } from "./errors";
import type { DonationPageConfigAuditSink } from "./audit";
import { defaultDonationPageConfigAuditSink } from "./audit";
import type { DonationPageConfigCacheInvalidator } from "./cache-invalidation";
import { invalidatePublicDonationPageConfigCache } from "./cache-invalidation";
import { createDonationPagePreviewToken } from "./preview-token";
import type { DonationPageConfigStore } from "./store";
import type { DonationStripePricePort } from "./stripe-prices";
import { syncStripePricesForPayload } from "./stripe-prices";
import {
	DEFAULT_DONATION_PAGE_CONFIG,
	type DonationPageConfigActor,
	type DonationPageConfigPayload,
	type DonationPageConfigPublished,
	type DonationPageConfigVersion,
} from "./types";
import { validateDonationPageConfigPayload } from "./validation";

export type DonationPageConfigServiceDeps = {
	store: DonationPageConfigStore;
	stripe: DonationStripePricePort;
	invalidateCache?: DonationPageConfigCacheInvalidator;
	audit?: DonationPageConfigAuditSink;
	getActiveSubscriptionPriceIds?: (orgId: string) => Promise<Set<string>>;
};

export class DonationPageConfigService {
	private readonly store: DonationPageConfigStore;
	private readonly stripe: DonationStripePricePort;
	private readonly invalidateCache: DonationPageConfigCacheInvalidator;
	private readonly audit: DonationPageConfigAuditSink;
	private readonly getActiveSubscriptionPriceIds: (
		orgId: string,
	) => Promise<Set<string>>;

	constructor(deps: DonationPageConfigServiceDeps) {
		this.store = deps.store;
		this.stripe = deps.stripe;
		this.invalidateCache =
			deps.invalidateCache ?? invalidatePublicDonationPageConfigCache;
		this.audit = deps.audit ?? defaultDonationPageConfigAuditSink;
		this.getActiveSubscriptionPriceIds =
			deps.getActiveSubscriptionPriceIds ?? (async () => new Set());
	}

	async getOrCreateDraft(orgId: string) {
		const existing = await this.store.getDraft(orgId);
		if (existing) return existing;

		const payload = DEFAULT_DONATION_PAGE_CONFIG();
		const draft = {
			orgId,
			payload,
			version: 1,
			updatedAt: new Date().toISOString(),
		};
		await this.store.saveDraft(draft);
		return draft;
	}

	async getPublished(orgId: string): Promise<DonationPageConfigPublished | null> {
		return this.store.getPublished(orgId);
	}

	async listVersions(orgId: string): Promise<DonationPageConfigVersion[]> {
		return this.store.listVersions(orgId);
	}

	async updateDraft(input: {
		orgId: string;
		payload: DonationPageConfigPayload;
		expectedVersion: number;
	}) {
		const draft = await this.getOrCreateDraft(input.orgId);
		if (draft.version !== input.expectedVersion) {
			throw new DonationPageConfigError(
				"Draft was updated by someone else; refresh and try again",
				"STALE_DRAFT",
				409,
			);
		}

		const normalized = normalizePayload(input.payload);
		validateDonationPageConfigPayload(normalized);

		const activePriceIds = await this.getActiveSubscriptionPriceIds(input.orgId);
		const { payload: withPrices, replacements } = await syncStripePricesForPayload({
			orgId: input.orgId,
			previous: draft.payload,
			next: normalized,
			stripe: this.stripe,
			activeSubscriptionPriceIds: activePriceIds,
		});

		if (replacements.length > 0) {
			await this.store.appendPriceReplacements(
				replacements.map((r) => ({ orgId: input.orgId, ...r })),
			);
		}

		const nextDraft = {
			orgId: input.orgId,
			payload: withPrices,
			version: draft.version + 1,
			updatedAt: new Date().toISOString(),
		};
		await this.store.saveDraft(nextDraft);

		const published = await this.store.getPublished(input.orgId);
		return { draft: nextDraft, published };
	}

	async publish(input: {
		orgId: string;
		actor: DonationPageConfigActor;
		changeSummary?: string;
	}) {
		const draft = await this.getOrCreateDraft(input.orgId);
		return this.commitPublishedSnapshot({
			orgId: input.orgId,
			snapshot: clonePayload(draft.payload),
			actor: input.actor,
			changeSummary: input.changeSummary,
			auditAction: "publish",
		});
	}

	private async commitPublishedSnapshot(input: {
		orgId: string;
		snapshot: DonationPageConfigPayload;
		actor: DonationPageConfigActor;
		changeSummary?: string;
		auditAction: "publish" | "revert";
	}) {
		validateDonationPageConfigPayload(input.snapshot);

		const versions = await this.store.listVersions(input.orgId);
		const previousLive = versions.find((v) => v.isLive);
		const nextVersionNumber =
			versions.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1;

		const publishedAt = new Date().toISOString();
		const snapshot = clonePayload(input.snapshot);

		const versionRow: DonationPageConfigVersion = {
			orgId: input.orgId,
			versionNumber: nextVersionNumber,
			snapshot,
			publishedByUserId: input.actor.userId,
			publishedByName: input.actor.userName,
			publishedAt,
			changeSummary: input.changeSummary,
			isLive: true,
		};

		await this.store.appendVersion(versionRow);
		await this.store.markLiveVersion(input.orgId, nextVersionNumber);

		const published: DonationPageConfigPublished = {
			orgId: input.orgId,
			payload: snapshot,
			liveVersionNumber: nextVersionNumber,
			publishedAt,
			publishedByUserId: input.actor.userId,
		};
		await this.store.savePublished(published);

		await this.invalidateCache(input.orgId);

		await this.audit({
			action: input.auditAction,
			orgId: input.orgId,
			actor: input.actor,
			versionBefore: previousLive?.versionNumber ?? null,
			versionAfter: nextVersionNumber,
			changeSummary: input.changeSummary,
			changes: diffPayloads(previousLive?.snapshot, snapshot),
		});

		return { published, version: versionRow };
	}

	async revert(input: {
		orgId: string;
		targetVersionNumber: number;
		actor: DonationPageConfigActor;
		changeSummary?: string;
	}) {
		const versions = await this.store.listVersions(input.orgId);
		const target = versions.find(
			(v) => v.versionNumber === input.targetVersionNumber,
		);
		if (!target) {
			throw new DonationPageConfigError(
				"Version not found",
				"VERSION_NOT_FOUND",
				404,
			);
		}

		const draft = await this.getOrCreateDraft(input.orgId);
		const revertedPayload = clonePayload(target.snapshot);

		const activePriceIds = await this.getActiveSubscriptionPriceIds(input.orgId);
		const { payload: withPrices, replacements } = await syncStripePricesForPayload({
			orgId: input.orgId,
			previous: draft.payload,
			next: revertedPayload,
			stripe: this.stripe,
			activeSubscriptionPriceIds: activePriceIds,
		});
		if (replacements.length > 0) {
			await this.store.appendPriceReplacements(
				replacements.map((r) => ({ orgId: input.orgId, ...r })),
			);
		}

		await this.store.saveDraft({
			orgId: input.orgId,
			payload: withPrices,
			version: draft.version + 1,
			updatedAt: new Date().toISOString(),
		});

		return this.commitPublishedSnapshot({
			orgId: input.orgId,
			snapshot: withPrices,
			actor: input.actor,
			changeSummary:
				input.changeSummary ??
				`Reverted to version ${input.targetVersionNumber}`,
			auditAction: "revert",
		});
	}

	createPreviewToken(orgId: string, options?: { expiresAt?: number }) {
		return createDonationPagePreviewToken(orgId, options);
	}
}

function normalizePayload(
	payload: DonationPageConfigPayload,
): DonationPageConfigPayload {
	return {
		...payload,
		amountsCents: [...payload.amountsCents],
		designations: payload.designations.map((d) => d.trim()),
		impactStatements: { ...payload.impactStatements },
		ein: payload.ein.trim(),
		legalText: payload.legalText.trim(),
		frequencyOptions: [...payload.frequencyOptions],
		stripePriceByAmountCents: { ...payload.stripePriceByAmountCents },
	};
}

function clonePayload(payload: DonationPageConfigPayload): DonationPageConfigPayload {
	return JSON.parse(JSON.stringify(payload)) as DonationPageConfigPayload;
}

function diffPayloads(
	before: DonationPageConfigPayload | undefined,
	after: DonationPageConfigPayload,
) {
	if (!before) {
		return [{ field: "config", before: null, after: "initial publish" }];
	}
	const changes: Array<{
		field: string;
		before?: string | null;
		after?: string | null;
	}> = [];
	if (JSON.stringify(before.amountsCents) !== JSON.stringify(after.amountsCents)) {
		changes.push({
			field: "amountsCents",
			before: JSON.stringify(before.amountsCents),
			after: JSON.stringify(after.amountsCents),
		});
	}
	if (JSON.stringify(before.designations) !== JSON.stringify(after.designations)) {
		changes.push({
			field: "designations",
			before: JSON.stringify(before.designations),
			after: JSON.stringify(after.designations),
		});
	}
	if (before.ein !== after.ein) {
		changes.push({ field: "ein", before: before.ein, after: after.ein });
	}
	return changes;
}

export function createDonationPageConfigService(
	deps: DonationPageConfigServiceDeps,
): DonationPageConfigService {
	return new DonationPageConfigService(deps);
}
