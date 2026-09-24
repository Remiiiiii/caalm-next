import { PERMISSIONS } from "@/constants/permissions";
import { StewardshipQueueClient } from "@/app/(root)/constituents/stewardship/StewardshipQueueClient";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function StewardshipQueuePage() {
	await requirePagePermission(PERMISSIONS.CONSTITUENTS.VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">
					Stewardship queue
				</h1>
			</div>
			<p className="text-sm text-slate-600 max-w-4xl mb-6">
				At-risk and lapsed constituents sorted by lapse risk, then last gift
				size. Mark contacted to log an interaction and clear the row until the
				next RFM compute.
			</p>
			<StewardshipQueueClient />
		</div>
	);
}
