import type { UserManagementUser } from "@/hooks/useUsers";
import {
	isDrawnAssignmentSource,
	isSystemAssigner,
	resolveAssignerNodeId,
	SYSTEM_NODE_ID,
} from "@/lib/users/assignment-graph";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_STALE_MS = 90 * 24 * 60 * 60 * 1000;

export const EMPTY_ORG_LABEL = "Not assigned";

export type GraphHighlight =
	| { kind: "role"; value: string }
	| { kind: "department"; value: string }
	| { kind: "division"; value: string }
	| { kind: "location"; value: string }
	| { kind: "costCenter"; value: string }
	| { kind: "status"; value: "active" | "inactive" | "suspended" }
	| {
			kind: "assignment";
			value:
				| "admin"
				| "system"
				| "ghost"
				| "extra-roots"
				| "assigned-week"
				| "assigned-month"
				| "max-reports";
	  }
	| {
			kind: "hygiene";
			value: "no-department" | "no-division" | "no-role" | "mismatch";
	  }
	| { kind: "activity"; value: "active-7d" | "stale-30d" | "never" }
	| {
			kind: "issue";
			value: "unassigned" | "ghost" | "deactivated-with-reports";
	  }
	| {
			kind: "security";
			value: "2fa-on" | "no-2fa" | "password-never" | "password-stale";
	  };

export type GraphSidebarLabelCount = { label: string; count: number };

export type GraphSidebarStats = {
	total: number;
	createdThisWeek: number;
	createdThisMonth: number;
	assignedThisWeek: number;
	assignedThisMonth: number;
	active: number;
	inactive: number;
	suspended: number;
	adminAssigned: number;
	systemAssigned: number;
	ghostAssigned: number;
	avgReports: number;
	maxReports: number;
	maxReportsUserId: string | null;
	maxTreeDepth: number;
	extraRoots: number;
	noDepartment: number;
	noDivision: number;
	noRole: number;
	mismatch: number;
	active7d: number;
	stale30d: number;
	neverLoggedIn: number;
	twoFactorOn: number;
	twoFactorOff: number;
	passwordNever: number;
	passwordStale: number;
	passwordHistoryAvailable: boolean;
	roleRows: GraphSidebarLabelCount[];
	departmentRows: GraphSidebarLabelCount[];
	divisionRows: GraphSidebarLabelCount[];
	locationRows: GraphSidebarLabelCount[];
	costCenterRows: GraphSidebarLabelCount[];
	unassignedUsers: UserManagementUser[];
	ghostUsers: UserManagementUser[];
	deactivatedWithReports: UserManagementUser[];
	directReportsByUserId: Map<string, number>;
	ids: {
		createdWeek: Set<string>;
		createdMonth: Set<string>;
		assignedWeek: Set<string>;
		assignedMonth: Set<string>;
		status: {
			active: Set<string>;
			inactive: Set<string>;
			suspended: Set<string>;
		};
		assignment: {
			admin: Set<string>;
			system: Set<string>;
			ghost: Set<string>;
			extraRoots: Set<string>;
			maxReports: Set<string>;
		};
		hygiene: {
			noDepartment: Set<string>;
			noDivision: Set<string>;
			noRole: Set<string>;
			mismatch: Set<string>;
		};
		activity: {
			active7d: Set<string>;
			stale30d: Set<string>;
			never: Set<string>;
		};
		security: {
			twoFactorOn: Set<string>;
			no2fa: Set<string>;
			passwordNever: Set<string>;
			passwordStale: Set<string>;
		};
		issue: {
			unassigned: Set<string>;
			ghost: Set<string>;
			deactivatedWithReports: Set<string>;
		};
		role: Map<string, Set<string>>;
		department: Map<string, Set<string>>;
		division: Map<string, Set<string>>;
		location: Map<string, Set<string>>;
		costCenter: Map<string, Set<string>>;
	};
};

function emptySet(): Set<string> {
	return new Set<string>();
}

function parseTime(iso?: string | null): number | null {
	if (!iso) return null;
	const ts = Date.parse(iso);
	return Number.isFinite(ts) ? ts : null;
}

