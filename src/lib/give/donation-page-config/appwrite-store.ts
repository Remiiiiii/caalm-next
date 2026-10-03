import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { DonationPageConfigStore } from "./store";
import type {
	DonationPageConfigDraft,
	DonationPageConfigPayload,
	DonationPageConfigPublished,
	DonationPageConfigVersion,
	DonationStripePriceReplacement,
} from "./types";

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function draftsTableId(): string {
	return (
		appwriteConfig.donationPageConfigDraftsCollectionId || "69fb1a01001f4e8c2b80"
	);
}

function publishedTableId(): string {
	return (
		appwriteConfig.donationPageConfigPublishedCollectionId ||
		"69fb1a02001f4e8c2b81"
	);
}

function versionsTableId(): string {
	return (
		appwriteConfig.donationPageConfigVersionsCollectionId ||
		"69fb1a03001f4e8c2b82"
	);
}

function priceReplacementsTableId(): string {
	return (
		appwriteConfig.donationPageConfigPriceReplacementsCollectionId ||
		"69fb1a04001f4e8c2b83"
	);
}

function parsePayload(raw: unknown): DonationPageConfigPayload {
	if (typeof raw === "string") {
		return JSON.parse(raw) as DonationPageConfigPayload;
	}
	return raw as DonationPageConfigPayload;
}

function serializePayload(payload: DonationPageConfigPayload): string {
	return JSON.stringify(payload);
}

export function createAppwriteDonationPageConfigStore(): DonationPageConfigStore {
	return {
		async getDraft(orgId) {
			const { tablesDB } = await createAdminClient();
			const result = await tablesDB.listRows({
				databaseId: dbId(),
				tableId: draftsTableId(),
				queries: [Query.equal("orgId", orgId), Query.limit(1)],
			});
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return {
				orgId,
				payload: parsePayload(row.payload),
				version: Number(row.version ?? 1),
				updatedAt: String(row.updatedAt ?? row.$updatedAt ?? ""),
			};
		},

		async saveDraft(draft) {
			const { tablesDB } = await createAdminClient();
			const existing = await this.getDraft(draft.orgId);
			const data = {
				orgId: draft.orgId,
				payload: serializePayload(draft.payload),
				version: draft.version,
				updatedAt: draft.updatedAt,
			};
			if (existing) {
				const listed = await tablesDB.listRows({
					databaseId: dbId(),
					tableId: draftsTableId(),
					queries: [Query.equal("orgId", draft.orgId), Query.limit(1)],
				});
				const rowId = String((listed.rows[0] as Record<string, unknown>).$id);
				await tablesDB.updateRow({
					databaseId: dbId(),
					tableId: draftsTableId(),
					rowId,
					data,
				});
				return;
			}
			await tablesDB.createRow({
				databaseId: dbId(),
				tableId: draftsTableId(),
				rowId: ID.unique(),
				data,
			});
		},

		async getPublished(orgId) {
			const { tablesDB } = await createAdminClient();
			const result = await tablesDB.listRows({
				databaseId: dbId(),
				tableId: publishedTableId(),
				queries: [Query.equal("orgId", orgId), Query.limit(1)],
			});
			const row = result.rows[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			return {
				orgId,
				payload: parsePayload(row.payload),
				liveVersionNumber: Number(row.liveVersionNumber ?? 0),
				publishedAt: String(row.publishedAt ?? ""),
				publishedByUserId: String(row.publishedByUserId ?? ""),
			};
		},

		async savePublished(published) {
			const { tablesDB } = await createAdminClient();
			const existing = await this.getPublished(published.orgId);
			const data = {
				orgId: published.orgId,
				payload: serializePayload(published.payload),
				liveVersionNumber: published.liveVersionNumber,
				publishedAt: published.publishedAt,
				publishedByUserId: published.publishedByUserId,
			};
			if (existing) {
				const listed = await tablesDB.listRows({
					databaseId: dbId(),
					tableId: publishedTableId(),
					queries: [Query.equal("orgId", published.orgId), Query.limit(1)],
				});
				const rowId = String((listed.rows[0] as Record<string, unknown>).$id);
				await tablesDB.updateRow({
					databaseId: dbId(),
					tableId: publishedTableId(),
					rowId,
					data,
				});
				return;
			}
			await tablesDB.createRow({
				databaseId: dbId(),
				tableId: publishedTableId(),
				rowId: ID.unique(),
				data,
			});
		},

		async listVersions(orgId) {
			const { tablesDB } = await createAdminClient();
			const result = await tablesDB.listRows({
				databaseId: dbId(),
				tableId: versionsTableId(),
				queries: [
					Query.equal("orgId", orgId),
					Query.orderDesc("versionNumber"),
					Query.limit(100),
				],
			});
			return (result.rows as Record<string, unknown>[]).map((row) => ({
				orgId,
				versionNumber: Number(row.versionNumber),
				snapshot: parsePayload(row.snapshot),
				publishedByUserId: String(row.publishedByUserId ?? ""),
				publishedByName: String(row.publishedByName ?? ""),
				publishedAt: String(row.publishedAt ?? ""),
				changeSummary: row.changeSummary
					? String(row.changeSummary)
					: undefined,
				isLive: row.isLive === true,
			}));
		},

		async appendVersion(version) {
			const { tablesDB } = await createAdminClient();
			await tablesDB.createRow({
				databaseId: dbId(),
				tableId: versionsTableId(),
				rowId: ID.unique(),
				data: {
					orgId: version.orgId,
					versionNumber: version.versionNumber,
					snapshot: serializePayload(version.snapshot),
					publishedByUserId: version.publishedByUserId,
					publishedByName: version.publishedByName,
					publishedAt: version.publishedAt,
					changeSummary: version.changeSummary ?? null,
					isLive: version.isLive,
				},
			});
		},

		async markLiveVersion(orgId, versionNumber) {
			const versions = await this.listVersions(orgId);
			const { tablesDB } = await createAdminClient();
			const listed = await tablesDB.listRows({
				databaseId: dbId(),
				tableId: versionsTableId(),
				queries: [Query.equal("orgId", orgId), Query.limit(100)],
			});
			for (const row of listed.rows as Record<string, unknown>[]) {
				const vn = Number(row.versionNumber);
				const shouldLive = vn === versionNumber;
				if (Boolean(row.isLive) === shouldLive) continue;
				await tablesDB.updateRow({
					databaseId: dbId(),
					tableId: versionsTableId(),
					rowId: String(row.$id),
					data: { isLive: shouldLive },
				});
			}
			void versions;
		},

		async appendPriceReplacements(rows) {
			const { tablesDB } = await createAdminClient();
			for (const row of rows) {
				await tablesDB.createRow({
					databaseId: dbId(),
					tableId: priceReplacementsTableId(),
					rowId: ID.unique(),
					data: {
						orgId: row.orgId,
						amountCents: row.amountCents,
						stripePriceId: row.stripePriceId,
						replacedByPriceId: row.replacedByPriceId,
						replacedAt: row.replacedAt,
					},
				});
			}
		},

		async listPriceReplacements(orgId) {
			const { tablesDB } = await createAdminClient();
			const result = await tablesDB.listRows({
				databaseId: dbId(),
				tableId: priceReplacementsTableId(),
				queries: [Query.equal("orgId", orgId), Query.limit(200)],
			});
			return (result.rows as Record<string, unknown>[]).map((row) => ({
				orgId,
				amountCents: Number(row.amountCents),
				stripePriceId: String(row.stripePriceId),
				replacedByPriceId: String(row.replacedByPriceId),
				replacedAt: String(row.replacedAt),
			}));
		},
	};
}
