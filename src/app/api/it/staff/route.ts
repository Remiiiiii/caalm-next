import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { resolveAvatarDisplayUrl } from "@/lib/utils";
import { getUsersByRoleNames } from "@/lib/utils/get-users-by-role";

export async function GET(request: Request) {
	const denied = await requirePermission(request as any, {
		permission: PERMISSIONS.IT.MANAGE_INCIDENTS,
	});
	if (denied) return denied;

	const users = await getUsersByRoleNames(
		["Super Admin", "IT", "Organization Admin"],
		undefined,
		{ status: "active" },
	);

	const staff = users.map((u: any) => ({
		$id: u.$id,
		accountId: u.accountId,
		fullName: u.fullName || u.email || "User",
		imageUrl: resolveAvatarDisplayUrl({
			avatar: u.avatar,
			profileImageId: u.profileImageId,
		}),
	}));

	return NextResponse.json(staff);
}
