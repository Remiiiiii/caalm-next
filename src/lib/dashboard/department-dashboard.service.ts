import { Query } from "node-appwrite";
import { listCalendarApprovalRequests } from "@/lib/actions/calendar-approval.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	DepartmentActionItem,
	DepartmentContractAtRisk,
	DepartmentDashboardData,
	DepartmentRecentActivityItem,
} from "@/lib/dashboard/department-dashboard.types";
import {
	DIVISION_TO_DEPARTMENT,
	formatDivisionName,
	type UserDivision,
} from "../../../constants";

const EXPIRING_SOON_DAYS = 90;

interface ContractRow {
	$id: string;
	contractName?: string;
	name?: string;
	status?: string;
	contractExpiryDate?: string;
	amount?: number;
	division?: string;
	department?: string;
	assignedManagers?: string[];
	owner?: string;
	fileId?: string;
	isExpired?: boolean;
}

function daysUntil(dateStr?: string): number | null {
	if (!dateStr) return null;
	const expiry = new Date(dateStr);
	if (Number.isNaN(expiry.getTime())) return null;
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	const startOfExpiry = new Date(
		expiry.getFullYear(),
		expiry.getMonth(),
		expiry.getDate(),
	);
	return Math.ceil(
		(startOfExpiry.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
	);
}

function isExpiringSoon(dateStr?: string): boolean {
	const days = daysUntil(dateStr);
	return days !== null && days >= 0 && days <= EXPIRING_SOON_DAYS;
}

function isPendingReview(status?: string): boolean {
	const s = (status || "").toLowerCase();
	return (
		s === "pending" ||
		s === "pending-review" ||
		s === "action-required" ||
		s === "draft"
	);
}

function contractNeedsAttention(contract: ContractRow): boolean {
	if (isPendingReview(contract.status)) return true;
	if (contract.isExpired) return true;
	const days = daysUntil(contract.contractExpiryDate);
	return days !== null && days <= EXPIRING_SOON_DAYS;
}

async function fetchDivisionContracts(
	division: string,
): Promise<ContractRow[]> {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId!;
	const tableId = appwriteConfig.contractsCollectionId!;

	const fetchRows = async (
		field: "division" | "department",
		value: string,
	): Promise<ContractRow[]> => {
		try {
			const result = await tablesDB.listRows({
				databaseId,
				tableId,
				queries: [Query.equal(field, value), Query.limit(500)],
			});
			return result.rows as unknown as ContractRow[];
		} catch {
			return [];
		}
	};

	const mappedDepartment =
		DIVISION_TO_DEPARTMENT[division as UserDivision] || undefined;
	const department = mappedDepartment || division;

	const [byDivision, byDept] = await Promise.all([
		fetchRows("division", division),
		department !== division
			? fetchRows("department", department)
			: Promise.resolve([] as ContractRow[]),
	]);

	const merged = [...byDivision, ...byDept];
	if (merged.length > 0) {
		const seen = new Set<string>();
		return merged.filter((row) => {
			const id = row.$id;
			if (!id || seen.has(id)) return false;
			seen.add(id);
			return true;
		});
	}

	// Fallback: load a window and filter by division or department when present
	const all = await tablesDB.listRows({
		databaseId,
		tableId,
		queries: [Query.limit(500)],
	});
	return (all.rows as unknown as ContractRow[]).filter(
		(c) =>
			c.division === division ||
			c.department === division ||
			c.department === mappedDepartment,
	);
}

async function fetchDivisionLicenses(departmentLabel: string) {
	if (!appwriteConfig.licensesCollectionId) {
		return { total: 0, needsAttention: 0, ok: 0 };
	}
	try {
		const { tablesDB } = await createAdminClient();
		const response = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.licensesCollectionId,
			queries: [Query.equal("department", departmentLabel), Query.limit(200)],
		});
		const rows = response.rows as Array<Record<string, unknown>>;
		const needsAttention = rows.filter((row) => {
			const status = String(row.status || "").toLowerCase();
			const expiry = row.expiryDate || row.expirationDate || row.renewalDate;
			const days = daysUntil(typeof expiry === "string" ? expiry : undefined);
			return (
				status.includes("expir") ||
				status === "pending" ||
				(days !== null && days <= 90)
			);
		}).length;
		const total = response.total ?? rows.length;
		return {
			total,
			needsAttention,
			ok: Math.max(total - needsAttention, 0),
		};
	} catch {
		return { total: 0, needsAttention: 0, ok: 0 };
	}
}

