import { redirect } from "next/navigation";
import SystemSettingsPage from "@/components/settings/SystemSettingsPage";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserPermissions } from "@/lib/rbac/permissions";

export default async function SettingsSystemPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const permissions = await getUserPermissions(user.$id);
	if (!permissions.includes(PERMISSIONS.SETTINGS.EDIT)) {
		redirect("/dashboard");
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">System Settings</h1>
			</div>
			<p className="text-sm text-slate-600 mb-6">
				Tenant-wide platform flags, security defaults, and integration overview
			</p>
			<SystemSettingsPage />
		</div>
	);
}
