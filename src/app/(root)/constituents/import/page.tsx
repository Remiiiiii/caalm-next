import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { ConstituentsImportClient } from "./ConstituentsImportClient";

export default async function ConstituentsImportPage() {
	await requirePagePermission(PERMISSIONS.CONSTITUENTS.MANAGE);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">Import constituents</h1>
			</div>
			<p className="text-sm text-slate-600 max-w-4xl mb-6">
				Upload a CSV, map columns, and run a dry-run before committing. Your file
				is parsed in the browser and is not uploaded as a stored file.
			</p>
			<ConstituentsImportClient />
		</div>
	);
}
