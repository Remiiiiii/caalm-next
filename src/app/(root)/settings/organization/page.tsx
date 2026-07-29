import { redirect } from "next/navigation";
import OrganizationSettingsPage from "@/components/settings/OrganizationSettingsPage";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserPermissions } from "@/lib/rbac/permissions";

export default async function SettingsOrganizationPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const permissions = await getUserPermissions(user.$id);
	if (!permissions.includes(PERMISSIONS.SETTINGS.VIEW)) {
		redirect("/dashboard");
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">
					Organization Settings
				</h1>
			</div>
			<p className="text-sm text-slate-600 mb-6">
				Manage organization profile, seat limits, and department structure
			</p>
			<OrganizationSettingsPage />
		</div>
	);
}
