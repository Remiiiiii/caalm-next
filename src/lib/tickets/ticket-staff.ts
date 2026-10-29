import "server-only";

import { resolveAvatarDisplayUrl } from "@/lib/utils";
import { getUsersByRoleNames } from "@/lib/utils/get-users-by-role";

export type ItStaffMember = {
	/** Users-table row id (what tickets store as the assignee). */
	$id: string;
	accountId?: string;
	fullName: string;
	imageUrl?: string | null;
};

/** Active IT staff: the people a ticket or incident can be assigned to. */
export async function listItStaff(): Promise<ItStaffMember[]> {
	const users = await getUsersByRoleNames(
		["Super Admin", "IT", "Organization Admin"],
		undefined,
		{ status: "active" },
	);
	return users.map((u: any) => ({
		$id: u.$id,
		accountId: u.accountId,
		fullName: u.fullName || u.email || "User",
		imageUrl: resolveAvatarDisplayUrl({
			avatar: u.avatar,
			profileImageId: u.profileImageId,
		}),
	}));
}