async function fetchRecentActivity(
	departmentLabel: string,
): Promise<DepartmentRecentActivityItem[]> {
	if (!appwriteConfig.recentActivityCollectionId) return [];
	try {
		const { tablesDB } = await createAdminClient();
		const response = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.recentActivityCollectionId,
			queries: [Query.orderDesc("$createdAt"), Query.limit(40)],
		});
		const rows = response.rows as Array<Record<string, unknown>>;
		return rows
			.filter((row) => {
				const dept = String(row.department || "");
				return !dept || dept === departmentLabel;
			})
			.slice(0, 12)
			.map((row) => ({
				$id: String(row.$id || ""),
				action: String(row.action || "Activity"),
				description: String(row.description || ""),
				userName: row.userName ? String(row.userName) : undefined,
				department: row.department ? String(row.department) : undefined,
				timestamp: String(row.timestamp || row.$createdAt || ""),
				type: String(row.type || "contract"),
			}));
	} catch {
		return [];
	}
}

function buildActionQueue(params: {
	contracts: ContractRow[];
	pendingApprovals: number;
	approvalsHref: string;
}): DepartmentActionItem[] {
	const items: DepartmentActionItem[] = [];

	if (params.pendingApprovals > 0) {
		items.push({
			id: "approvals-pending",
			type: "approval",
			title: `Review ${params.pendingApprovals} pending calendar approval${params.pendingApprovals === 1 ? "" : "s"}`,
			href: params.approvalsHref,
			priority: "high",
			meta: "Calendar",
		});
	}

	const reviews = params.contracts.filter((c) => isPendingReview(c.status));
	for (const contract of reviews.slice(0, 5)) {
		items.push({
			id: `review-${contract.$id}`,
			type: "contract_review",
			title: `Review ${contract.contractName || contract.name || "contract"}`,
			dueDate: contract.contractExpiryDate,
			href: `/my-contracts`,
			priority: "high",
			meta: contract.status || "pending-review",
		});
	}

	const expiring = params.contracts
		.filter((c) => isExpiringSoon(c.contractExpiryDate) && !c.isExpired)
		.sort(
			(a, b) =>
				(daysUntil(a.contractExpiryDate) ?? 999) -
				(daysUntil(b.contractExpiryDate) ?? 999),
		);
	for (const contract of expiring.slice(0, 5)) {
		const days = daysUntil(contract.contractExpiryDate);
		items.push({
			id: `expiry-${contract.$id}`,
			type: "contract_expiry",
			title: `${contract.contractName || contract.name || "Contract"} expires soon`,
			dueDate: contract.contractExpiryDate,
			href: `/my-contracts`,
			priority: days !== null && days <= 30 ? "high" : "medium",
			meta:
				days !== null ? `${days} day${days === 1 ? "" : "s"} left` : undefined,
		});
	}

	const priorityRank = { high: 0, medium: 1, low: 2 } as const;
	return items
		.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
		.slice(0, 10);
}

