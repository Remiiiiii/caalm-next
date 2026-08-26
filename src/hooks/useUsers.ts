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
	assignedByName?: string;
	assignedDate?: string;
	lastActiveAt?: string;
	managerUserId?: string | null;
	$createdAt?: string;
	$updatedAt?: string;
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
	const users: UserManagementUser[] = Array.isArray(rawUsers)
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
				status:
					u.status === "inactive" || u.status === "suspended"
						? u.status
						: "active",
				roleName: u.roleName,
				assignedByName: u.assignedByName,
				assignedDate: u.assignedDate,
				lastActiveAt: u.lastActiveAt,
				$createdAt: u.$createdAt,
				$updatedAt: u.$updatedAt,
			}))
		: [];

	const refresh = () => mutate();

	return {
		users,
		isLoading,
		error: error ? "Failed to load users" : null,
		lastUpdate: new Date(),
		refresh,
	};
};
