import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	AuditEvidenceRow,
	AuditEvidenceStatus,
	ComplianceRagStatus,
	ComplianceStatusSnapshot,
	LiveContractCompliance,
	LiveLicenseCompliance,
} from "@/lib/audits/types";
import {
	buildContractQueries,
	getContractListScope,
} from "@/lib/rbac/data-scope";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";

const COMPLIANT_CONTRACT_STATUSES = new Set(["up-to-date", "compliant"]);

function mapContractComplianceToStatus(
	compliance?: string | null,
): AuditEvidenceStatus {
	switch (compliance) {
		case "non-compliant":
			return "non_compliant";
		case "action-required":
			return "at_risk";
		case "up-to-date":
		case "compliant":
			return "compliant";
		default:
			return "pending";
	}
}

function mapLicenseComplianceToStatus(
	compliance?: string | null,
	status?: string | null,
): AuditEvidenceStatus {
	if (compliance === "non-compliant" || status === "expired") {
		return "non_compliant";
	}
	if (
		compliance === "at-risk" ||
		compliance === "action-required" ||
		status === "action-required" ||
		status === "pending-review"
	) {
		return "at_risk";
	}
	if (status === "active") return "compliant";
	return "pending";
}

function computeRagStatus(score: number): ComplianceRagStatus {
	if (score >= 85) return "green";
	if (score >= 70) return "amber";
	return "red";
}

async function fetchContractCompliance(
	userId: string,
	orgId: string,
): Promise<LiveContractCompliance | null> {
	const scope = await getContractListScope(userId, orgId);
	const scopeQueries = buildContractQueries(scope);
	const { tablesDB } = await createAdminClient();

	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		queries: [...scopeQueries, Query.limit(500)],
	});

	const contracts = result.rows as Array<{
		$id: string;
		contractName?: string;
		name?: string;
		compliance?: string;
		contractExpiryDate?: string;
		assignedManager?: string;
		department?: string;
	}>;

	const buckets: Record<string, number> = {
		"up-to-date": 0,
		"action-required": 0,
		"non-compliant": 0,
		unknown: 0,
	};

	const now = new Date();
	const ninetyDays = new Date();
	ninetyDays.setDate(now.getDate() + 90);

	let expiringSoon = 0;
	const evidence: AuditEvidenceRow[] = [];

	for (const contract of contracts) {
		const key = contract.compliance ?? "unknown";
		if (buckets[key] === undefined) buckets.unknown += 1;
		else buckets[key] += 1;

		if (contract.contractExpiryDate) {
			const expiry = new Date(contract.contractExpiryDate);
			if (expiry >= now && expiry <= ninetyDays) expiringSoon += 1;
		}

		if (
			contract.compliance === "non-compliant" ||
			contract.compliance === "action-required"
		) {
			evidence.push({
				id: contract.$id.slice(0, 8).toUpperCase(),
				title: contract.contractName || contract.name || "Unnamed contract",
				owner: contract.assignedManager || contract.department || "Unassigned",
				status: mapContractComplianceToStatus(contract.compliance),
				dueDate: contract.contractExpiryDate || now.toISOString().split("T")[0],
				category: contract.compliance,
				moduleLink: "/contracts",
				moduleLabel: "Contracts",
			});
		}
	}

	const total = contracts.length;
	const compliantCount = contracts.filter((c) =>
		COMPLIANT_CONTRACT_STATUSES.has(c.compliance ?? ""),
	).length;
	const complianceRate =
		total > 0 ? Math.round((compliantCount / total) * 100) : 0;

	return {
		total,
		complianceRate,
		buckets,
		expiringSoon,
		evidence: evidence.slice(0, 10),
	};
}

