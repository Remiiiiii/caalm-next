import type { UIFileDoc } from "@/types/files";

export type StatusTab = "all" | "active" | "pending" | "expiring" | "expired";
export type DensityMode = "comfortable" | "compact";
export type ViewType = "table" | "card";

export interface ContractFilters {
	status?: string;
	uploadedOnFrom?: Date;
	uploadedOnTo?: Date;
	expiresOnFrom?: Date;
	expiresOnTo?: Date;
	department?: string;
	assignedTo?: string;
	contractType?: string;
	searchQuery?: string;
}

export interface SavedContractView {
	id: string;
	name: string;
	statusTab: StatusTab;
	filters: {
		status?: string;
		uploadedOnFrom?: string;
		uploadedOnTo?: string;
		expiresOnFrom?: string;
		expiresOnTo?: string;
		department?: string;
		assignedTo?: string;
		contractType?: string;
		searchQuery?: string;
	};
	view: ViewType;
	density: DensityMode;
}

export const VIEW_STORAGE_KEY = "contracts-view-preference";
export const DENSITY_STORAGE_KEY = "contracts-density-preference";
export const SAVED_VIEWS_STORAGE_KEY = "contracts-saved-views";

export function parseExpiryDate(raw?: string | null): Date | null {
	if (!raw) return null;
	const expiryStr = raw.split("T")[0];
	const [year, month, day] = expiryStr.split("-").map(Number);
	if (!year || !month || !day) return null;
	const d = new Date(year, month - 1, day);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function isExpiringWithinDays(
	file: UIFileDoc,
	days: number,
): boolean {
	const expiry = parseExpiryDate(file.contractExpiryDate);
	if (!expiry) return false;
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const end = new Date(now);
	end.setDate(now.getDate() + days);
	const status = (file.status || "").toLowerCase();
	if (status === "expired" || file.isExpired) return false;
	return expiry >= now && expiry <= end;
}

export function isContractExpired(file: UIFileDoc): boolean {
	const status = (file.status || "").toLowerCase();
	if (status === "expired" || file.isExpired) return true;
	const expiry = parseExpiryDate(file.contractExpiryDate);
	if (!expiry) return false;
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	return expiry < now;
}

export function matchesStatusTab(file: UIFileDoc, tab: StatusTab): boolean {
	if (tab === "all") return true;
	if (tab === "active") return file.status === "active" && !isContractExpired(file);
	if (tab === "pending") {
		return (
			file.status === "pending-review" || file.status === "action-required"
		);
	}
	if (tab === "expiring") return isExpiringWithinDays(file, 90);
	if (tab === "expired") return isContractExpired(file);
	return true;
}

export function getExpiryUrgency(
	file: UIFileDoc,
): "none" | "expired" | "30" | "60" | "90" {
	if (isContractExpired(file)) return "expired";
	if (isExpiringWithinDays(file, 30)) return "30";
	if (isExpiringWithinDays(file, 60)) return "60";
	if (isExpiringWithinDays(file, 90)) return "90";
	return "none";
}

export function serializeFilters(filters: ContractFilters) {
	return {
		status: filters.status,
		uploadedOnFrom: filters.uploadedOnFrom?.toISOString(),
		uploadedOnTo: filters.uploadedOnTo?.toISOString(),
		expiresOnFrom: filters.expiresOnFrom?.toISOString(),
		expiresOnTo: filters.expiresOnTo?.toISOString(),
		department: filters.department,
		assignedTo: filters.assignedTo,
		contractType: filters.contractType,
		searchQuery: filters.searchQuery,
	};
}

export function deserializeFilters(
	raw: SavedContractView["filters"],
): ContractFilters {
	return {
		status: raw.status,
		uploadedOnFrom: raw.uploadedOnFrom
			? new Date(raw.uploadedOnFrom)
			: undefined,
		uploadedOnTo: raw.uploadedOnTo ? new Date(raw.uploadedOnTo) : undefined,
		expiresOnFrom: raw.expiresOnFrom
			? new Date(raw.expiresOnFrom)
			: undefined,
		expiresOnTo: raw.expiresOnTo ? new Date(raw.expiresOnTo) : undefined,
		department: raw.department,
		assignedTo: raw.assignedTo,
		contractType: raw.contractType,
		searchQuery: raw.searchQuery,
	};
}

export function countActiveAdvancedFilters(filters: ContractFilters): number {
	let count = 0;
	if (filters.status) count++;
	if (filters.contractType) count++;
	if (filters.uploadedOnFrom || filters.uploadedOnTo) count++;
	if (filters.expiresOnFrom || filters.expiresOnTo) count++;
	if (filters.department) count++;
	if (filters.assignedTo) count++;
	return count;
}
