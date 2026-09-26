import Link from "next/link";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { loadFunderSnapshot } from "@/lib/funding/funder-snapshot";
import { formatUsd } from "@/lib/funding/constants";
import { FunderSnapshotPrintActions } from "./FunderSnapshotPrintActions";

type PageProps = { params: Promise<{ contractId: string }> };

export default async function FunderSnapshotPrintPage({ params }: PageProps) {
	await requirePagePermission(PERMISSIONS.FUNDING.VIEW);
	const { contractId } = await params;
	const user = await getCurrentUser();
	const orgId = user
		? (await getUserDefaultOrganization(user.$id))?.orgId
		: undefined;
	if (!orgId) {
		return <p className="p-4 text-slate-600">Organization not found.</p>;
	}

	let snapshot;
	try {
		snapshot = await loadFunderSnapshot(orgId, contractId);
	} catch {
		snapshot = null;
	}
	if (!snapshot) {
		return (
			<p className="p-4 text-slate-600">
				Grant not found.{" "}
				<Link href="/contracts/funding-retention" className="text-[#0f5384]">
					Back to funding
				</Link>
			</p>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 print:px-0">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
				<Link
					href="/contracts/funding-retention"
					className="text-sm text-[#0f5384]"
				>
					← Funding & retention
				</Link>
				<FunderSnapshotPrintActions contractId={contractId} />
			</div>
			<article className="mx-auto max-w-4xl bg-white border border-slate-200 shadow-sm rounded-md overflow-hidden print:shadow-none print:border-0">
				<header className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 px-6 py-4 print:bg-white">
					<h1 className="text-xl font-semibold sidebar-gradient-text">
						Funder snapshot
					</h1>
					<p className="text-sm text-slate-600 mt-1">{snapshot.contractName}</p>
					<p className="text-xs text-slate-500 mt-1">
						Generated {new Date(snapshot.generatedAt).toLocaleString()}
					</p>
				</header>
				<div className="p-6 space-y-6 text-sm text-slate-700">
					<section>
						<h2 className="text-sm font-semibold sidebar-gradient-text mb-2">
							Fund
						</h2>
						{snapshot.fund ? (
							<p>
								{snapshot.fund.code} — {snapshot.fund.name}
							</p>
						) : (
							<p className="text-slate-600">No fund linked</p>
						)}
					</section>
					<section>
						<h2 className="text-sm font-semibold sidebar-gradient-text mb-2">
							Budget vs actual
						</h2>
						<p className="tabular-nums">
							Total budget {formatUsd(snapshot.budgetVsActual.totalBudget)} ·
							Actual {formatUsd(snapshot.budgetVsActual.totalActual)}
						</p>
						<ul className="mt-2 space-y-1">
							{snapshot.budgetLines.map((line) => (
								<li key={line.lineId} className="flex justify-between gap-4">
									<span className="capitalize">{line.category}</span>
									<span className="tabular-nums">
										{formatUsd(line.budgetAmount)} / {formatUsd(line.actualAmount)}
									</span>
								</li>
							))}
						</ul>
					</section>
					<section>
						<h2 className="text-sm font-semibold sidebar-gradient-text mb-2">
							Restriction releases
						</h2>
						{snapshot.restrictions.length === 0 ? (
							<p className="text-slate-600">None recorded</p>
						) : (
							<ul className="space-y-1">
								{snapshot.restrictions.map((row, index) => (
									<li key={`${row.releasedAt}-${index}`}>
										{row.releasedAt}: {formatUsd(row.amount)} ({row.fundFrom} →{" "}
										{row.fundTo})
									</li>
								))}
							</ul>
						)}
					</section>
					<section>
						<h2 className="text-sm font-semibold sidebar-gradient-text mb-2">
							Related gifts
						</h2>
						<p className="tabular-nums mb-2">
							Cash total {formatUsd(snapshot.giftsCashTotal)} ·{" "}
							{snapshot.gifts.length} posted row(s)
						</p>
					</section>
					<section>
						<h2 className="text-sm font-semibold sidebar-gradient-text mb-2">
							Volunteer hours (approved, grant-tagged)
						</h2>
						<p className="tabular-nums">
							{Math.round(snapshot.volunteerHoursTotalMinutes / 60 * 10) / 10}{" "}
							hours · {snapshot.volunteerHours.length} log(s)
						</p>
					</section>
				</div>
			</article>
		</div>
	);
}
