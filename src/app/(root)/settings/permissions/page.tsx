import { Shield, Info } from "lucide-react";
import { redirect } from "next/navigation";
import MyAccessPanel from "@/components/settings/MyAccessPanel";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function SettingsPermissionsPage() {
	const user = await getCurrentUser();
	if (!user) {
		redirect("/sign-in");
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-2 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">View My Access</h1>
			</div>
			<div className="mb-6 space-y-2">
				<p className="text-sm text-slate-600 flex items-center gap-2">
					<Shield className="h-4 w-4 text-[#0f5384]" />
					Read-only view of your roles and permissions in this organization
				</p>
				<div className="flex items-start gap-2 p-3 rounded-lg bg-blue/5 border border-blue/20">
					<Info className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
					<p className="text-xs text-slate-600 leading-relaxed">
						This page displays all permissions granted to you through your assigned roles. 
						Contact your administrator if you need additional access.
					</p>
				</div>
			</div>
			<MyAccessPanel />
		</div>
	);
}