function mapContractsAtRisk(
	contracts: ContractRow[],
): DepartmentContractAtRisk[] {
	return contracts
		.filter(contractNeedsAttention)
		.map((c) => ({
			$id: c.$id,
			contractName: c.contractName || c.name || "Untitled contract",
			status: c.status || "pending",
			contractExpiryDate: c.contractExpiryDate,
			owner: Array.isArray(c.assignedManagers)
				? c.assignedManagers[0]
				: c.owner,
			amount: c.amount,
			daysUntilExpiry: daysUntil(c.contractExpiryDate),
			fileId: c.fileId,
		}))
		.sort((a, b) => {
			const ad = a.daysUntilExpiry ?? 9999;
			const bd = b.daysUntilExpiry ?? 9999;
			return ad - bd;
		})
		.slice(0, 12);
}

/**
 * Build division-scoped department manager dashboard payload.
 */
export async function getDepartmentDashboardData(
	division: string,
): Promise<DepartmentDashboardData> {
	const departmentLabel =
		DIVISION_TO_DEPARTMENT[division as UserDivision] ||
		formatDivisionName(division as UserDivision) ||
		division;

	const [contracts, approvals, licenses, recentActivity] = await Promise.all([
		fetchDivisionContracts(division),
		listCalendarApprovalRequests({ status: "pending" }).catch(() => []),
		fetchDivisionLicenses(departmentLabel),
		fetchRecentActivity(departmentLabel),
	]);

	const totalContracts = contracts.length;
	const expiringSoon = contracts.filter((c) =>
		isExpiringSoon(c.contractExpiryDate),
	).length;
	const pendingContractReviews = contracts.filter((c) =>
		isPendingReview(c.status),
	).length;
	const pendingApprovals = approvals.length + pendingContractReviews;

	const healthyStatuses = new Set(["active", "signed", "completed"]);
	const healthy = contracts.filter((c) =>
		healthyStatuses.has((c.status || "").toLowerCase()),
	).length;
	const complianceRate =
		totalContracts > 0 ? Math.round((healthy / totalContracts) * 100) : null;

	const contractsNeedingAttention = contracts.filter(contractNeedsAttention);
	const contractsOk = Math.max(
		totalContracts - contractsNeedingAttention.length,
		0,
	);

	const actionQueue = buildActionQueue({
		contracts,
		pendingApprovals: approvals.length,
		approvalsHref: "/calendar",
	});

	// Also surface contract reviews in queue (already included via buildActionQueue)
	if (
		pendingContractReviews > 0 &&
		!actionQueue.some((i) => i.type === "contract_review")
	) {
		actionQueue.unshift({
			id: "contracts-pending-reviews",
			type: "contract_review",
			title: `Review ${pendingContractReviews} contract${pendingContractReviews === 1 ? "" : "s"} awaiting decision`,
			href: "/contracts/approvals",
			priority: "high",
			meta: "Contracts",
		});
	}

	return {
		division,
		departmentLabel,
		stats: {
			totalContracts,
			expiringSoon,
			pendingApprovals,
			complianceRate,
		},
		actionQueue: actionQueue.slice(0, 10),
		contractsAtRisk: mapContractsAtRisk(contracts),
		monitoring: {
			contracts: {
				label: "Contracts",
				needsAttention: contractsNeedingAttention.length,
				ok: contractsOk,
				total: totalContracts,
				href: "/my-contracts",
			},
			calendar: {
				label: "Calendar",
				needsAttention: approvals.length,
				ok: Math.max(0, approvals.length === 0 ? 1 : 0),
				total: Math.max(approvals.length, 1),
				href: "/calendar",
			},
			licenses: {
				label: "Licenses",
				needsAttention: licenses.needsAttention,
				ok: licenses.ok,
				total: licenses.total,
				href: "/licenses/department",
			},
			documents: {
				label: "Documents",
				needsAttention: 0,
				ok: 0,
				total: 0,
				href: "/documents",
			},
		},
		recentActivity,
		contractsForAlerts: contracts.map((c) => ({
			$id: c.$id,
			contractName: c.contractName || c.name || "Untitled contract",
			contractExpiryDate: c.contractExpiryDate,
			status: c.status,
			amount: c.amount,
			isExpired: c.isExpired,
		})),
	};
}