function startOfMonth(now: number): number {
	const date = new Date(now);
	return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function isInactiveStatus(status?: string): boolean {
	return status === "inactive";
}

function isSuspendedStatus(status?: string): boolean {
	return status === "suspended";
}

export function graphRoleLabel(user: UserManagementUser): string {
	const label = user.roleName?.trim();
	return label || "Unassigned";
}

export function graphOrgGroupLabel(value?: string | null): string {
	const label = value?.trim();
	return label || EMPTY_ORG_LABEL;
}

export function hasNoRole(user: UserManagementUser): boolean {
	const label = user.roleName?.trim();
	return !label || label === "Unassigned" || label === "N/A";
}

function profileIdForRaw(
	raw: string,
	byId: Map<string, UserManagementUser>,
	byAccount: Map<string, UserManagementUser>,
): string | null {
	const id = raw.trim();
	if (!id) return null;
	if (byId.has(id)) return id;
	const viaAccount = byAccount.get(id);
	return viaAccount?.$id ?? null;
}

function isGhostAssignerNode(fromId: string): boolean {
	return !isDrawnAssignmentSource(fromId) && fromId !== SYSTEM_NODE_ID;
}

/** Assigner person vs manager person. System + empty manager is not a mismatch. */
export function hasAssignerManagerMismatch(
	user: UserManagementUser,
	users: UserManagementUser[],
): boolean {
	const byId = new Map(users.map((item) => [item.$id, item]));
	const byAccount = new Map(
		users
			.filter((item) => item.accountId)
			.map((item) => [item.accountId as string, item]),
	);
	const assignerNode = resolveAssignerNodeId(user, users);
	const managerId = profileIdForRaw(
		user.managerUserId || "",
		byId,
		byAccount,
	);
	const systemAssigned =
		assignerNode === SYSTEM_NODE_ID ||
		isSystemAssigner(user.assignedById, user.assignedByName);

	if (systemAssigned) {
		return managerId !== null;
	}

	if (!managerId) return true;

	if (isDrawnAssignmentSource(assignerNode)) {
		return assignerNode !== managerId;
	}

	const assignerAsPerson = profileIdForRaw(
		user.assignedById || "",
		byId,
		byAccount,
	);
	if (assignerAsPerson) return assignerAsPerson !== managerId;
	return true;
}

function sortedLabelCounts(map: Map<string, Set<string>>): GraphSidebarLabelCount[] {
	return [...map.entries()]
		.map(([label, ids]) => ({ label, count: ids.size }))
		.sort((a, b) => {
			if (b.count !== a.count) return b.count - a.count;
			return a.label.localeCompare(b.label);
		});
}

export function computeGraphSidebarStats(
	users: UserManagementUser[],
	now = Date.now(),
): GraphSidebarStats {
	const monthStart = startOfMonth(now);
	const ids = {
		createdWeek: emptySet(),
		createdMonth: emptySet(),
		assignedWeek: emptySet(),
		assignedMonth: emptySet(),
		status: {
			active: emptySet(),
			inactive: emptySet(),
			suspended: emptySet(),
		},
		assignment: {
			admin: emptySet(),
			system: emptySet(),
			ghost: emptySet(),
			extraRoots: emptySet(),
			maxReports: emptySet(),
		},
		hygiene: {
			noDepartment: emptySet(),
			noDivision: emptySet(),
			noRole: emptySet(),
			mismatch: emptySet(),
		},
		activity: {
			active7d: emptySet(),
			stale30d: emptySet(),
			never: emptySet(),
		},
		security: {
			twoFactorOn: emptySet(),
			no2fa: emptySet(),
			passwordNever: emptySet(),
			passwordStale: emptySet(),
		},
		issue: {
			unassigned: emptySet(),
			ghost: emptySet(),
			deactivatedWithReports: emptySet(),
		},
		role: new Map<string, Set<string>>(),
		department: new Map<string, Set<string>>(),
		division: new Map<string, Set<string>>(),
		location: new Map<string, Set<string>>(),
		costCenter: new Map<string, Set<string>>(),
	};

	const childrenOf = new Map<string, string[]>();
	const parentOf = new Map<string, string>();
	const assignerByUser = new Map<string, string>();

	const ensureChildList = (id: string) => {
		const existing = childrenOf.get(id);
		if (existing) return existing;
		const next: string[] = [];
		childrenOf.set(id, next);
		return next;
	};

	for (const user of users) {
		const fromId = resolveAssignerNodeId(user, users);
		assignerByUser.set(user.$id, fromId);
		if (isDrawnAssignmentSource(fromId)) {
			ensureChildList(fromId).push(user.$id);
			parentOf.set(user.$id, fromId);
		}
	}

	const reportCounts: number[] = [];
	let maxReports = 0;
	let maxReportsUserId: string | null = null;
	const directReportsByUserId = new Map<string, number>();

	for (const user of users) {
		const reports = childrenOf.get(user.$id)?.length ?? 0;
		directReportsByUserId.set(user.$id, reports);
		if (reports > 0) reportCounts.push(reports);
		if (reports > maxReports) {
			maxReports = reports;
			maxReportsUserId = user.$id;
		}
	}

	if (maxReportsUserId) {
		ids.assignment.maxReports.add(maxReportsUserId);
	}

	const depthMemo = new Map<string, number>();
	const depthOf = (userId: string): number => {
		const cached = depthMemo.get(userId);
		if (cached !== undefined) return cached;
		const parent = parentOf.get(userId);
		const depth = parent ? 1 + depthOf(parent) : 1;
		depthMemo.set(userId, depth);
		return depth;
	};

	let maxTreeDepth = 0;
	for (const user of users) {
		maxTreeDepth = Math.max(maxTreeDepth, depthOf(user.$id));
	}

	const unassignedUsers: UserManagementUser[] = [];
	const ghostUsers: UserManagementUser[] = [];
	const deactivatedWithReports: UserManagementUser[] = [];

	for (const user of users) {
		const created = parseTime(user.$createdAt);
		if (created !== null) {
			if (now - created <= WEEK_MS) ids.createdWeek.add(user.$id);
			if (created >= monthStart) ids.createdMonth.add(user.$id);
		}

		const assigned = parseTime(user.assignedDate);
		if (assigned !== null) {
			if (now - assigned <= WEEK_MS) ids.assignedWeek.add(user.$id);
			if (assigned >= monthStart) ids.assignedMonth.add(user.$id);
		}

		if (isSuspendedStatus(user.status)) {
			ids.status.suspended.add(user.$id);
		} else if (isInactiveStatus(user.status)) {
			ids.status.inactive.add(user.$id);
		} else {
			ids.status.active.add(user.$id);
		}

		const fromId = assignerByUser.get(user.$id) || SYSTEM_NODE_ID;
		if (isDrawnAssignmentSource(fromId)) {
			ids.assignment.admin.add(user.$id);
		} else if (isGhostAssignerNode(fromId)) {
			ids.assignment.ghost.add(user.$id);
			ids.issue.ghost.add(user.$id);
			ghostUsers.push(user);
		} else {
			ids.assignment.system.add(user.$id);
			ids.issue.unassigned.add(user.$id);
			unassignedUsers.push(user);
		}

		const reports = directReportsByUserId.get(user.$id) ?? 0;
		if (reports > 0 && !isDrawnAssignmentSource(fromId)) {
			ids.assignment.extraRoots.add(user.$id);
		}

		if (!user.department?.trim()) ids.hygiene.noDepartment.add(user.$id);
		if (!user.division?.trim()) ids.hygiene.noDivision.add(user.$id);
		if (hasNoRole(user)) ids.hygiene.noRole.add(user.$id);
		if (hasAssignerManagerMismatch(user, users)) {
			ids.hygiene.mismatch.add(user.$id);
		}

		const lastActive = parseTime(user.lastActiveAt);
		if (lastActive === null) {
			ids.activity.never.add(user.$id);
		} else if (now - lastActive <= WEEK_MS) {
			ids.activity.active7d.add(user.$id);
		} else if (now - lastActive >= STALE_MS) {
			ids.activity.stale30d.add(user.$id);
		}

		if (user.twoFactorEnabled === true) {
			ids.security.twoFactorOn.add(user.$id);
		} else {
			ids.security.no2fa.add(user.$id);
		}

		if (user.passwordUpdatedAt !== undefined) {
			const passwordAt = parseTime(user.passwordUpdatedAt);
			if (passwordAt === null) {
				ids.security.passwordNever.add(user.$id);
			} else if (now - passwordAt >= PASSWORD_STALE_MS) {
				ids.security.passwordStale.add(user.$id);
			}
		}

		if (
			(user.status === "inactive" || user.status === "suspended") &&
			reports > 0
		) {
			ids.issue.deactivatedWithReports.add(user.$id);
			deactivatedWithReports.push(user);
		}

		const addGroup = (
			map: Map<string, Set<string>>,
			label: string,
			userId: string,
		) => {
			const existing = map.get(label);
			if (existing) {
				existing.add(userId);
				return;
			}
			map.set(label, new Set([userId]));
		};

		addGroup(ids.role, graphRoleLabel(user), user.$id);
		addGroup(ids.department, graphOrgGroupLabel(user.department), user.$id);
		addGroup(ids.division, graphOrgGroupLabel(user.division), user.$id);
		addGroup(ids.location, graphOrgGroupLabel(user.workLocation), user.$id);
		addGroup(
			ids.costCenter,
			graphOrgGroupLabel(user.costCenterName || user.costCenterCode),
			user.$id,
		);
	}

	const avgReports =
		reportCounts.length === 0
			? 0
			: Math.round(
					(reportCounts.reduce((sum, n) => sum + n, 0) / reportCounts.length) *
						10,
				) / 10;

	return {
		total: users.length,
		createdThisWeek: ids.createdWeek.size,
		createdThisMonth: ids.createdMonth.size,
		assignedThisWeek: ids.assignedWeek.size,
		assignedThisMonth: ids.assignedMonth.size,
		active: ids.status.active.size,
		inactive: ids.status.inactive.size,
		suspended: ids.status.suspended.size,
		adminAssigned: ids.assignment.admin.size,
		systemAssigned: ids.assignment.system.size,
		ghostAssigned: ids.assignment.ghost.size,
		avgReports,
		maxReports,
		maxReportsUserId,
		maxTreeDepth,
		extraRoots: ids.assignment.extraRoots.size,
		noDepartment: ids.hygiene.noDepartment.size,
		noDivision: ids.hygiene.noDivision.size,
		noRole: ids.hygiene.noRole.size,
		mismatch: ids.hygiene.mismatch.size,
		active7d: ids.activity.active7d.size,
		stale30d: ids.activity.stale30d.size,
		neverLoggedIn: ids.activity.never.size,
		twoFactorOn: ids.security.twoFactorOn.size,
		twoFactorOff: ids.security.no2fa.size,
		passwordNever: ids.security.passwordNever.size,
		passwordStale: ids.security.passwordStale.size,
		passwordHistoryAvailable: users.some(
			(user) => user.passwordUpdatedAt !== undefined,
		),
		roleRows: sortedLabelCounts(ids.role),
		departmentRows: sortedLabelCounts(ids.department),
		divisionRows: sortedLabelCounts(ids.division),
		locationRows: sortedLabelCounts(ids.location),
		costCenterRows: sortedLabelCounts(ids.costCenter),
		unassignedUsers,
		ghostUsers,
		deactivatedWithReports,
		directReportsByUserId,
		ids,
	};
}

export function countNeedsAttention(stats: GraphSidebarStats): number {
	const ids = new Set<string>();
	const add = (set: Set<string>) => {
		for (const id of set) ids.add(id);
	};
	add(stats.ids.security.no2fa);
	if (stats.passwordHistoryAvailable) {
		add(stats.ids.security.passwordNever);
		add(stats.ids.security.passwordStale);
	}
	add(stats.ids.hygiene.noDivision);
	add(stats.ids.hygiene.mismatch);
	add(stats.ids.hygiene.noDepartment);
	add(stats.ids.hygiene.noRole);
	return ids.size;
}

export function graphHighlightsEqual(
	a: GraphHighlight | null,
	b: GraphHighlight | null,
): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	if (a.kind !== b.kind) return false;
	if ("value" in a || "value" in b) {
		return (a as { value?: string }).value === (b as { value?: string }).value;
	}
	return true;
}

