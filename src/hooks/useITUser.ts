/**
 * Hook for fetching IT user data with role and department
 */

import { useCallback, useEffect, useState } from "react";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import {
	getUserDefaultOrganization,
	getUserRoles,
} from "@/lib/rbac/permissions";

export interface ITUserData {
	userId: string;
	fullName?: string;
	email?: string;
	department: string | null;
	roleName: string;
}

export interface UseITUserReturn {
	user: ITUserData | null;
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
}

/**
 * Hook to fetch IT user data including role and department
 */
export function useITUser(): UseITUserReturn {
	const [user, setUser] = useState<ITUserData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchUser = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			// Try to get user from session first, then fall back to 2FA
			let currentUser = await getCurrentUser();
			if (!currentUser) {
				currentUser = await getCurrentUserFrom2FA();
			}

			if (!currentUser) {
				setUser(null);
				return;
			}

			// Get user's role and department
			const defaultOrg = await getUserDefaultOrganization(currentUser.$id);
			if (!defaultOrg) {
				setUser(null);
				return;
			}

			const userRoles = await getUserRoles(currentUser.$id, defaultOrg.orgId);
			const itRole = userRoles.find((role) => role.roleName === "IT");
			const primaryRole = userRoles[0];
			const typedUser = currentUser as {
				fullName?: string;
				email?: string;
				division?: string;
				department?: string;
				departmentLabel?: string;
			};

			// Any authenticated user with IT portal access can render this card
			// (Super Admin uses the IT sidebar via permissions, not only the IT role)
			setUser({
				userId: currentUser.$id,
				fullName: typedUser.fullName,
				email: typedUser.email,
				department:
					typedUser.departmentLabel ||
					typedUser.department ||
					typedUser.division ||
					null,
				roleName: itRole?.roleName || primaryRole?.roleName || "Staff",
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to fetch user data";
			setError(errorMessage);
			console.error("[useITUser] Error:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchUser();
	}, [fetchUser]);

	return {
		user,
		loading,
		error,
		refresh: fetchUser,
	};
}
