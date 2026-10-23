"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useITOrgScope } from "@/contexts/ITOrgScopeContext";
import type { OrgITFleetRow } from "@/lib/it/org-it-snapshot";
import { formatStorageUsedBytes } from "@/lib/storage/formatStorageUsed";
import { cn } from "@/lib/utils";

const rowPad = "px-3 py-3 align-middle";

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
						<CaalmDataTable className="pb-0">
							<TableHeader className="[&_tr]:border-b-0">
								<TableRow className={DATA_TABLE_HEADER_ROW}>
									<TableHead
										className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}
									>
										Organization
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
										Plan
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
										Seats
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
										Storage
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
										Tickets
									</TableHead>
									<TableHead
										className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4")}
									>
										Deletion
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody className="[&_tr:last-child>td]:border-b-0">
								{(data?.rows ?? []).map((row) => {
									const storage = formatStorageUsedBytes(row.storageUsedBytes);
									return (
										<TableRow
											key={row.orgId}
											className={DATA_TABLE_BODY_ROW_BASE}
										>
											<TableCell className={cn(rowPad, "pl-4 pr-3")}>
												<Link
													href={`/dashboard/it/tenants/${encodeURIComponent(row.orgId)}`}
													className="inline-flex items-center gap-2 text-[#0f5384] hover:underline"
													onClick={() => setHubOrgId(row.orgId)}
												>
													<Building2 className="h-4 w-4" />
													{row.name}
												</Link>
											</TableCell>
											<TableCell
												className={cn(rowPad, "capitalize text-slate-700")}
											>
												{row.tier}
											</TableCell>
											<TableCell
												className={cn(rowPad, "tabular-nums text-slate-700")}
											>
												{row.usersUsed ?? "—"} / {row.usersLimit}
											</TableCell>
											<TableCell
												className={cn(rowPad, "tabular-nums text-slate-700")}
											>
												{storage.formatted} {storage.unit}
											</TableCell>
											<TableCell
												className={cn(rowPad, "tabular-nums text-slate-700")}
											>
												{row.openTickets}
												{row.criticalOpen > 0
													? ` (${row.criticalOpen} critical)`
													: ""}
											</TableCell>
											<TableCell
												className={cn(rowPad, "pl-3 pr-4 text-slate-600")}
											>
												{row.deletionScheduledAt ? "Scheduled" : "—"}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</CaalmDataTable>
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
