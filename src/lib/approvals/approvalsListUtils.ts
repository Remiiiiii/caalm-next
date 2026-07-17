import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";

export type ApprovalEntity = "contract" | "license";

export type ApprovalTab =
	| "needs-me"
	| "pending-review"
	| "action-required"
	| "recently-decided";

export interface ApprovalFilters {
	searchQuery?: string;
	department?: string;
	assignedTo?: string;
	itemType?: string;
	submittedFrom?: Date;
	submittedTo?: Date;
}

export interface SavedApprovalView {
	id: string;
	name: string;
	tab: ApprovalTab;
	filters: {
		searchQuery?: string;
		department?: string;
		assignedTo?: string;
		itemType?: string;
		submittedFrom?: string;
		submittedTo?: string;
	};
}

export interface ApprovalQueueItem {
	id: string;
	entity: ApprovalEntity;
	title: string;
	subtitle?: string;
	itemType?: string;
	department?: string;
	assignees: string[];
	status: string;
	submittedAt: string;
	updatedAt: string;
	amount?: number;
	vendor?: string;
	documentUrl?: string;
	bucketFileId?: string;
	fileExtension?: string;
	fileSize?: number;
	ownerLabel?: string;
	/** Contract row id or license id used for status updates */
	decisionId: string;
	rawContract?: UIFileDoc;
	rawLicense?: License;
}

export const APPROVALS_SAVED_VIEWS_KEY = "approvals-saved-views";

export function daysSince(iso: string): number {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return 0;
	const now = new Date();
	const ms = now.getTime() - d.getTime();
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function isAgingUrgent(item: ApprovalQueueItem): boolean {
	const status = (item.status || "").toLowerCase();
	if (status !== "pending-review" && status !== "action-required") return false;
	return daysSince(item.submittedAt) >= 5;
}

export function isActionRequired(item: ApprovalQueueItem): boolean {
	return (item.status || "").toLowerCase() === "action-required";
}

export function matchesApprovalTab(
	item: ApprovalQueueItem,
	tab: ApprovalTab,
): boolean {
	const status = (item.status || "").toLowerCase();
	if (tab === "needs-me") {
		return status === "pending-review" || status === "action-required";
	}
	if (tab === "pending-review") return status === "pending-review";
	if (tab === "action-required") return status === "action-required";
	if (tab === "recently-decided") {
		if (status !== "active" && status !== "inactive") return false;
		return daysSince(item.updatedAt) <= 14;
	}
	return true;
}

export function applyApprovalFilters(
	items: ApprovalQueueItem[],
	filters: ApprovalFilters,
): ApprovalQueueItem[] {
	return items.filter((item) => {
		if (filters.searchQuery) {
			const q = filters.searchQuery.toLowerCase();
			const hay = [
				item.title,
				item.subtitle,
				item.vendor,
				item.itemType,
				item.department,
				...item.assignees,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			if (!hay.includes(q)) return false;
		}
		if (filters.department && item.department !== filters.department) {
			return false;
		}
		if (filters.assignedTo) {
			const term = filters.assignedTo.toLowerCase();
			const has = item.assignees.some((a) => a.toLowerCase().includes(term));
			if (!has) return false;
		}
		if (filters.itemType && item.itemType !== filters.itemType) {
			return false;
		}
		if (filters.submittedFrom || filters.submittedTo) {
			const submitted = new Date(item.submittedAt);
			if (Number.isNaN(submitted.getTime())) return false;
			if (filters.submittedFrom) {
				const from = new Date(filters.submittedFrom);
				from.setHours(0, 0, 0, 0);
				if (submitted < from) return false;
			}
			if (filters.submittedTo) {
				const to = new Date(filters.submittedTo);
				to.setHours(23, 59, 59, 999);
				if (submitted > to) return false;
			}
		}
		return true;
	});
}

export function countActiveApprovalFilters(filters: ApprovalFilters): number {
	let count = 0;
	if (filters.department) count++;
	if (filters.assignedTo) count++;
	if (filters.itemType) count++;
	if (filters.submittedFrom || filters.submittedTo) count++;
	return count;
}

export function contractToApprovalItem(file: UIFileDoc): ApprovalQueueItem {
	return {
		id: file.$id,
		entity: "contract",
		title: file.contractName || file.name || "Untitled Contract",
		subtitle: file.contractNumber ? `#${file.contractNumber}` : undefined,
		itemType: file.contractType,
		department: file.department,
		assignees: Array.isArray(file.assignedManagers)
			? file.assignedManagers
			: [],
		status: file.status || "pending-review",
		submittedAt: file.$createdAt,
		updatedAt: file.$updatedAt || file.$createdAt,
		amount: file.amount,
		vendor: file.vendor,
		documentUrl: file.url,
		bucketFileId: file.bucketFileId,
		fileExtension: file.extension,
		fileSize: file.size,
		ownerLabel:
			typeof file.owner === "object" && file.owner && "fullName" in file.owner
				? (file.owner as { fullName: string }).fullName
				: typeof file.owner === "string"
					? file.owner
					: undefined,
		decisionId: file.contractId || file.$id,
		rawContract: file,
	};
}

export function licenseToApprovalItem(license: License): ApprovalQueueItem {
	return {
		id: license.$id,
		entity: "license",
		title: license.licenseName || "Untitled License",
		subtitle: license.licenseNumber ? `#${license.licenseNumber}` : undefined,
		itemType: license.licenseType,
		department: license.division || license.department,
		assignees: Array.isArray(license.assignedManagers)
			? license.assignedManagers
			: [],
		status: license.status || "pending-review",
		submittedAt: license.$createdAt,
		updatedAt: license.$updatedAt || license.$createdAt,
		amount: license.cost,
		vendor: license.vendor,
		documentUrl: license.licenseUrl,
		bucketFileId: license.fileId,
		fileSize: license.fileSize,
		ownerLabel: license.createdBy,
		decisionId: license.$id,
		rawLicense: license,
	};
}

export function serializeApprovalFilters(filters: ApprovalFilters) {
	return {
		searchQuery: filters.searchQuery,
		department: filters.department,
		assignedTo: filters.assignedTo,
		itemType: filters.itemType,
		submittedFrom: filters.submittedFrom?.toISOString(),
		submittedTo: filters.submittedTo?.toISOString(),
	};
}

export function deserializeApprovalFilters(
	raw: SavedApprovalView["filters"],
): ApprovalFilters {
	return {
		searchQuery: raw.searchQuery,
		department: raw.department,
		assignedTo: raw.assignedTo,
		itemType: raw.itemType,
		submittedFrom: raw.submittedFrom ? new Date(raw.submittedFrom) : undefined,
		submittedTo: raw.submittedTo ? new Date(raw.submittedTo) : undefined,
	};
}

export function statusBadgeClasses(status: string): string {
	switch (status) {
		case "active":
			return "bg-green/10 text-green border-green/20";
		case "pending-review":
			return "bg-orange/10 text-orange border-orange/20";
		case "action-required":
			return "bg-red/10 text-red border-red/20";
		case "inactive":
			return "bg-slate-100 text-slate-600 border-slate-200";
		case "suspended":
			return "bg-red/10 text-red border-red/20";
		case "expired":
			return "bg-red/10 text-red border-red/20";
		default:
			return "bg-slate-100 text-slate-700 border-slate-200";
	}
}

export function statusLabel(status: string): string {
	return (status || "unknown").replace(/-/g, " ");
}
