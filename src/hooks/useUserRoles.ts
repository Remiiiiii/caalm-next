"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
	getViewAsClientHint,
	useImpersonation,
} from "@/contexts/ImpersonationContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
	readCachedRoles,
	writeCachedRoles,
} from "@/lib/navigation/nav-rbac-cache";

interface UserRole {
	roleId: string;
	roleName: string | null;
}

interface UseUserRolesResult {
	roles: UserRole[];
	loading: boolean;
	error: string | null;
}

/**
 * Hook to fetch user's roles from the database
 * Optimized with request deduplication and client-side caching
 */
export function useUserRoles(): UseUserRolesResult {
	const { user } = useAuth();
	const { orgId } = useOrganization();
	const { isImpersonating, status } = useImpersonation();
	const viewAsHint = getViewAsClientHint();
	const effectiveUserId =
		(isImpersonating && status.target?.$id) || viewAsHint || user?.$id;
	const [roles, setRoles] = useState<UserRole[]>(
		() => readCachedRoles(effectiveUserId, orgId) ?? [],
	);
	const [loading, setLoading] = useState(
		() => !readCachedRoles(effectiveUserId, orgId),
	);
	const [error, setError] = useState<string | null>(null);

	useLayoutEffect(() => {
		const cached = readCachedRoles(effectiveUserId, orgId);
		if (cached) {
			setRoles(cached);
			setLoading(false);
		}
	}, [effectiveUserId, orgId]);

	useEffect(() => {
		if (!effectiveUserId) {
			setRoles([]);
			setLoading(false);
			return;
		}

		const cachedRoles = readCachedRoles(effectiveUserId, orgId);

		if (cachedRoles) {
			setRoles(cachedRoles);
			setLoading(false);
			// Continue fetching in background to update cache
		} else {
			setLoading(true);
		}

		const fetchRoles = async () => {
			const hasCachedData = !!cachedRoles;

			try {
				const impersonating = Boolean(isImpersonating) || Boolean(viewAsHint);
				const url = impersonating
					? `/api/permissions/check${orgId ? `?orgId=${orgId}` : ""}`
					: `/api/users/${effectiveUserId}/roles${orgId ? `?orgId=${orgId}` : ""}`;

				// Use request deduplication to prevent concurrent requests
				const { deduplicateRequest } = await import(
					"@/lib/utils/request-deduplication"
				);
				const requestKey = `userRoles:${effectiveUserId}:${orgId || "default"}`;

				const data = await deduplicateRequest(requestKey, async () => {
					const response = await fetch(url);
					if (!response.ok) {
						throw new Error("Failed to fetch roles");
					}
					return response.json();
				});

				const roleRows = impersonating
					? data.roles
					: data.success && data.data?.roles
						? data.data.roles
						: null;

				if (data.success && Array.isArray(roleRows)) {
					const userRoles = roleRows.map(
						(role: {
							$id?: string;
							roleId?: string;
							name?: string;
							roleName?: string | null;
						}) => ({
							roleId: role.roleId || role.$id || "",
							roleName: role.roleName || role.name || null,
						}),
					);

					writeCachedRoles(effectiveUserId, orgId, userRoles);

					setRoles(userRoles);
					setError(null);
				} else {
					throw new Error(data.error || "Failed to fetch roles");
				}
			} catch (err) {
				console.error("[useUserRoles] Error:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
				// Don't clear roles if we have cached data
				if (!hasCachedData) {
					setRoles([]);
				}
			} finally {
				setLoading(false);
			}
		};

		fetchRoles();
	}, [effectiveUserId, orgId, isImpersonating, viewAsHint]);

	return { roles, loading, error };
}