export function highlightUserIds(
	stats: GraphSidebarStats,
	highlight: GraphHighlight,
): Set<string> {
	switch (highlight.kind) {
		case "role":
			return stats.ids.role.get(highlight.value) ?? emptySet();
		case "department":
			return stats.ids.department.get(highlight.value) ?? emptySet();
		case "division":
			return stats.ids.division.get(highlight.value) ?? emptySet();
		case "location":
			return stats.ids.location.get(highlight.value) ?? emptySet();
		case "costCenter":
			return stats.ids.costCenter.get(highlight.value) ?? emptySet();
		case "status":
			return stats.ids.status[highlight.value];
		case "assignment":
			if (highlight.value === "admin") return stats.ids.assignment.admin;
			if (highlight.value === "system") return stats.ids.assignment.system;
			if (highlight.value === "ghost") return stats.ids.assignment.ghost;
			if (highlight.value === "extra-roots")
				return stats.ids.assignment.extraRoots;
			if (highlight.value === "assigned-week") return stats.ids.assignedWeek;
			if (highlight.value === "assigned-month") return stats.ids.assignedMonth;
			return stats.ids.assignment.maxReports;
		case "hygiene":
			if (highlight.value === "no-department")
				return stats.ids.hygiene.noDepartment;
			if (highlight.value === "no-division") return stats.ids.hygiene.noDivision;
			if (highlight.value === "no-role") return stats.ids.hygiene.noRole;
			return stats.ids.hygiene.mismatch;
		case "activity":
			if (highlight.value === "active-7d") return stats.ids.activity.active7d;
			if (highlight.value === "stale-30d") return stats.ids.activity.stale30d;
			return stats.ids.activity.never;
		case "issue":
			if (highlight.value === "unassigned") return stats.ids.issue.unassigned;
			if (highlight.value === "ghost") return stats.ids.issue.ghost;
			return stats.ids.issue.deactivatedWithReports;
		case "security":
			if (highlight.value === "2fa-on") return stats.ids.security.twoFactorOn;
			if (highlight.value === "no-2fa") return stats.ids.security.no2fa;
			if (highlight.value === "password-never")
				return stats.ids.security.passwordNever;
			return stats.ids.security.passwordStale;
	}
}

export function userMatchesGraphHighlight(
	user: UserManagementUser,
	highlight: GraphHighlight | null,
	stats: GraphSidebarStats,
): boolean {
	if (!highlight) return true;
	return highlightUserIds(stats, highlight).has(user.$id);
}
