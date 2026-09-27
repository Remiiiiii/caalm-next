/**
 * usePermissions Hook
 * React hook for permission checking in components
 */

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { PermissionKey } from "@/constants/permissions";
import { useAuth } from "@/contexts/AuthContext";
import {
	getViewAsClientHint,
	useImpersonation,
} from "@/contexts/ImpersonationContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
	readCachedPermissions,
	writeCachedPermissions,
} from "@/lib/navigation/nav-rbac-cache";

interface UsePermissionsResult {
	permissions: PermissionKey[];
	hasPermission: (key: PermissionKey) => Promise<boolean>;
	hasAnyPermission: (keys: PermissionKey[]) => Promise<boolean>;
	hasAllPermissions: (keys: PermissionKey[]) => Promise<boolean>;
	loading: boolean;
	/** True after the first fetch attempt finishes for the current user/org. */
	settled: boolean;
	error: string | null;
}

export function usePermissions(): UsePermissionsResult {
	const { user, loading: authLoading } = useAuth();
	const { orgId } = useOrganization();
	const { isImpersonating, status } = useImpersonation();
	const viewAsHint = getViewAsClientHint();
	const effectiveUserId =
		(isImpersonating && status.target?.$id) || viewAsHint || user?.$id;
	const [permissions, setPermissions] = useState<PermissionKey[]>(
		() => readCachedPermissions(effectiveUserId, orgId) ?? [],
	);
	const [loading, setLoading] = useState(
		() => !readCachedPermissions(effectiveUserId, orgId),
	);
	const [settled, setSettled] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useLayoutEffect(() => {
		const cached = readCachedPermissions(effectiveUserId, orgId);
		if (cached) {
			setPermissions(cached);
			setLoading(false);
		}
	}, [effectiveUserId, orgId]);

	useEffect(() => {
		const cachedPermissions = readCachedPermissions(effectiveUserId, orgId);
		const usableCache = cachedPermissions;

		// Stay in loading until auth finishes only when we have nothing to show.
		// Cached rows keep the sidebar painted while the session revalidates.
		if (authLoading) {
			if (usableCache) {
				setPermissions(usableCache);
				setLoading(false);
			} else {
				setLoading(true);
			}
			setSettled(false);
			return;
		}

		if (!user?.$id) {
			setPermissions([]);
			setLoading(false);
			setSettled(false);
			return;
		}

		setSettled(false);

		if (usableCache) {
			setPermissions(usableCache);
			setLoading(false);
			// Continue fetching in background to update cache
		} else {
			setLoading(true);
		}

		const fetchPermissions = async () => {
			const hasCachedData = !!usableCache;

			try {
				const url = `/api/permissions/check${orgId ? `?orgId=${orgId}` : ""}`;

				// Use request deduplication to prevent concurrent requests
				const { deduplicateRequest } = await import(
					"@/lib/utils/request-deduplication"
				);
				const requestKey = `permissions:${effectiveUserId}:${orgId || "default"}`;

				const data = await deduplicateRequest(requestKey, async () => {
					const response = await fetch(url, {
						signal: AbortSignal.timeout(20000),
					});
					if (!response.ok) {
						throw new Error("Failed to fetch permissions");
					}
					return response.json();
				});

				if (data.success) {
					const fetchedPermissions = data.permissions || [];

					// Cache for 5 minutes — skip empty so a transient miss does not blank the nav
					if (fetchedPermissions.length > 0 && effectiveUserId) {
						writeCachedPermissions(effectiveUserId, orgId, fetchedPermissions);
					}

					setPermissions(fetchedPermissions);
					setError(null);
				} else {
					throw new Error(data.error || "Failed to fetch permissions");
				}
			} catch (err) {
				console.error("[usePermissions] Error:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
				// Don't clear permissions if we have cached data
				if (!hasCachedData) {
					setPermissions([]);
				}
			} finally {
				setLoading(false);
				setSettled(true);
			}
		};

		fetchPermissions();
	}, [user?.$id, effectiveUserId, orgId, authLoading]);

	const checkPermission = useMemo(
		() => async (key: PermissionKey) => {
			if (!effectiveUserId || !permissions.length) return false;
			return permissions.includes(key);
		},
		[effectiveUserId, permissions],
	);

	const checkAnyPermission = useMemo(
		() => async (keys: PermissionKey[]) => {
			if (!effectiveUserId || !permissions.length) return false;
			return keys.some((key) => permissions.includes(key));
		},
		[effectiveUserId, permissions],
	);

	const checkAllPermissions = useMemo(
		() => async (keys: PermissionKey[]) => {
			if (!effectiveUserId || !permissions.length) return false;
			return keys.every((key) => permissions.includes(key));
		},
		[effectiveUserId, permissions],
	);

	return {
		permissions,
		hasPermission: checkPermission,
		hasAnyPermission: checkAnyPermission,
		hasAllPermissions: checkAllPermissions,
		loading,
		settled,
		error,
	};
}
