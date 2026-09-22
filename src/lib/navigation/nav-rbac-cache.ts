import type { NavigationSection } from "@/constants/navigation-permissions";
import type { PermissionKey } from "@/constants/permissions";
import { getCachedData, setCachedData } from "@/lib/utils/client-cache";

export const NAV_SNAPSHOT_KEY = "caalm_nav_snapshot";

export type CachedUserRole = {
	roleId: string;
	roleName: string | null;
};

export type NavSnapshot = {
	userId: string;
	orgId: string | null;
	groupedNav: NavigationSection[];
	isViewer: boolean;
	primaryRole: string | null;
	isITUser: boolean;
	canUseITPortal: boolean;
	timestamp: number;
};

export function rbacPermissionsCacheKey(
	userId: string,
	orgId?: string | null,
): string {
	return `permissions:${userId}:${orgId || "default"}`;
}

export function rbacRolesCacheKey(
	userId: string,
	orgId?: string | null,
): string {
	return `userRoles:${userId}:${orgId || "default"}`;
}

/** Last known permission list for this user+org. Safe to read during client mount. */
export function readCachedPermissions(
	userId?: string | null,
	orgId?: string | null,
): PermissionKey[] | null {
	if (!userId) return null;
	const cached = getCachedData<PermissionKey[]>(
		rbacPermissionsCacheKey(userId, orgId),
	);
	return Array.isArray(cached) && cached.length > 0 ? cached : null;
}

export function writeCachedPermissions(
	userId: string,
	orgId: string | null | undefined,
	permissions: PermissionKey[],
): void {
	if (permissions.length === 0) return;
	setCachedData(rbacPermissionsCacheKey(userId, orgId), permissions, 300000);
}

/** Last known roles for this user+org. */
export function readCachedRoles(
	userId?: string | null,
	orgId?: string | null,
): CachedUserRole[] | null {
	if (!userId) return null;
	const cached = getCachedData<CachedUserRole[]>(
		rbacRolesCacheKey(userId, orgId),
	);
	return Array.isArray(cached) && cached.length > 0 ? cached : null;
}

export function writeCachedRoles(
	userId: string,
	orgId: string | null | undefined,
	roles: CachedUserRole[],
): void {
	setCachedData(rbacRolesCacheKey(userId, orgId), roles, 300000);
}

export function readNavSnapshot(userId?: string | null): NavSnapshot | null {
	if (!userId || typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(NAV_SNAPSHOT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as NavSnapshot;
		if (parsed.userId !== userId) return null;
		if (!Array.isArray(parsed.groupedNav) || parsed.groupedNav.length === 0) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export function writeNavSnapshot(snapshot: NavSnapshot): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(NAV_SNAPSHOT_KEY, JSON.stringify(snapshot));
	} catch {
		// Quota or private mode — skip; next load just waits for the API.
	}
}

export function clearNavSnapshot(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(NAV_SNAPSHOT_KEY);
	} catch {
		// ignore
	}
}
