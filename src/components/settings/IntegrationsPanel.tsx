"use client";

import { KeyRound, Shield, Webhook } from "lucide-react";
import IntegrationCard from "./IntegrationCard";
import OutlookIntegrationCard from "./OutlookIntegrationCard";

interface IntegrationsPanelProps {
	userId: string;
	subscriptionTier: "starter" | "growth" | "enterprise";
	onViewPlans: () => void;
}

export default function IntegrationsPanel({
	userId,
	subscriptionTier,
	onViewPlans,
}: IntegrationsPanelProps) {
	const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";
	const hasApiAccess =
		subscriptionTier === "growth" || subscriptionTier === "enterprise";
	const hasSso = subscriptionTier === "enterprise";

	return (
		<div className="space-y-6">
			<div>
				<p className="text-sm text-slate-600 mb-4">
					{isDemo
						? "External integrations are disabled in the demo sandbox."
						: "Connect third-party tools to extend CAALM. Connected apps appear with status badges; upgrade unlocks API and SSO options."}
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{!isDemo && <OutlookIntegrationCard userId={userId} />}

				<IntegrationCard
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
				/>

				<IntegrationCard
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
				/>

				<IntegrationCard
					title="API keys"
					description="Manage organization API keys for trusted integrations."
					icon={KeyRound}
					status={hasApiAccess ? "disconnected" : "locked"}
					lockedHint="Available on Growth and Enterprise plans."
					onConnect={hasApiAccess ? undefined : onViewPlans}
				/>
			</div>
		</div>
	);
}
