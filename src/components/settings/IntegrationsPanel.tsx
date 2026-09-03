"use client";

import { KeyRound, Shield, Webhook } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { PageIndex } from "@/components/ui/page-index";
import HubSpotIntegrationCard from "./HubSpotIntegrationCard";
import IntegrationCard from "./IntegrationCard";
import OutlookIntegrationCard from "./OutlookIntegrationCard";
import SalesforceIntegrationCard from "./SalesforceIntegrationCard";

const PAGE_SIZE = 12;

interface IntegrationsPanelProps {
	userId: string;
	orgId: string;
	subscriptionTier: "starter" | "growth" | "enterprise";
	onViewPlans: () => void;
}

export default function IntegrationsPanel({
	userId,
	orgId,
	subscriptionTier,
	onViewPlans,
}: IntegrationsPanelProps) {
	const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";
	const hasApiAccess =
		subscriptionTier === "growth" || subscriptionTier === "enterprise";
	const hasSso = subscriptionTier === "enterprise";
	const hasHubSpot = hasApiAccess;
	const hasSalesforce = subscriptionTier === "enterprise";
	const [page, setPage] = useState(1);

	const cards = useMemo(() => {
		const items: ReactNode[] = [];

		if (!isDemo) {
			items.push(
				<OutlookIntegrationCard key="outlook" userId={userId} />,
			);
		}

		items.push(
			<HubSpotIntegrationCard
				key="hubspot"
				orgId={orgId}
				locked={!hasHubSpot}
				demoLocked={isDemo}
				onViewPlans={onViewPlans}
			/>,
			<SalesforceIntegrationCard
				key="salesforce"
				orgId={orgId}
				locked={!hasSalesforce || isDemo}
				onViewPlans={onViewPlans}
			/>,
			<IntegrationCard
				key="api-webhooks"
				title="API & Webhooks"
				description="Programmatic access and outbound event webhooks for your workspace."
				icon={Webhook}
				status={hasApiAccess ? "disconnected" : "locked"}
				lockedHint="Available on Growth and Enterprise plans."
				onConnect={hasApiAccess ? undefined : onViewPlans}
				actions={
					hasApiAccess ? (
						<p className="text-xs text-slate-500">
							Webhook endpoints and API keys will appear here when enabled for
							your organization.
						</p>
					) : undefined
				}
			/>,
			<IntegrationCard
				key="sso"
				title="SSO / SAML"
				description="Enterprise identity with SAML and SCIM provisioning."
				icon={Shield}
				status={hasSso ? "disconnected" : "locked"}
				lockedHint="Available on the Enterprise plan."
				onConnect={hasSso ? undefined : onViewPlans}
				actions={
					hasSso ? (
						<p className="text-xs text-slate-500">
							Configure your identity provider once SSO is provisioned for
							your organization.
						</p>
					) : undefined
				}
			/>,
			<IntegrationCard
				key="api-keys"
				title="API keys"
				description="Manage organization API keys for trusted integrations."
				icon={KeyRound}
				status={hasApiAccess ? "disconnected" : "locked"}
				lockedHint="Available on Growth and Enterprise plans."
				onConnect={hasApiAccess ? undefined : onViewPlans}
			/>,
		);

		return items;
	}, [
		hasApiAccess,
		hasHubSpot,
		hasSalesforce,
		hasSso,
		isDemo,
		onViewPlans,
		orgId,
		userId,
	]);

	const totalItems = cards.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pageCards = cards.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);

	return (
		<div className="space-y-6">
			<div>
				<p className="text-sm text-slate-600 mb-4">
					{isDemo
						? "External integrations are disabled in the demo sandbox."
						: "Connect third-party tools to extend CAALM. Connected apps appear with status badges; upgrade unlocks API and SSO options."}
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{pageCards}
			</div>

			<PageIndex
				page={safePage}
				totalItems={totalItems}
				pageSize={PAGE_SIZE}
				onPageChange={setPage}
				hideWhenSinglePage
				showRange
				itemLabel="integrations"
			/>
		</div>
	);
}
