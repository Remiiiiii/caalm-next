"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import RoundedUnderlineTabs from "@/components/RoundedUnderlineTabs";
import { ITHubOverviewCards } from "@/components/it/ITHubOverviewCards";
import { Card, CardContent } from "@/components/ui/card";
import { useITOrgScope } from "@/contexts/ITOrgScopeContext";

const TABS = [
	{ value: "overview", label: "Overview" },
	{ value: "users", label: "Users & access" },
	{ value: "storage", label: "Storage" },
	{ value: "support", label: "Support" },
	{ value: "security", label: "Security" },
	{ value: "billing", label: "Billing" },
	{ value: "integrations", label: "Integrations" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function isTab(value: string | null): value is TabValue {
	return TABS.some((tab) => tab.value === value);
}

export function ITTenantHubClient({ orgId }: { orgId: string }) {
	const { setHubOrgId } = useITOrgScope();
	const searchParams = useSearchParams();
	const router = useRouter();
	const tabParam = searchParams.get("tab");
	const tab: TabValue = isTab(tabParam) ? tabParam : "overview";

	useEffect(() => {
		setHubOrgId(orgId);
	}, [orgId, setHubOrgId]);

	const setTab = (next: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (next === "overview") params.delete("tab");
		else params.set("tab", next);
		const qs = params.toString();
		router.replace(
			qs
				? `/dashboard/it/tenants/${encodeURIComponent(orgId)}?${qs}`
				: `/dashboard/it/tenants/${encodeURIComponent(orgId)}`,
			{ scroll: false },
		);
	};

	return (
		<div className="space-y-6">
			<RoundedUnderlineTabs
				tabs={[...TABS]}
				value={tab}
				onValueChange={setTab}
				variant="bar"
				aria-label="Tenant IT sections"
			/>

			{tab === "overview" ? <ITHubOverviewCards orgId={orgId} /> : null}

			{tab === "users" ? (
				<LinkCard
					title="Users & access"
					body="Seat usage lives on the overview. Open the IT directory to review people and roles."
					href="/dashboard/it/team/directory"
					label="Open IT directory"
				/>
			) : null}
			{tab === "storage" ? (
				<LinkCard
					title="Storage & entitlements"
					body="Org file bytes are on the overview. Host disk scan is a separate local signal."
					href="/dashboard/it/storage"
					label="Open storage"
				/>
			) : null}
			{tab === "support" ? (
				<LinkCard
					title="Support tickets"
					body="Open tickets for this tenant appear on the overview. The queue is the working list."
					href="/tickets"
					label="Open tickets"
				/>
			) : null}
			{tab === "security" ? (
				<LinkCard
					title="Security & audit"
					body="Recent audit events are on the overview. Full logs stay on the audit page."
					href="/dashboard/it/security/audit-logs"
					label="Open audit logs"
				/>
			) : null}
			{tab === "billing" ? (
				<LinkCard
					title="Billing & plan"
					body="Plan tier and billing status are on the overview. Stripe portal stays in Settings."
					href="/settings/organization"
					label="Open organization settings"
				/>
			) : null}
			{tab === "integrations" ? (
				<LinkCard
					title="Integrations & data"
					body="HubSpot connection status is on the overview. Export and deletion stay in Settings."
					href="/settings/organization"
					label="Open data controls"
				/>
			) : null}
		</div>
	);
}

function LinkCard({
	title,
	body,
	href,
	label,
}: {
	title: string;
	body: string;
	href: string;
	label: string;
}) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-3">
				<p className="text-sm font-medium sidebar-gradient-text">{title}</p>
				<p className="text-sm text-slate-600">{body}</p>
				<div className="flex justify-end">
					<Link
						href={href}
						className="text-sm font-medium text-[#0f5384] hover:underline"
					>
						{label}
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
