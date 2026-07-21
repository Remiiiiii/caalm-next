import type { License } from "@/types/licenses";

export type LicenseStatusTab =
	| "all"
	| "active"
	| "pending"
	| "expiring"
	| "expired"
	| "action-required"
	| "compliance-risk";

export type LicenseViewType = "table" | "card";

export interface LicenseFilters {
	status?: string;
	licenseType?: string;
	category?: string;
	compliance?: string;
	issueDateFrom?: Date;
	issueDateTo?: Date;
	expiryDateFrom?: Date;
	expiryDateTo?: Date;
	department?: string;
	assignedTo?: string;
	searchQuery?: string;
	autoRenew?: boolean;
	issuingAuthority?: string;
}

export interface SavedLicenseView {
	id: string;
	name: string;
	statusTab: LicenseStatusTab;
	filters: {
		status?: string;
		licenseType?: string;
		category?: string;
		compliance?: string;
		issueDateFrom?: string;
		issueDateTo?: string;
		expiryDateFrom?: string;
		expiryDateTo?: string;
		department?: string;
		assignedTo?: string;
		searchQuery?: string;
		autoRenew?: boolean;
		issuingAuthority?: string;
	};
	view: LicenseViewType;
}

export const LICENSE_VIEW_STORAGE_KEY = "licenses-view-preference";
export const LICENSE_SAVED_VIEWS_STORAGE_KEY = "licenses-saved-views";

export const LICENSE_STATUS_TAB_LABELS: Record<LicenseStatusTab, string> = {
	all: "All",
	active: "Active",
	pending: "Pending",
	expiring: "Expiring",
	expired: "Expired",
	"action-required": "Action required",
	"compliance-risk": "Compliance risk",
};

