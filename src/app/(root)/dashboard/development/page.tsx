import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { DevelopmentDashboardClient } from "./DevelopmentDashboardClient";

export default async function DevelopmentDashboardPage() {
	await requirePagePermission(PERMISSIONS.CONSTITUENTS.VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">Development</h1>
			</div>
			<p className="text-sm text-slate-600 max-w-4xl mb-6">
				Year-to-date fundraising impact for board and leadership reporting.
				Counts use posted gifts only; voids are excluded.
			</p>
			<DevelopmentDashboardClient />
		</div>
	);
}
