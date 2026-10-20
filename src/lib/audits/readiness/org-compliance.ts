import { Query } from "node-appwrite";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { dedupeEvidenceRows } from "@/lib/audits/evidence-utils";
import type {
	AuditEvidenceRow,
	AuditEvidenceStatus,
	ComplianceStatusSnapshot,
	LiveContractCompliance,
	LiveLicenseCompliance,
} from "@/lib/audits/types";
import { excludeSoftDeletedQuery } from "@/lib/soft-delete";
import {
	contractCandidate,
	licenseCandidate,
	type EvidenceCandidate,
} from "./evidence-coverage";
import { groupRequirementIdsByRecord, listTagsForOrg } from "./record-tags";
import { computeLiveReadinessScore, computeRag } from "./score";

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

async function fetchContractsForOrg(orgId: string): Promise<{
	compliance: LiveContractCompliance;
	candidates: EvidenceCandidate[];
}> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		queries: [
			Query.equal("orgId", orgId),
			excludeSoftDeletedQuery(),
			Query.limit(500),
		],
	});

	const contracts = result.rows as Array<{
		$id: string;
		contractName?: string;
		name?: string;
		compliance?: string;
		contractExpiryDate?: string;
		assignedManager?: string;
		assignedManagers?: string[];
		contractOwnerId?: string;
		department?: string;
		vendor?: string;
		contractType?: string;
		division?: string;
		description?: string;
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
	const candidates: EvidenceCandidate[] = [];

	for (const contract of contracts) {
		candidates.push(contractCandidate(contract));
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
				id: contract.$id,
				title: contract.contractName || contract.name || "Unnamed contract",
				owner: contract.assignedManager || contract.department || "Unassigned",
				assignedManagers: contract.assignedManagers ?? [],
				assignedBy: contract.contractOwnerId,
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
		compliance: {
			total,
			complianceRate,
			buckets,
			expiringSoon,
			evidence: dedupeEvidenceRows(evidence).slice(0, 10),
		},
		candidates,
	};
}

async function fetchLicensesForOrg(orgId: string): Promise<{
	compliance: LiveLicenseCompliance;
	candidates: EvidenceCandidate[];
}> {
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
	let expired = 0;
	const evidence: AuditEvidenceRow[] = [];
	const candidates: EvidenceCandidate[] = [];
	const today = new Date().toISOString().split("T")[0];

	for (const license of licenses) {
		candidates.push(licenseCandidate(license));
		if (license.status === "active") active += 1;
		if (
			license.status === "expired" ||
			(license.licenseExpiryDate && license.licenseExpiryDate.slice(0, 10) < today)
		) {
			expired += 1;
		}
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
				id: license.$id,
				title: license.licenseName,
				owner: license.issuingAuthority || license.division || "Unassigned",
				assignedManagers: license.assignedManagers ?? [],
				assignedBy: (license as { licenseOwnerId?: string }).licenseOwnerId,
				status: mapLicenseComplianceToStatus(
					license.compliance,
					license.status,
				),
				dueDate:
					license.licenseExpiryDate || new Date().toISOString().split("T")[0],
				category: license.licenseType,
				moduleLink: "/licenses",
				moduleLabel: "Licenses",
			});
		}
	}

	for (const license of expiring) {
		if (evidence.some((row) => row.id === license.$id)) continue;
		evidence.push({
			id: license.$id,
			title: license.licenseName,
			owner: license.issuingAuthority || license.division || "Unassigned",
			assignedManagers: license.assignedManagers ?? [],
			assignedBy: (license as { licenseOwnerId?: string }).licenseOwnerId,
			status: "at_risk",
			dueDate:
				license.licenseExpiryDate || new Date().toISOString().split("T")[0],
			category: "Expiring soon",
			moduleLink: "/licenses",
			moduleLabel: "Licenses",
		});
	}

	return {
		compliance: {
			total: licenses.length,
			active,
			expiringSoon: expiring.length,
			atRisk,
			expired,
			complianceBuckets,
			evidence: dedupeEvidenceRows(evidence).slice(0, 10),
		},
		candidates,
	};
}

/** Admin/cron org-scoped snapshot (no user permission gating). */
export async function getOrgComplianceSnapshot(
	orgId: string,
): Promise<
	ComplianceStatusSnapshot & {
		sourcesUsed: string[];
		liveScore: number | null;
		evidenceCandidates: EvidenceCandidate[];
	}
> {
	const { compliance: contracts, candidates: contractCandidates } =
		await fetchContractsForOrg(orgId);
	const { compliance: licenses, candidates: licenseCandidates } =
		await fetchLicensesForOrg(orgId);
	const tagsByRecord = groupRequirementIdsByRecord(
		await listTagsForOrg(orgId).catch(() => []),
	);
	const attachTags = (candidate: EvidenceCandidate): EvidenceCandidate => ({
		...candidate,
		requirementIds:
			tagsByRecord.get(`${candidate.kind}:${candidate.id}`) ?? [],
	});

	const contractComplianceRate =
		contracts.total > 0 ? contracts.complianceRate : null;
	const licenseRenewalHealth =
		licenses.total > 0
			? Math.round(
					((licenses.complianceBuckets.compliant ?? 0) / licenses.total) * 100,
				)
			: null;

	const { score, sourcesUsed } = computeLiveReadinessScore({
		contractComplianceRate,
		licenseRenewalHealth,
	});

	const areasAtRisk =
		(contracts.buckets["action-required"] ?? 0) +
		(contracts.buckets["non-compliant"] ?? 0) +
		licenses.atRisk;

	const upcomingDeadlines = contracts.expiringSoon + licenses.expiringSoon;

	return {
		overview: {
			ragStatus: computeRag(score) ?? "red",
			overallScore: score ?? 0,
			areasAtRisk,
			upcomingDeadlines,
			filingsOnTime: 0,
			contractComplianceRate,
			licenseRenewalHealth,
		},
		contracts,
		licenses,
		sources: {
			contracts: contracts.total > 0,
			licenses: licenses.total > 0,
		},
		sourcesUsed,
		liveScore: score,
		evidenceCandidates: [
			...contractCandidates.map(attachTags),
			...licenseCandidates.map(attachTags),
		],
	};
}
