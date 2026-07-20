export type DepartmentActionPriority = "high" | "medium" | "low";

export type DepartmentActionType =
	| "approval"
	| "contract_expiry"
	| "contract_review"
	| "license"
	| "document";

export interface DepartmentActionItem {
	id: string;
	type: DepartmentActionType;
	title: string;
	dueDate?: string;
	href: string;
	priority: DepartmentActionPriority;
	meta?: string;
}

export interface DepartmentContractAtRisk {
	$id: string;
	contractName: string;
	status: string;
	contractExpiryDate?: string;
	owner?: string;
	amount?: number;
	daysUntilExpiry?: number | null;
	fileId?: string;
}

export interface DepartmentMonitoringDomain {
	label: string;
	needsAttention: number;
	ok: number;
	total: number;
	href: string;
}

export interface DepartmentRecentActivityItem {
	$id: string;
	action: string;
	description: string;
	userName?: string;
	department?: string;
	timestamp: string;
	type: string;
}

export interface DepartmentDashboardStats {
	totalContracts: number;
	expiringSoon: number;
	pendingApprovals: number;
	complianceRate: number | null;
}

export interface DepartmentDashboardData {
	division: string;
	departmentLabel: string;
	stats: DepartmentDashboardStats;
	actionQueue: DepartmentActionItem[];
	contractsAtRisk: DepartmentContractAtRisk[];
	monitoring: {
		contracts: DepartmentMonitoringDomain;
		calendar: DepartmentMonitoringDomain;
		licenses: DepartmentMonitoringDomain;
		documents: DepartmentMonitoringDomain;
	};
	recentActivity: DepartmentRecentActivityItem[];
	contractsForAlerts: Array<{
		$id: string;
		contractName: string;
		contractExpiryDate?: string;
		status?: string;
		amount?: number;
		isExpired?: boolean;
	}>;
}
