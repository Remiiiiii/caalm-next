"use client";

import { KeyRound, Shield, Webhook } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { PageIndex } from "@/components/ui/page-index";
import GmailIntegrationCard from "./GmailIntegrationCard";
import HubSpotIntegrationCard from "./HubSpotIntegrationCard";
import IntegrationCard from "./IntegrationCard";
import OutlookIntegrationCard from "./OutlookIntegrationCard";
import SalesforceIntegrationCard from "./SalesforceIntegrationCard";

const PAGE_SIZE = 12;

const CONTACT_SALES_PATH = "/request-a-demo";
const PLATFORM_READINESS_ROADMAP =
	"/dashboard/it/development/platform-readiness-roadmap";
const CLM_ROADMAP = "/dashboard/it/development/clm-roadmap";

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
	const router = useRouter();
	const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";
	const hasApiAccess =
		subscriptionTier === "growth" || subscriptionTier === "enterprise";
	const hasSso = subscriptionTier === "enterprise";
	const hasHubSpot = hasApiAccess;
	const hasSalesforce = subscriptionTier === "enterprise";
	const [page, setPage] = useState(1);

	const goContactSales = useCallback(
		() => router.push(CONTACT_SALES_PATH),
		[router],
	);

	const cards = useMemo(() => {
		const items: ReactNode[] = [];

		if (!isDemo) {
			items.push(<OutlookIntegrationCard key="outlook" userId={userId} />);
			items.push(<GmailIntegrationCard key="gmail" userId={userId} />);
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
				status={hasApiAccess ? "coming_soon" : "locked"}
				info={
					hasApiAccess ? (
						<>Not self-serve yet — contact sales for timeline. </>
					) : undefined
				}
				lockedHint="Available on Growth and Enterprise plans."
				onConnect={hasApiAccess ? undefined : onViewPlans}
				onContactSales={hasApiAccess ? goContactSales : undefined}
			/>,
			<IntegrationCard
				key="sso"
				title="SSO / SAML"
				description="Enterprise identity with SAML and SCIM provisioning."
				icon={Shield}
				status={hasSso ? "coming_soon" : "locked"}
				info={
					hasSso ? (
						<>
							Identity provider setup is sales-assisted — never shown as
							Connected until SAML is wired.
						</>
					) : undefined
				}
				lockedHint="Available on the Enterprise plan."
				onConnect={hasSso ? undefined : onViewPlans}
				onContactSales={hasSso ? goContactSales : undefined}
			/>,
			<IntegrationCard
				key="api-keys"
				title="API keys"
				description="Manage organization API keys for trusted integrations."
				icon={KeyRound}
				status={hasApiAccess ? "coming_soon" : "locked"}
				info={
					hasApiAccess ? (
						<>Organization API keys appear here when customer API ships. </>
					) : undefined
				}
				lockedHint="Available on Growth and Enterprise plans."
				onConnect={hasApiAccess ? undefined : onViewPlans}
				onContactSales={hasApiAccess ? goContactSales : undefined}
			/>,
		);

		return items;
	}, [
		goContactSales,
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
						: "Connect third-party tools to extend CAALM. Mail and CRM cards reflect real OAuth state. SSO, customer API, and webhooks stay Coming soon until wired — use Contact sales on Enterprise, not a fake Connect button."}
				</p>
			</div>

			<div className="grid grid-cols-3 gap-6">{pageCards}</div>

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
