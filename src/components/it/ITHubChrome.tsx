"use client";

import { Building2, ChevronDown, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { DropdownScrollArea } from "@/components/ui/DropdownScrollArea";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_PILL_TRIGGER } from "@/components/ui/filter-pill";
import { useITOrgScope } from "@/contexts/ITOrgScopeContext";
import { useITHubOverview } from "@/hooks/useITHubOverview";
import type { OrgITFleetRow } from "@/lib/it/org-it-snapshot";
import { IT_DROPDOWN_PANEL } from "@/lib/ui/it-routes";
import { cn } from "@/lib/utils";

const fleetFetcher = async (
	url: string,
): Promise<{ rows: OrgITFleetRow[] }> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to load tenants");
	}
	const json = await response.json();
	return json.data;
};

/** Pages that render their own `<TenantSwitcher />` in their own header row. */
const PAGES_WITH_OWN_SWITCHER = new Set(["/dashboard/it/incidents/active"]);

/** Standalone "Switch tenant" trigger — reused by ITHubChrome and by pages that place it in their own header row. */
export function TenantSwitcher() {
	const { canViewFleet, setHubOrgId } = useITOrgScope();
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
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
		<DropdownMenu
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setQuery("");
			}}
		>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Switch IT hub tenant"
					className={FILTER_PILL_TRIGGER}
				>
					<Building2 className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
					<span className="max-w-[10rem] truncate">Switch tenant</span>
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200",
							open && "rotate-180",
						)}
						aria-hidden
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className={`${IT_DROPDOWN_PANEL} w-80 overflow-x-hidden p-0`}
			>
				<div className="border-b border-slate-200/80 p-2">
					<label className="flex h-9 items-center gap-2 rounded-md border-[0.25px] border-slate-300 bg-white px-2.5">
						<Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
						<input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search tenants…"
							className="h-full w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
							aria-label="Search tenants"
							onKeyDown={(e) => e.stopPropagation()}
						/>
					</label>
				</div>
				<DropdownScrollArea className="px-1 py-1">
					{matches.length === 0 ? (
						<p className="px-3 py-4 text-center text-xs text-slate-500">
							{query.trim()
								? "No tenants match that search."
								: "No tenants found."}
						</p>
					) : (
						matches.slice(0, 8).map((row) => (
							<button
								key={row.orgId}
								type="button"
								className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
								onClick={() => {
									void selectOrg(row.orgId);
								}}
							>
								<Building2 className="h-4 w-4 shrink-0 text-[#0f5384]" />
								<span className="flex-1 truncate">{row.name}</span>
								<span className="text-xs text-slate-500">{row.tier}</span>
							</button>
						))
					)}
				</DropdownScrollArea>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function ITHubChrome() {
	const { hubOrgId, membershipOrgId, canViewFleet, setHubOrgId } =
		useITOrgScope();
	const { snapshot } = useITHubOverview(canViewFleet ? hubOrgId : null);
	const router = useRouter();
	const pathname = usePathname();
	const ownsSwitcher = PAGES_WITH_OWN_SWITCHER.has(pathname ?? "");

	if (!canViewFleet) return null;

	const viewingOther =
		!!hubOrgId && !!membershipOrgId && hubOrgId !== membershipOrgId;
	const tenantName = snapshot?.name || hubOrgId;

	if (!viewingOther && !hubOrgId && ownsSwitcher) return null;

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-4 space-y-3">
			{viewingOther || hubOrgId ? (
				<div
					role="status"
					className="flex w-full items-center justify-between gap-3 rounded-lg border border-orange/20 bg-orange/15 px-4 py-2 text-slate-700"
				>
					<p className="min-w-0 text-sm font-medium">
						Viewing tenant: {tenantName}
						<span className="text-slate-600"> · read-only IT inspection</span>
					</p>
					<Button
						type="button"
						variant="brand"
						className="shrink-0"
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

			{ownsSwitcher ? null : (
				<div className="ml-auto max-w-md">
					<TenantSwitcher />
				</div>
			)}
		</div>
	);
}
