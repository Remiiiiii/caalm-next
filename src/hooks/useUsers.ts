import { useCallback, useMemo } from "react";
import useSWR from "swr";
import type { AppUser } from "@/lib/actions/user.actions";
import { swrConfig, swrKeys } from "@/lib/swr-config";

interface UseUsersOptions {
	/** Required for `/api/users`; SWR key is null until set. */
	orgId: string | null | undefined;
	enableRealTime?: boolean;
	pollingInterval?: number;
}

export interface UserManagementUser extends AppUser {
	roleName?: string;
	assignedById?: string;
	assignedByName?: string;
	assignedDate?: string;
	lastActiveAt?: string;
	managerUserId?: string | null;
	matrixManagerUserId?: string | null;
	jobTitle?: string | null;
	workLocation?: string | null;
	costCenterId?: string | null;
	costCenterCode?: string | null;
	costCenterName?: string | null;
	$createdAt?: string;
	$updatedAt?: string;
	diagramPositionX?: number | null;
	diagramPositionY?: number | null;
	twoFactorEnabled?: boolean;
	passwordUpdatedAt?: string | null;
}

// Type guard for user document
function isAppUserDoc(
	u: unknown,
): u is UserManagementUser & { $id: string; department?: string } {
	return (
		typeof u === "object" &&
		u !== null &&
		"fullName" in u &&
		"email" in u &&
		"avatar" in u &&
		"accountId" in u &&
		"role" in u &&
		"$id" in u
	);
}

export const useUsers = ({
	orgId,
	enableRealTime = true,
	pollingInterval = 60000, // 60 seconds — user list changes infrequently
}: UseUsersOptions) => {
	const key = swrKeys.users(orgId);

	const {
		data: rawUsers = [],
		error,
		isLoading,
		mutate,
	} = useSWR(key, swrConfig.fetcher || null, {
		...swrConfig,
		refreshInterval: key && enableRealTime ? pollingInterval : 0,
	});

	// Process and validate users
	const users: UserManagementUser[] = useMemo(
		() =>
			Array.isArray(rawUsers)
				? rawUsers.filter(isAppUserDoc).map((u) => ({
						$id: u.$id,
						fullName: u.fullName,
						email: u.email,
						avatar: u.avatar,
						accountId: u.accountId,
						role: u.role,
						department: u.department,
						division: u.division,
						managerUserId: (u as { managerUserId?: string }).managerUserId,
						matrixManagerUserId: (u as { matrixManagerUserId?: string | null })
							.matrixManagerUserId,
						jobTitle: (u as { jobTitle?: string | null }).jobTitle,
						workLocation: (u as { workLocation?: string | null }).workLocation,
						costCenterId: (u as { costCenterId?: string | null }).costCenterId,
						costCenterCode: (u as { costCenterCode?: string | null })
							.costCenterCode,
						costCenterName: (u as { costCenterName?: string | null })
							.costCenterName,
						status:
							u.status === "inactive" || u.status === "suspended"
								? u.status
								: "active",
						roleName: u.roleName,
						assignedById: (u as { assignedById?: string }).assignedById,
						assignedByName: u.assignedByName,
						assignedDate: u.assignedDate,
						lastActiveAt: u.lastActiveAt,
						diagramPositionX: (u as { diagramPositionX?: number | null })
							.diagramPositionX,
						diagramPositionY: (u as { diagramPositionY?: number | null })
							.diagramPositionY,
						twoFactorEnabled: u.twoFactorEnabled === true,
						passwordUpdatedAt: (u as { passwordUpdatedAt?: string | null })
							.passwordUpdatedAt,
						$createdAt: u.$createdAt,
						$updatedAt: u.$updatedAt,
					}))
				: [],
		[rawUsers],
	);

	const refresh = useCallback(() => {
		void mutate();
	}, [mutate]);

	return {
		users,
		isLoading,
		error: error ? "Failed to load users" : null,
		lastUpdate: new Date(),
		refresh,
	};
};