async function fetchLicenseCompliance(
	orgId: string,
): Promise<LiveLicenseCompliance | null> {
	const { licenses } = await LicenseService.listLicenses(orgId, undefined, {
		limit: 500,
		offset: 0,
	});
	const expiring = await LicenseService.getExpiringLicenses(orgId, 30);

	const complianceBuckets: Record<string, number> = {
		compliant: 0,
		"at-risk": 0,
		"action-required": 0,
		"non-compliant": 0,
		unknown: 0,
	};

	let active = 0;
	let atRisk = 0;
	const evidence: AuditEvidenceRow[] = [];

	for (const license of licenses) {
		if (license.status === "active") active += 1;

		const bucket = license.compliance ?? "unknown";
		if (complianceBuckets[bucket] === undefined) complianceBuckets.unknown += 1;
		else complianceBuckets[bucket] += 1;

		if (
			license.compliance === "at-risk" ||
			license.compliance === "action-required" ||
			license.compliance === "non-compliant" ||
			license.status === "action-required" ||
			license.status === "pending-review"
		) {
			atRisk += 1;
			evidence.push({
				id: license.$id.slice(0, 8).toUpperCase(),
				title: license.licenseName,
				owner: license.issuingAuthority || license.division || "Unassigned",
				status: mapLicenseComplianceToStatus(
					license.compliance,
					license.status,
				),
				dueDate:
					license.licenseExpiryDate ||
					new Date().toISOString().split("T")[0],
				category: license.licenseType,
				moduleLink: "/licenses",
				moduleLabel: "Licenses",
			});
		}
	}

	for (const license of expiring) {
		if (evidence.some((row) => row.id === license.$id.slice(0, 8).toUpperCase())) {
			continue;
		}
		evidence.push({
			id: license.$id.slice(0, 8).toUpperCase(),
			title: license.licenseName,
			owner: license.issuingAuthority || license.division || "Unassigned",
			status: "at_risk",
			dueDate:
				license.licenseExpiryDate || new Date().toISOString().split("T")[0],
			category: "Expiring soon",
			moduleLink: "/licenses",
			moduleLabel: "Licenses",
		});
	}

	const compliantCount = complianceBuckets.compliant ?? 0;

	return {
		total: licenses.length,
		active,
		expiringSoon: expiring.length,
		atRisk,
		complianceBuckets,
		evidence: evidence.slice(0, 10),
	};
}

export async function getComplianceStatusSnapshot(
	userId: string,
): Promise<ComplianceStatusSnapshot> {
	const defaultOrg = await getUserDefaultOrganization(userId);
	const permissions = await getUserPermissions(userId, defaultOrg?.orgId);

	const canViewContracts = permissions.includes(PERMISSIONS.CONTRACTS.VIEW);
	const canViewLicenses = permissions.includes(PERMISSIONS.LICENSES.VIEW);

	let contracts: LiveContractCompliance | null = null;
	let licenses: LiveLicenseCompliance | null = null;

	if (defaultOrg?.orgId) {
		if (canViewContracts) {
			contracts = await fetchContractCompliance(userId, defaultOrg.orgId);
		}
		if (canViewLicenses) {
			licenses = await fetchLicenseCompliance(defaultOrg.orgId);
		}
	}

	const contractComplianceRate = contracts?.complianceRate ?? null;
	const licenseRenewalHealth =
		licenses && licenses.total > 0
			? Math.round(
					((licenses.complianceBuckets.compliant ?? 0) / licenses.total) * 100,
				)
			: null;

	const scoreParts: number[] = [88];
	if (contractComplianceRate !== null) scoreParts.push(contractComplianceRate);
	if (licenseRenewalHealth !== null) scoreParts.push(licenseRenewalHealth);

	const overallScore = Math.round(
		scoreParts.reduce((sum, value) => sum + value, 0) / scoreParts.length,
	);

	const areasAtRisk =
		(contracts?.buckets["action-required"] ?? 0) +
		(contracts?.buckets["non-compliant"] ?? 0) +
		(licenses?.atRisk ?? 0);

	const upcomingDeadlines =
		(contracts?.expiringSoon ?? 0) + (licenses?.expiringSoon ?? 0) + 4;

	return {
		overview: {
			ragStatus: computeRagStatus(overallScore),
			overallScore,
			areasAtRisk,
			upcomingDeadlines,
			filingsOnTime: 100,
			contractComplianceRate,
			licenseRenewalHealth,
		},
		contracts,
		licenses,
		sources: {
			contracts: canViewContracts && contracts !== null,
			licenses: canViewLicenses && licenses !== null,
		},
	};
}

export async function getComplianceStatusForRequest(): Promise<ComplianceStatusSnapshot | null> {
	const user = await getCurrentUser();
	if (!user) return null;
	return getComplianceStatusSnapshot(user.$id);
}