export function parseLicenseExpiryDate(raw?: string | null): Date | null {
	if (!raw) return null;
	const expiryStr = raw.split("T")[0];
	const [year, month, day] = expiryStr.split("-").map(Number);
	if (!year || !month || !day) return null;
	const d = new Date(year, month - 1, day);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function getLicenseExpiryRaw(license: License): string | undefined {
	return license.licenseExpiryDate || license.expirationDate || undefined;
}

export function isLicenseExpired(license: License): boolean {
	const status = (license.status || "").toLowerCase();
	if (status === "expired") return true;
	const expiry = parseLicenseExpiryDate(getLicenseExpiryRaw(license));
	if (!expiry) return false;
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	return expiry < now;
}

export function isLicenseExpiringWithinDays(
	license: License,
	days: number,
): boolean {
	const expiry = parseLicenseExpiryDate(getLicenseExpiryRaw(license));
	if (!expiry) return false;
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const end = new Date(now);
	end.setDate(now.getDate() + days);
	if (isLicenseExpired(license)) return false;
	return expiry >= now && expiry <= end;
}

export function isComplianceAtRisk(license: License): boolean {
	const c = license.compliance;
	return (
		c === "at-risk" ||
		c === "non-compliant" ||
		c === "action-required" ||
		license.status === "action-required"
	);
}

export function matchesStatusTab(
	license: License,
	tab: LicenseStatusTab,
): boolean {
	if (tab === "all") return true;
	if (tab === "active") {
		return license.status === "active" && !isLicenseExpired(license);
	}
	if (tab === "pending") {
		return (
			license.status === "pending-review" || license.status === "suspended"
		);
	}
	if (tab === "expiring") return isLicenseExpiringWithinDays(license, 90);
	if (tab === "expired") return isLicenseExpired(license);
	if (tab === "action-required") {
		return license.status === "action-required";
	}
	if (tab === "compliance-risk") return isComplianceAtRisk(license);
	return true;
}

export function countExpiringBuckets(licenses: License[]) {
	return {
		in30: licenses.filter((l) => isLicenseExpiringWithinDays(l, 30)).length,
		in60: licenses.filter((l) => {
			if (!isLicenseExpiringWithinDays(l, 60)) return false;
			return !isLicenseExpiringWithinDays(l, 30);
		}).length,
		in90: licenses.filter((l) => {
			if (!isLicenseExpiringWithinDays(l, 90)) return false;
			return !isLicenseExpiringWithinDays(l, 60);
		}).length,
	};
}

export interface LicenseMetrics {
	totalCost: number;
	totalLicenses: number;
	activeCount: number;
	pendingCount: number;
	actionRequiredCount: number;
	inactiveCount: number;
	expiredCount: number;
	complianceAtRiskCount: number;
	autoRenewWatchCount: number;
	renewalPipelineCount: number;
	renewalPipelineCost: number;
	totalQuantity: number;
	usedQuantity: number;
	utilizationRate: number;
	expiring: { in30: number; in60: number; in90: number };
	totalExpiring: number;
}

export function computeLicenseMetrics(licenses: License[]): LicenseMetrics {
	let totalCost = 0;
	let activeCount = 0;
	let pendingCount = 0;
	let actionRequiredCount = 0;
	let inactiveCount = 0;
	let expiredCount = 0;
	let complianceAtRiskCount = 0;
	let autoRenewWatchCount = 0;
	let renewalPipelineCount = 0;
	let renewalPipelineCost = 0;
	let totalQuantity = 0;
	let usedQuantity = 0;

	licenses.forEach((license) => {
		const status = license.status || "unknown";
		if (license.cost) totalCost += license.cost;

		if (status === "active" && !isLicenseExpired(license)) activeCount++;
		if (status === "pending-review" || status === "suspended") pendingCount++;
		if (status === "action-required") actionRequiredCount++;
		if (status === "inactive") inactiveCount++;
		if (isLicenseExpired(license)) expiredCount++;
		if (isComplianceAtRisk(license)) complianceAtRiskCount++;

		if (license.autoRenew && isLicenseExpiringWithinDays(license, 90)) {
			autoRenewWatchCount++;
		}

		if (isLicenseExpiringWithinDays(license, 120)) {
			renewalPipelineCount++;
			renewalPipelineCost += license.cost || 0;
		}

		if (license.quantity) {
			totalQuantity += license.quantity;
			if (license.availableQuantity !== undefined) {
				usedQuantity += license.quantity - license.availableQuantity;
			}
		}
	});

	const expiring = countExpiringBuckets(licenses);
	const totalExpiring = expiring.in30 + expiring.in60 + expiring.in90;
	const utilizationRate =
		totalQuantity > 0 ? (usedQuantity / totalQuantity) * 100 : 0;

	return {
		totalCost,
		totalLicenses: licenses.length,
		activeCount,
		pendingCount,
		actionRequiredCount,
		inactiveCount,
		expiredCount,
		complianceAtRiskCount,
		autoRenewWatchCount,
		renewalPipelineCount,
		renewalPipelineCost,
		totalQuantity,
		usedQuantity,
		utilizationRate,
		expiring,
		totalExpiring,
	};
}

export function serializeLicenseFilters(filters: LicenseFilters) {
	return {
		status: filters.status,
		licenseType: filters.licenseType,
		category: filters.category,
		compliance: filters.compliance,
		issueDateFrom: filters.issueDateFrom?.toISOString(),
		issueDateTo: filters.issueDateTo?.toISOString(),
		expiryDateFrom: filters.expiryDateFrom?.toISOString(),
		expiryDateTo: filters.expiryDateTo?.toISOString(),
		department: filters.department,
		assignedTo: filters.assignedTo,
		searchQuery: filters.searchQuery,
		autoRenew: filters.autoRenew,
		issuingAuthority: filters.issuingAuthority,
	};
}

export function deserializeLicenseFilters(
	raw: SavedLicenseView["filters"],
): LicenseFilters {
	return {
		status: raw.status,
		licenseType: raw.licenseType,
		category: raw.category,
		compliance: raw.compliance,
		issueDateFrom: raw.issueDateFrom ? new Date(raw.issueDateFrom) : undefined,
		issueDateTo: raw.issueDateTo ? new Date(raw.issueDateTo) : undefined,
		expiryDateFrom: raw.expiryDateFrom
			? new Date(raw.expiryDateFrom)
			: undefined,
		expiryDateTo: raw.expiryDateTo ? new Date(raw.expiryDateTo) : undefined,
		department: raw.department,
		assignedTo: raw.assignedTo,
		searchQuery: raw.searchQuery,
		autoRenew: raw.autoRenew,
		issuingAuthority: raw.issuingAuthority,
	};
}

export function countActiveAdvancedLicenseFilters(
	filters: LicenseFilters,
): number {
	let count = 0;
	if (filters.status) count++;
	if (filters.licenseType) count++;
	if (filters.category) count++;
	if (filters.compliance) count++;
	if (filters.issueDateFrom || filters.issueDateTo) count++;
	if (filters.expiryDateFrom || filters.expiryDateTo) count++;
	if (filters.department) count++;
	if (filters.assignedTo) count++;
	if (filters.autoRenew !== undefined) count++;
	if (filters.issuingAuthority) count++;
	return count;
}
