import type { Metadata } from "next";
import { ProposalWorkspace } from "@/components/proposals/ProposalWorkspace";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Proposal workspace | CAALM",
	description:
		"Certify the compliance matrix, draft sections, and export the proposal.",
};

export default async function ProposalWorkspacePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requirePagePermission(PERMISSIONS.PROPOSALS.VIEW);
	const { id } = await params;

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<ProposalWorkspace proposalId={id} />
		</div>
	);
}
