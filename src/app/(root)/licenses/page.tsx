import { unstable_cache } from "next/cache";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import LicensesAttentionStrip from "@/components/LicensesAttentionStrip";
import LicensesControlBar from "@/components/LicensesControlBar";
import LicensesHeaderActions from "@/components/LicensesHeaderActions";
import LicensesMetricsBar from "@/components/LicensesMetricsBar";
import { LicensesViewProvider } from "@/components/LicensesView";
import LicensesViewClient from "@/components/LicensesViewClient";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import type { License } from "@/types/licenses";

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

	try {
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId || user.orgId || "default-org";

		const getCachedLicenses = unstable_cache(
			async () => {
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
				return result.rows as unknown as License[];
			},
			["licenses-list", orgId],
			{ revalidate: 60 },
		);

		licenses = await getCachedLicenses();
	} catch (error) {
		console.error("Error fetching licenses:", error);
		licenses = [];
	}

	const uniqueDepartments = Array.from(
		new Set(
			licenses
				.map((l) => l.division || l.department)
				.filter((d): d is string => !!d),
		),
	).sort();

	const uniqueAssignedManagers = Array.from(
		new Set(
			licenses
				.flatMap((l) => l.assignedManagers || [])
				.filter((m): m is string => !!m),
		),
	).sort();

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<LicensesViewProvider>
				<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
					<h1 className="h1 capitalize sidebar-gradient-text">Licenses</h1>
				</div>
				<div className="mb-6 flex items-center justify-end">
					<LicensesHeaderActions
						licenses={licenses}
						userId={user.$id}
						accountId={user.accountId}
					/>
				</div>

				<LicensesAttentionStrip licenses={licenses} />
				<LicensesMetricsBar licenses={licenses} />

				<GlassCard className="glass-card mb-6">
					<div className="glass-card-cap" />
					<CardContent className="p-0">
						<LicensesControlBar
							licenses={licenses}
							departments={uniqueDepartments}
							assignedManagers={uniqueAssignedManagers}
						/>
						{licenses.length > 0 ? (
							<LicensesViewClient licenses={licenses} user={user} />
						) : (
							<div className="text-center py-12 px-4">
								<Image
									src="/assets/icons/no-data.svg"
									alt="No licenses found"
									width={250}
									height={250}
									className="mb-4 opacity-60 mx-auto"
								/>
								<p className="body-1 text-slate-700">No licenses found</p>
							</div>
						)}
					</CardContent>
				</GlassCard>
			</LicensesViewProvider>
		</div>
	);
};

export default Page;
