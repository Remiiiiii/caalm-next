import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import LicensesPageClient from "@/components/LicensesPageClient";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import type { License } from "@/types/licenses";

const PAGE_SIZE = 12;

const Page = async () => {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/sign-in");
	}

	const userPermissions = await getUserPermissions(user.$id);
	if (!userPermissions.includes(PERMISSIONS.LICENSES.VIEW)) {
		redirect("/dashboard");
	}

	let licenses: License[] = [];
	let total = 0;

	try {
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId || user.orgId || "default-org";

		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.licensesCollectionId || "licenses",
			queries: [
				Query.equal("orgId", orgId),
				Query.orderDesc("$createdAt"),
				Query.limit(PAGE_SIZE),
				Query.offset(0),
			],
		});
		licenses = result.rows as unknown as License[];
		total = result.total ?? licenses.length;
	} catch (error) {
		console.error("Error fetching licenses:", error);
		licenses = [];
		total = 0;
	}

	return (
		<LicensesPageClient
			user={user}
			initialLicenses={licenses}
			initialTotal={total}
		/>
	);
};

export default Page;
