import { Building2 } from "lucide-react";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import {
	DIVISION_TO_DEPARTMENT,
	type UserDivision,
} from "../../../../../constants";
import LicensesAttentionStrip from "@/components/LicensesAttentionStrip";
import LicensesControlBar from "@/components/LicensesControlBar";
import LicensesHeaderActions from "@/components/LicensesHeaderActions";
import LicensesMetricsBar from "@/components/LicensesMetricsBar";
import { LicensesViewProvider } from "@/components/LicensesView";
import LicensesViewClient from "@/components/LicensesViewClient";
import { Button } from "@/components/ui/button";
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

function matchesDepartmentScope(
	license: License,
	division: string,
	departmentLabel: string,
): boolean {
	const dept = (license.department || "").trim();
	const div = (license.division || "").trim();
	return (
		dept === departmentLabel ||
		div === departmentLabel ||
		div === division ||
		dept === division
	);
}

const Page = async () => {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/sign-in");
	}

	const userPermissions = await getUserPermissions(user.$id);
	if (!userPermissions.includes(PERMISSIONS.LICENSES.VIEW)) {
		redirect("/dashboard");
	}

	const division = (user.division || "").trim();
	const departmentLabel = division
		? DIVISION_TO_DEPARTMENT[division as UserDivision] || division
		: "";

	if (!departmentLabel) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
					<h1 className="h1 capitalize sidebar-gradient-text">
						Department Licenses
					</h1>
				</div>
				<GlassCard className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-6 sm:p-8 text-center">
						<Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
						<p className="text-lg font-medium text-slate-900 mb-2">
							No department assigned
						</p>
						<p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
							Your account needs a division before department licenses can load.
							Contact your administrator or open your department dashboard.
						</p>
						<Button asChild className="primary-btn px-3 sm:px-4 cursor-pointer">
							<Link href="/dashboard/departmentmanager">
								Open department dashboard
							</Link>
						</Button>
					</CardContent>
				</GlassCard>
			</div>
		);
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
				return (result.rows as unknown as License[]).filter((license) =>
					matchesDepartmentScope(license, division, departmentLabel),
				);
			},
			["licenses-department-list", orgId, departmentLabel, division],
			{
				revalidate: 60,
				tags: [
					`licenses-list-${orgId}`,
					`licenses-department-${orgId}-${departmentLabel}`,
					"licenses-list",
				],
			},
		);

		licenses = await getCachedLicenses();
	} catch (error) {
		console.error("Error fetching department licenses:", error);
		licenses = [];
	}

	const uniqueDepartments = [departmentLabel];
	const uniqueAssignedManagers = Array.from(
		new Set(
			licenses
				.flatMap((l) => l.assignedManagers || [])
				.filter((m): m is string => !!m),
		),
	).sort();

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<LicensesViewProvider
				initialDepartmentFilter={departmentLabel}
				lockDepartmentFilter
			>
				<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
					<h1 className="h1 capitalize sidebar-gradient-text">
						Department Licenses
					</h1>
				</div>
				<p className="text-sm text-slate-600 mb-4">
					Showing licenses for{" "}
					<span className="font-medium text-slate-900">{departmentLabel}</span>
					{division ? (
						<>
							{" "}
							<span className="text-slate-500">({division})</span>
						</>
					) : null}
				</p>
				<div className="mb-6 flex items-center justify-end">
					<LicensesHeaderActions licenses={licenses} />
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
							<div className="flex flex-col items-center justify-center text-center py-12 px-4">
								<Image
									src="/assets/icons/no-data.svg"
									alt="No department licenses found"
									width={250}
									height={250}
									className="mb-4 opacity-60 mx-auto"
								/>
								<p className="body-1 text-slate-700">
									No licenses found for {departmentLabel}
								</p>
							</div>
						)}
					</CardContent>
				</GlassCard>
			</LicensesViewProvider>
		</div>
	);
};

export default Page;
