import type { Metadata } from "next";
import Link from "next/link";
import { ClauseLibraryPage } from "@/components/clauses/ClauseLibraryPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Clause Library | CAALM",
	description: "Org-owned standard clauses, categorized and versioned.",
};

export default async function ContractsClauseLibraryPage() {
	await requirePagePermission(PERMISSIONS.CLAUSES.VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">Clause Library</h1>
			</div>
			<p className="mb-6 max-w-4xl text-sm text-slate-600">
				Keep standard contract wording in one place. Drafts update in place.
				Editing an active clause creates a new version so history stays intact.
				Turn recipes of these clauses into{" "}
				<Link
					href="/contracts/templates"
					className="font-medium text-[#0f5384] underline-offset-2 hover:underline"
				>
					contract templates
				</Link>
				, then assemble a new draft in the{" "}
				<Link
					href="/contracts/create"
					className="font-medium text-[#0f5384] underline-offset-2 hover:underline"
				>
					create wizard
				</Link>
				.
			</p>
			<ClauseLibraryPage />
		</div>
	);
}
