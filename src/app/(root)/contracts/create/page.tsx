import type { Metadata } from "next";
import { Suspense } from "react";
import { ContractCreateWizard } from "@/components/contract-wizard/ContractCreateWizard";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Create Contract | CAALM",
	description:
		"Guided wizard to assemble a new contract from templates and clause library entries.",
};

export default async function CreateContractPage() {
	await requirePagePermission(PERMISSIONS.CONTRACTS.CREATE);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">Create contract</h1>
			</div>
			<p className="mb-6 max-w-4xl text-sm text-slate-600">
				Build a new draft step by step. Start blank or from a published
				template, then inject more language before review. This never changes a
				pending or active contract.
			</p>
			<Suspense
				fallback={<p className="text-sm text-slate-600">Loading the wizard…</p>}
			>
				<ContractCreateWizard />
			</Suspense>
		</div>
	);
}
