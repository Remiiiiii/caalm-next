/**
 * usePermissions Hook
 * React hook for permission checking in components
 */

import { useEffect, useMemo, useState } from "react";
import type { PermissionKey } from "@/constants/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getCachedData, setCachedData } from "@/lib/utils/client-cache";

interface UsePermissionsResult {
	permissions: PermissionKey[];
	hasPermission: (key: PermissionKey) => Promise<boolean>;
	hasAnyPermission: (keys: PermissionKey[]) => Promise<boolean>;
	hasAllPermissions: (keys: PermissionKey[]) => Promise<boolean>;
	loading: boolean;
	error: string | null;
}

export function usePermissions(): UsePermissionsResult {
	const { user } = useAuth();
	const { orgId } = useOrganization();
	const [permissions, setPermissions] = useState<PermissionKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!user?.$id) {
			setPermissions([]);
			setLoading(false);
			return;
		}

		// Check client-side cache first (stale-while-revalidate pattern)
		const cacheKey = `permissions:${user.$id}:${orgId || "default"}`;
		const cachedPermissions = getCachedData<PermissionKey[]>(cacheKey);
		const usableCache =
			Array.isArray(cachedPermissions) && cachedPermissions.length > 0
				? cachedPermissions
				: null;

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
				const requestKey = `permissions:${user.$id}:${orgId || "default"}`;

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
					if (fetchedPermissions.length > 0) {
						setCachedData(cacheKey, fetchedPermissions, 300000);
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
			}
		};

		fetchPermissions();
	}, [user?.$id, orgId]);

	const checkPermission = useMemo(
		() => async (key: PermissionKey) => {
			if (!user?.$id || !permissions.length) return false;
			return permissions.includes(key);
		},
		[user?.$id, permissions],
	);

	const checkAnyPermission = useMemo(
		() => async (keys: PermissionKey[]) => {
			if (!user?.$id || !permissions.length) return false;
			return keys.some((key) => permissions.includes(key));
		},
		[user?.$id, permissions],
	);

	const checkAllPermissions = useMemo(
		() => async (keys: PermissionKey[]) => {
			if (!user?.$id || !permissions.length) return false;
			return keys.every((key) => permissions.includes(key));
		},
		[user?.$id, permissions],
	);

	return {
		permissions,
		hasPermission: checkPermission,
		hasAnyPermission: checkAnyPermission,
		hasAllPermissions: checkAllPermissions,
		loading,
		error,
	};
}
