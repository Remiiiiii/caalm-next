"use client";

import { Building2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchField } from "@/components/ui/search-field";
import { Button } from "@/components/ui/button";
import { useITOrgScope } from "@/contexts/ITOrgScopeContext";
import { useITHubOverview } from "@/hooks/useITHubOverview";
import type { OrgITFleetRow } from "@/lib/it/org-it-snapshot";
import useSWR from "swr";

const fleetFetcher = async (url: string): Promise<{ rows: OrgITFleetRow[] }> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to load tenants");
	}
	const json = await response.json();
	return json.data;
};

export function ITHubChrome() {
	const { hubOrgId, membershipOrgId, canViewFleet, setHubOrgId } =
		useITOrgScope();
	const { snapshot } = useITHubOverview(canViewFleet ? hubOrgId : null);
	const [query, setQuery] = useState("");
	const router = useRouter();

	const fleetKey =
		canViewFleet && query.trim().length > 0
			? `/api/it/hub/fleet?q=${encodeURIComponent(query.trim())}&page=1`
			: canViewFleet
				? "/api/it/hub/fleet?page=1"
				: null;

	const { data } = useSWR(fleetKey, fleetFetcher, {
		revalidateOnFocus: false,
	});

	const matches = useMemo(() => data?.rows ?? [], [data]);

	if (!canViewFleet) return null;

	const viewingOther =
		!!hubOrgId && !!membershipOrgId && hubOrgId !== membershipOrgId;
	const tenantName = snapshot?.name || hubOrgId;

	const selectOrg = async (orgId: string) => {
		setHubOrgId(orgId);
		setQuery("");
		await fetch("/api/it/hub/select-org", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ orgId }),
		}).catch(() => undefined);
		router.push(`/dashboard/it/tenants/${encodeURIComponent(orgId)}`);
	};

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-4 space-y-3">
			{viewingOther || hubOrgId ? (
				<div
					role="status"
					className="flex w-full items-center justify-between gap-3 rounded-lg border border-orange/20 bg-orange/15 px-4 py-2 text-slate-800"
				>
					<p className="min-w-0 text-sm font-medium">
						Viewing tenant: {tenantName}
						<span className="text-slate-600"> · read-only IT inspection</span>
					</p>
					<Button
						type="button"
						className="primary-btn shrink-0 px-3 sm:px-4"
						onClick={() => {
							setHubOrgId(null);
							router.push("/dashboard/it/tenants");
						}}
					>
						<X className="h-4 w-4" />
						Clear tenant
					</Button>
				</div>
			) : null}

			<div className="relative max-w-md ml-auto">
				<SearchField
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Switch tenant…"
					aria-label="Switch IT hub tenant"
				/>
				{query.trim() && matches.length > 0 ? (
					<ul className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md">
						{matches.slice(0, 8).map((row) => (
							<li key={row.orgId}>
								<button
									type="button"
									className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
									onClick={() => {
										void selectOrg(row.orgId);
									}}
								>
									<Building2 className="h-4 w-4 text-[#0f5384]" />
									<span className="truncate">{row.name}</span>
									<span className="text-xs text-slate-500">{row.tier}</span>
								</button>
							</li>
						))}
					</ul>
				) : null}
			</div>
		</div>
	);
}
