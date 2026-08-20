/**
 * Plan limit resolution + enforcement.
 * Blocks invite / contract create / upload when the org is at its tier cap.
 */

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getOrganization } from "@/lib/rbac/organizations";
import {
	type PricingTier,
	TIER_LIMITS,
} from "@/lib/stripe/prices";

export type PlanLimitKind = "users" | "contracts" | "licenses" | "storage";

export class PlanLimitError extends Error {
	readonly code = "PLAN_LIMIT_EXCEEDED";
	readonly kind: PlanLimitKind;
	readonly limit: number;
	readonly used: number;
	readonly tier: PricingTier;

	constructor(params: {
		kind: PlanLimitKind;
		limit: number;
		used: number;
		tier: PricingTier;
		message?: string;
	}) {
		const unit =
			params.kind === "storage"
				? "bytes"
				: params.kind === "users"
					? "staff users"
					: params.kind;
		super(
			params.message ||
				`Plan limit reached: ${params.used}/${params.limit} ${unit} on the ${params.tier} plan. Upgrade in Settings → Billing to continue.`,
		);
		this.name = "PlanLimitError";
		this.kind = params.kind;
		this.limit = params.limit;
		this.used = params.used;
		this.tier = params.tier;
	}
}

export function resolveTier(raw: unknown): PricingTier {
	const value = String(raw || "starter")
		.toLowerCase()
		.trim();
	if (value in TIER_LIMITS) return value as PricingTier;
	return "starter";
}

export async function getOrgPlanLimits(orgId: string) {
	const org = await getOrganization(orgId);
	if (!org) {
		throw new Error("Organization not found");
	}
	const tier = resolveTier(org.subscriptionTier);
	const base = TIER_LIMITS[tier];
	const settings = org.settings || {};
	return {
		org,
		tier,
		limits: {
			maxUsers:
				typeof settings.maxUsers === "number" && settings.maxUsers > 0
					? settings.maxUsers
					: base.maxUsers,
			maxDepartments:
				typeof settings.maxDepartments === "number" &&
				Number.isFinite(settings.maxDepartments) &&
				settings.maxDepartments > 0
					? settings.maxDepartments
					: base.maxDepartments,
			maxContracts: base.maxContracts,
			maxLicenses: base.maxLicenses,
			storageBytes: base.storageBytes,
		},
	};
}

async function countByOrg(tableId: string, orgId: string): Promise<number> {
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId,
			queries: [Query.equal("orgId", orgId), Query.limit(1)],
		});
		return result.total ?? 0;
	} catch (error) {
		console.error(`[planLimits] count failed for ${tableId}:`, error);
		return 0;
	}
}

async function countPendingInvitations(orgId: string): Promise<number> {
	try {
		const { tablesDB } = await createAdminClient();
		const tableId =
			appwriteConfig.invitationsCollectionId || "invitations";
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId,
			queries: [
				Query.equal("orgId", orgId),
				Query.equal("status", "pending"),
				Query.equal("revoked", false),
				Query.limit(1),
			],
		});
		return result.total ?? 0;
	} catch {
		return 0;
	}
}

export async function countBillableUsers(orgId: string): Promise<number> {
	const members = await countByOrg(
		appwriteConfig.usersCollectionId || "users",
		orgId,
	);
	const pending = await countPendingInvitations(orgId);
	return members + pending;
}

export async function countActiveContracts(orgId: string): Promise<number> {
	return countByOrg(
		appwriteConfig.contractsCollectionId || "contracts",
		orgId,
	);
}

export async function countActiveLicenses(orgId: string): Promise<number> {
	return countByOrg(
		appwriteConfig.licensesCollectionId || "licenses",
		orgId,
	);
}

export async function sumOrgStorageBytes(orgId: string): Promise<number> {
	try {
		const { tablesDB } = await createAdminClient();
		const tableId = appwriteConfig.filesCollectionId || "files";
		let offset = 0;
		const pageSize = 100;
		let total = 0;
		for (;;) {
			const page = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId,
				queries: [
					Query.equal("orgId", orgId),
					Query.select(["size"]),
					Query.limit(pageSize),
					Query.offset(offset),
				],
			});
			for (const row of page.rows) {
				const size = Number((row as { size?: number }).size || 0);
				if (Number.isFinite(size) && size > 0) total += size;
			}
			if (page.rows.length < pageSize) break;
			offset += pageSize;
			if (offset > 50_000) break; // safety cap
		}
		return total;
	} catch (error) {
		console.error("[planLimits] storage sum failed:", error);
		return 0;
	}
}

export async function assertCanInviteUser(orgId: string): Promise<void> {
	const { tier, limits } = await getOrgPlanLimits(orgId);
	if (!Number.isFinite(limits.maxUsers)) return;
	const used = await countBillableUsers(orgId);
	if (used >= limits.maxUsers) {
		throw new PlanLimitError({
			kind: "users",
			limit: limits.maxUsers,
			used,
			tier,
		});
	}
}

export async function assertCanCreateContract(orgId: string): Promise<void> {
	const { tier, limits } = await getOrgPlanLimits(orgId);
	if (!Number.isFinite(limits.maxContracts)) return;
	const used = await countActiveContracts(orgId);
	if (used >= limits.maxContracts) {
		throw new PlanLimitError({
			kind: "contracts",
			limit: limits.maxContracts,
			used,
			tier,
		});
	}
}

export async function assertCanCreateLicense(orgId: string): Promise<void> {
	const { tier, limits } = await getOrgPlanLimits(orgId);
	if (!Number.isFinite(limits.maxLicenses)) return;
	const used = await countActiveLicenses(orgId);
	if (used >= limits.maxLicenses) {
		throw new PlanLimitError({
			kind: "licenses",
			limit: limits.maxLicenses,
			used,
			tier,
		});
	}
}

export async function assertCanUploadBytes(
	orgId: string,
	incomingBytes: number,
): Promise<void> {
	const { tier, limits } = await getOrgPlanLimits(orgId);
	const used = await sumOrgStorageBytes(orgId);
	const next = used + Math.max(0, incomingBytes);
	if (next > limits.storageBytes) {
		throw new PlanLimitError({
			kind: "storage",
			limit: limits.storageBytes,
			used,
			tier,
			message: `Storage limit reached on the ${tier} plan (${formatBytes(used)} used of ${formatBytes(limits.storageBytes)}). Free space or upgrade in Settings → Billing.`,
		});
	}
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB", "TB"];
	let value = bytes / 1024;
	let i = 0;
	while (value >= 1024 && i < units.length - 1) {
		value /= 1024;
		i += 1;
	}
	return `${value.toFixed(1)} ${units[i]}`;
}

export function isPlanLimitError(error: unknown): error is PlanLimitError {
	return (
		error instanceof PlanLimitError ||
		(typeof error === "object" &&
			error !== null &&
			(error as { code?: string }).code === "PLAN_LIMIT_EXCEEDED")
	);
}
