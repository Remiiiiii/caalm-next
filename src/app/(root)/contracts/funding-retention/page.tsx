import type { Metadata } from "next";
import { FundingRetentionClient } from "@/components/funding/FundingRetentionClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Funding & Retention | CAALM",
	description:
		"Dollar-ranked retention of existing funding streams and a pursuit pipeline for new bids.",
};

export default async function FundingRetentionPage() {
	await requirePagePermission(PERMISSIONS.FUNDING.VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">
					Funding & Retention
				</h1>
			</div>
			<p className="mb-6 max-w-4xl text-sm text-slate-600">
				Turn “something is expiring” into “this dollar stream is protected,” and
				“this bid is being won.” Retention ranks live contracts by money at
				stake. Pursuits track new funding from SAM.gov or manual leads through to
				Proposals & Approvals.
			</p>
			<FundingRetentionClient />
		</div>
	);
}
