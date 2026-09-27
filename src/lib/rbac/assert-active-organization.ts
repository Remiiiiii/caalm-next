import { getOrganization } from "@/lib/rbac/organizations";

/** False when the org row was purged (tenant delete) or never existed. */
export async function isActiveOrganization(orgId: string): Promise<boolean> {
	const org = await getOrganization(orgId);
	return org != null;
}
