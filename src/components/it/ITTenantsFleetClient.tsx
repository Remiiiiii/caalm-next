"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SearchField } from "@/components/ui/search-field";
import { PageIndex } from "@/components/ui/page-index";
import { LoadingSpinner } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";
import { useITOrgScope } from "@/contexts/ITOrgScopeContext";
import type { OrgITFleetRow } from "@/lib/it/org-it-snapshot";
import { formatStorageUsedBytes } from "@/lib/storage/formatStorageUsed";
import useSWR from "swr";

type FleetPayload = {
	rows: OrgITFleetRow[];
	total: number;
	page: number;
	pageSize: number;
};

const fetcher = async (url: string): Promise<FleetPayload> => {
	const response = await fetch(url);
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body.error || "Failed to load tenants");
	}
	const json = await response.json();
	return json.data;
};

export function ITTenantsFleetClient() {
	const { setHubOrgId } = useITOrgScope();
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const url = `/api/it/hub/fleet?page=${page}&q=${encodeURIComponent(query.trim())}`;
	const { data, error, isLoading } = useSWR(url, fetcher);

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<SearchField
					containerClassName="max-w-md w-full"
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
					placeholder="Search organizations…"
					aria-label="Search organizations"
				/>
			</div>

			{isLoading ? (
				<div className="flex justify-center py-12">
					<LoadingSpinner size="sm" label="Loading tenants…" />
				</div>
			) : error ? (
				<p className="text-sm text-red">{error.message}</p>
			) : (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="overflow-x-auto">
							<table className="w-full text-sm text-left">
								<thead>
									<tr className="border-b border-slate-200 text-slate-600">
										<th className="py-2 pr-4 font-medium">Organization</th>
										<th className="py-2 pr-4 font-medium">Plan</th>
										<th className="py-2 pr-4 font-medium">Seats</th>
										<th className="py-2 pr-4 font-medium">Storage</th>
										<th className="py-2 pr-4 font-medium">Tickets</th>
										<th className="py-2 font-medium">Deletion</th>
									</tr>
								</thead>
								<tbody>
									{(data?.rows ?? []).map((row) => {
										const storage = formatStorageUsedBytes(row.storageUsedBytes);
										return (
											<tr
												key={row.orgId}
												className="border-b border-slate-100 last:border-0"
											>
												<td className="py-3 pr-4">
													<Link
														href={`/dashboard/it/tenants/${encodeURIComponent(row.orgId)}`}
														className="inline-flex items-center gap-2 text-[#0f5384] hover:underline"
														onClick={() => setHubOrgId(row.orgId)}
													>
														<Building2 className="h-4 w-4" />
														{row.name}
													</Link>
												</td>
												<td className="py-3 pr-4 capitalize text-slate-700">
													{row.tier}
												</td>
												<td className="py-3 pr-4 tabular-nums text-slate-700">
													{row.usersUsed ?? "—"} / {row.usersLimit}
												</td>
												<td className="py-3 pr-4 tabular-nums text-slate-700">
													{storage.formatted} {storage.unit}
												</td>
												<td className="py-3 pr-4 tabular-nums text-slate-700">
													{row.openTickets}
													{row.criticalOpen > 0
														? ` (${row.criticalOpen} critical)`
														: ""}
												</td>
												<td className="py-3 text-slate-600">
													{row.deletionScheduledAt ? "Scheduled" : "—"}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
						<PageIndex
							page={page}
							totalItems={data?.total ?? 0}
							pageSize={data?.pageSize ?? 20}
							onPageChange={setPage}
							hideWhenSinglePage
							showRange
							itemLabel="organizations"
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
