import type { UIFileDoc } from "@/types/files";

export type StatusTab = "all" | "active" | "pending" | "expiring" | "expired";
export type DensityMode = "comfortable" | "compact";
export type ViewType = "table" | "card";

export interface ContractFilters {
	status?: string[];
	uploadedOnFrom?: Date;
	uploadedOnTo?: Date;
	expiresOnFrom?: Date;
	expiresOnTo?: Date;
	department?: string[];
	assignedTo?: string[];
	contractType?: string[];
	searchQuery?: string;
}

type SavedFilterList = string | string[];

export interface SavedContractView {
	id: string;
	name: string;
	statusTab: StatusTab;
	filters: {
		status?: SavedFilterList;
		uploadedOnFrom?: string;
		uploadedOnTo?: string;
		expiresOnFrom?: string;
		expiresOnTo?: string;
		department?: SavedFilterList;
		assignedTo?: SavedFilterList;
		contractType?: SavedFilterList;
		searchQuery?: string;
	};
	view: ViewType;
	density: DensityMode;
}

/** Turns a saved string or string[] into a clean list. Old views stored one value. */
export function asFilterList(value?: SavedFilterList): string[] | undefined {
	if (Array.isArray(value)) {
		const list = value.filter(
			(item): item is string => typeof item === "string" && item.trim().length > 0,
		);
		return list.length > 0 ? list : undefined;
	}
	if (typeof value === "string" && value.trim()) return [value];
	return undefined;
}

function matchesAny(selected: string[] | undefined, value?: string | null): boolean {
	if (!selected?.length) return true;
	if (!value) return false;
	return selected.includes(value);
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

export function isExpiringWithinDays(file: UIFileDoc, days: number): boolean {
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
	if (tab === "active")
		return file.status === "active" && !isContractExpired(file);
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
		status: asFilterList(raw.status),
		uploadedOnFrom: raw.uploadedOnFrom
			? new Date(raw.uploadedOnFrom)
			: undefined,
		uploadedOnTo: raw.uploadedOnTo ? new Date(raw.uploadedOnTo) : undefined,
		expiresOnFrom: raw.expiresOnFrom ? new Date(raw.expiresOnFrom) : undefined,
		expiresOnTo: raw.expiresOnTo ? new Date(raw.expiresOnTo) : undefined,
		department: asFilterList(raw.department),
		assignedTo: asFilterList(raw.assignedTo),
		contractType: asFilterList(raw.contractType),
		searchQuery: raw.searchQuery,
	};
}

export function countActiveAdvancedFilters(filters: ContractFilters): number {
	let count = 0;
	if (filters.status?.length) count += filters.status.length;
	if (filters.contractType?.length) count += filters.contractType.length;
	if (filters.uploadedOnFrom || filters.uploadedOnTo) count++;
	if (filters.expiresOnFrom || filters.expiresOnTo) count++;
	if (filters.department?.length) count += filters.department.length;
	if (filters.assignedTo?.length) count += filters.assignedTo.length;
	return count;
}

export function matchesContractFilters(
	file: UIFileDoc,
	filters: ContractFilters,
): boolean {
	if (!matchesAny(filters.status, file.status)) return false;
	if (!matchesAny(filters.contractType, file.contractType)) return false;
	if (!matchesAny(filters.department, file.department)) return false;

	if (filters.assignedTo?.length) {
		const selected = new Set(
			filters.assignedTo.map((name) => name.toLowerCase()),
		);
		const managers = file.assignedManagers || [];
		const hasMatch = managers.some((manager) =>
			selected.has(manager.toLowerCase()),
		);
		if (!hasMatch) return false;
	}

	if (filters.uploadedOnFrom || filters.uploadedOnTo) {
		const uploadedDate = file.$createdAt ? new Date(file.$createdAt) : null;
		if (!uploadedDate) return false;

		if (filters.uploadedOnFrom) {
			const fromDate = new Date(filters.uploadedOnFrom);
			fromDate.setHours(0, 0, 0, 0);
			if (uploadedDate < fromDate) return false;
		}

		if (filters.uploadedOnTo) {
			const toDate = new Date(filters.uploadedOnTo);
			toDate.setHours(23, 59, 59, 999);
			if (uploadedDate > toDate) return false;
		}
	}

	if (filters.expiresOnFrom || filters.expiresOnTo) {
		const expiryDate = file.contractExpiryDate
			? new Date(file.contractExpiryDate)
			: null;
		if (!expiryDate) return false;

		if (filters.expiresOnFrom) {
			const fromDate = new Date(filters.expiresOnFrom);
			fromDate.setHours(0, 0, 0, 0);
			if (expiryDate < fromDate) return false;
		}

		if (filters.expiresOnTo) {
			const toDate = new Date(filters.expiresOnTo);
			toDate.setHours(23, 59, 59, 999);
			if (expiryDate > toDate) return false;
		}
	}

	if (filters.searchQuery) {
		const query = filters.searchQuery.toLowerCase();
		const matchesName = (file.contractName || file.name || "")
			.toLowerCase()
			.includes(query);
		const matchesNumber = (file.contractNumber || "")
			.toLowerCase()
			.includes(query);
		const matchesVendor = (file.vendor || "").toLowerCase().includes(query);
		if (!matchesName && !matchesNumber && !matchesVendor) return false;
	}

	return true;
}

export function applyContractListFilters(
	files: UIFileDoc[],
	filters: ContractFilters,
	statusTab: StatusTab,
): UIFileDoc[] {
	return files.filter(
		(file) =>
			matchesStatusTab(file, statusTab) && matchesContractFilters(file, filters),
	);
}
