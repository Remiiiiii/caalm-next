import type { Metadata } from "next";
import { Suspense } from "react";
import { ProposalsListClient } from "@/components/proposals/ProposalsListClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "RFP Proposals | CAALM",
	description:
		"Shred a government solicitation into a compliance matrix, certify each row, then draft and export a proposal.",
};

export default async function ProposalsPage() {
	await requirePagePermission(PERMISSIONS.PROPOSALS.VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">RFP Proposals</h1>
			</div>
			<p className="mb-6 max-w-4xl text-sm text-slate-600">
				Turn a SAM.gov opportunity into a bid package: shred the solicitation,
				certify every shall/must/will, then generate a first draft from your
				approved library. A person still reviews before export.
			</p>
			<Suspense fallback={null}>
				<ProposalsListClient />
			</Suspense>
		</div>
	);
}
