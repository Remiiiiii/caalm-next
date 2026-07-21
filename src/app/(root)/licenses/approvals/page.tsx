import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import ApprovalsPageShell from "@/components/approvals/ApprovalsPageShell";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { licenseToApprovalItem } from "@/lib/approvals/approvalsListUtils";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import type { License } from "@/types/licenses";

export default async function LicensesApprovalsPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const permissions = await getUserPermissions(user.$id);
	const canEdit = permissions.includes(PERMISSIONS.LICENSES.EDIT);
	const canRenew = permissions.includes(PERMISSIONS.LICENSES.RENEW);
	if (!canEdit && !canRenew) {
		redirect("/dashboard");
	}

	let licenses: License[] = [];

	try {
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId =
			defaultOrg?.orgId || (user as { orgId?: string }).orgId || "default-org";
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.licensesCollectionId || "licenses",
			queries: [
				Query.equal("orgId", orgId),
				Query.orderDesc("$createdAt"),
				Query.limit(1000),
			],
		});
		licenses = result.rows as unknown as License[];
	} catch (error) {
		console.error("Error fetching licenses for approvals:", error);
		licenses = [];
	}

	const items = licenses.map(licenseToApprovalItem);
	const departments = Array.from(
		new Set(items.map((i) => i.department).filter((d): d is string => !!d)),
	).sort();
	const assignedManagers = Array.from(
		new Set(items.flatMap((i) => i.assignees).filter(Boolean)),
	).sort();
	const itemTypes = Array.from(
		new Set(items.map((i) => i.itemType).filter((t): t is string => !!t)),
	).sort();

	return (
		<ApprovalsPageShell
			entity="license"
			title="License Proposals & Approvals"
			items={items}
			departments={departments}
			assignedManagers={assignedManagers}
			itemTypes={itemTypes}
			canDecide={canEdit}
		/>
	);
}
