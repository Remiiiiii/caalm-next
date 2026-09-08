import type { Metadata } from "next";
import { TemplateLibraryPage } from "@/components/templates/TemplateLibraryPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Contract Templates | CAALM",
	description:
		"Published recipes of clause-library entries used to assemble new drafts.",
};

export default async function ContractTemplatesPage() {
	await requirePagePermission(PERMISSIONS.CONTRACT_TEMPLATES.VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">
					Contract Templates
				</h1>
			</div>
			<p className="mb-6 max-w-4xl text-sm text-slate-600">
				A template is a recipe, not a live patch. Using one always creates a new
				contract in Proposals & Approvals.
			</p>
			<TemplateLibraryPage />
		</div>
	);
}
