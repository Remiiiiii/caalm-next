import type { Metadata } from "next";
import { ContractTemplatesPage } from "@/components/contract-templates/ContractTemplatesPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Contract Templates | CAALM",
	description: "Assemble draft contracts from approved clause library entries.",
};

export default async function ContractsTemplatesRoutePage() {
	await requirePagePermission(PERMISSIONS.CONTRACT_TEMPLATES.VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">
					Contract Templates
				</h1>
			</div>
			<p className="mb-6 max-w-4xl text-sm text-slate-600">
				Build a recipe from published clauses. Using a template creates a draft
				contract in Proposals & Approvals with that wording snapshotted.
			</p>
			<ContractTemplatesPage />
		</div>
	);
}
