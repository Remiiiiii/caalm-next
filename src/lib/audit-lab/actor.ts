import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export type AuditLabActor = {
	userId: string;
	name: string;
	email: string;
	orgId: string;
};

export type AuditLabActorResult =
	| { ok: true; actor: AuditLabActor }
	| { ok: false; error: string; status: number };

export async function resolveAuditLabActor(): Promise<AuditLabActorResult> {
	const user = await getCurrentUser();
	if (!user) {
		return { ok: false, error: "Authentication required", status: 401 };
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return { ok: false, error: "Organization not found", status: 404 };
	}
	return {
		ok: true,
		actor: {
			userId: user.$id,
			name:
				(user as { fullName?: string }).fullName ||
				user.name ||
				user.email ||
				"User",
			email: user.email || "",
			orgId: org.orgId,
		},
	};
}
