import { isSameUserIdentity } from "@/lib/impersonation/policy";

/** Display name of the platform Super Admin role. Used only to hide that person on the org chart. */
export const SUPER_ADMIN_ROLE_NAME = "Super Admin";

type GraphActor = {
	$id?: string;
	accountId?: string;
} | null;

type GraphPerson = {
	$id: string;
	accountId?: string;
	roleName?: string | null;
};

export function isSuperAdminProfile(user: GraphPerson): boolean {
	return user.roleName?.trim() === SUPER_ADMIN_ROLE_NAME;
}

export function actorIsSuperAdmin(
	actor: GraphActor,
	users: GraphPerson[],
): boolean {
	if (!actor) return false;
	return users.some(
		(user) =>
			isSuperAdminProfile(user) && isSameUserIdentity(actor, user),
	);
}

/** Super Admin's card stays on the chart only when the viewer is that Super Admin. */
export function usersVisibleOnGraph<T extends GraphPerson>(
	users: T[],
	actor: GraphActor,
): T[] {
	if (actorIsSuperAdmin(actor, users)) return users;
	return users.filter((user) => !isSuperAdminProfile(user));
}
