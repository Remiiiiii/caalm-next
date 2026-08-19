"use client";

import { ArrowLeft, CreditCard, Puzzle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import BillingOverviewCard from "@/components/settings/BillingOverviewCard";
import IntegrationsPanel from "@/components/settings/IntegrationsPanel";
import InvoiceHistoryTable, {
	type InvoiceRow,
} from "@/components/settings/InvoiceHistoryTable";
import PlanUpgradeSection from "@/components/settings/PlanUpgradeSection";
import UsageMetersCard from "@/components/settings/UsageMetersCard";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { PricingPlan } from "@/lib/pricing";

interface SubscriptionPayload {
	orgId: string;
	name: string;
	subscriptionTier: "starter" | "growth" | "enterprise";
	billingStatus: string;
	billingInterval: string | null;
	currentPeriodEnd: string | null;
	stripeConfigured: boolean;
	access?: {
		state: string;
		canWrite: boolean;
		canCheckout: boolean;
		warning: string | null;
		pilotEndsAt: string | null;
		graceEndsAt: string | null;
	};
	entitlements?: {
		tier: string;
		maxUsers: number;
		maxDepartments: number | null;
		maxContracts: number | null;
		storageBytes: number;
	};
	plan: {
		key: string;
		name: string;
		monthly: number;
		yearly: number;
		features: string[];
	} | null;
	usage: {
		storage: { used: number; limit: number };
		users: { used: number | null; limit: number };
		departments: { used: number | null; limit: number | null };
		contracts: { used: number | null; limit: number | null };
	};
	plans: PricingPlan[];
}

export default function BillingIntegrationsPage() {
	const { user } = useAuth();
	const { orgId } = useOrganization();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { toast } = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();

	const resolvedOrgId = orgId || "default_organization";
	const initialTab =
		searchParams?.get("tab") === "integrations" ? "integrations" : "billing";

	const [tab, setTab] = useState(initialTab);
	const [subscription, setSubscription] = useState<SubscriptionPayload | null>(
		null,
	);
	const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
	const [loadingSub, setLoadingSub] = useState(true);
	const [loadingInvoices, setLoadingInvoices] = useState(false);
	const [invoiceError, setInvoiceError] = useState<string | null>(null);
	const [managing, setManaging] = useState(false);
	const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
	const [showPlans, setShowPlans] = useState(false);

	const canBilling = useMemo(
		() => permissions.includes(PERMISSIONS.SETTINGS.BILLING),
		[permissions],
	);
	const canIntegrations = useMemo(
		() => permissions.includes(PERMISSIONS.SETTINGS.INTEGRATIONS),
		[permissions],
	);
	const canAccessPage = canBilling || canIntegrations;

	const loadSubscription = useCallback(async () => {
		if (!canBilling) {
			setLoadingSub(false);
			return;
		}
		try {
			setLoadingSub(true);
			const res = await fetch(
				`/api/billing/subscription?orgId=${encodeURIComponent(resolvedOrgId)}`,
				{ headers: { "x-org-id": resolvedOrgId } },
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Failed to load billing");
			}
			const data = (await res.json()) as SubscriptionPayload;
			setSubscription(data);
		} catch (error: any) {
			toast({
				title: "Billing unavailable",
				description: error?.message || "Could not load subscription",
				variant: "destructive",
			});
		} finally {
			setLoadingSub(false);
		}
	}, [canBilling, resolvedOrgId, toast]);

	const loadInvoices = useCallback(async () => {
		if (!canBilling) return;
		try {
			setLoadingInvoices(true);
			setInvoiceError(null);
			const res = await fetch(
				`/api/billing/invoices?orgId=${encodeURIComponent(resolvedOrgId)}`,
				{ headers: { "x-org-id": resolvedOrgId } },
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Failed to load invoices");
			}
			const data = await res.json();
			setInvoices(data.invoices || []);
		} catch (error: any) {
			setInvoiceError(error?.message || "Failed to load invoices");
		} finally {
			setLoadingInvoices(false);
		}
	}, [canBilling, resolvedOrgId]);

	useEffect(() => {
		if (!permissionsLoading && canBilling) {
			loadSubscription();
			loadInvoices();
		} else if (!permissionsLoading) {
			setLoadingSub(false);
		}
	}, [permissionsLoading, canBilling, loadSubscription, loadInvoices]);

	useEffect(() => {
		const checkout = searchParams?.get("checkout");
		if (checkout === "success") {
			toast({
				title: "Checkout complete",
				description: "Your subscription will update shortly.",
			});
			loadSubscription();
			loadInvoices();
		}
	}, [searchParams, toast, loadSubscription, loadInvoices]);

	useEffect(() => {
		if (!permissionsLoading && !canAccessPage) {
			router.replace("/settings");
		}
	}, [permissionsLoading, canAccessPage, router]);

	useEffect(() => {
		if (!permissionsLoading) {
			if (tab === "billing" && !canBilling && canIntegrations) {
				setTab("integrations");
			} else if (tab === "integrations" && !canIntegrations && canBilling) {
				setTab("billing");
			}
		}
	}, [permissionsLoading, tab, canBilling, canIntegrations]);

	const handleManageBilling = async () => {
		try {
			setManaging(true);
			const res = await fetch("/api/billing/portal", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-org-id": resolvedOrgId,
				},
				body: JSON.stringify({ orgId: resolvedOrgId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Portal unavailable");
			window.location.href = data.url;
		} catch (error: any) {
			toast({
				title: "Portal error",
				description: error?.message || "Could not open billing portal",
				variant: "destructive",
			});
			setManaging(false);
		}
	};

	const handleCheckout = async (
		tier: "starter" | "growth" | "enterprise",
		interval: "monthly" | "yearly",
	) => {
		try {
			setCheckoutTier(tier);
			const res = await fetch("/api/billing/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-org-id": resolvedOrgId,
				},
				body: JSON.stringify({ orgId: resolvedOrgId, tier, interval }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Checkout unavailable");
			window.location.href = data.url;
		} catch (error: any) {
			toast({
				title: "Checkout error",
				description: error?.message || "Could not start checkout",
				variant: "destructive",
			});
			setCheckoutTier(null);
		}
	};

	if (permissionsLoading || (canBilling && loadingSub && !subscription)) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
				<LoadingSpinner size="sm" label="Loading billing…" />
			</div>
		);
	}

	if (!canAccessPage) {
		return null;
	}

	const defaultTab = canBilling ? "billing" : "integrations";

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<Link href="/settings">
					<Button
						variant="outline"
						size="sm"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
					>
						<ArrowLeft className="h-4 w-4" />
						Back
					</Button>
				</Link>
				<div>
					<h1 className="h1 capitalize sidebar-gradient-text">
						Billing & Integrations
					</h1>
					<p className="text-sm text-slate-600 mt-1">
						Manage your subscription, usage, and connected apps
					</p>
				</div>
			</div>

			<Tabs
				value={tab || defaultTab}
				onValueChange={(value) => {
					setTab(value);
					const url = new URL(window.location.href);
					url.searchParams.set("tab", value);
					window.history.replaceState({}, "", url.toString());
				}}
				className="space-y-6"
			>
				<TabsList className="bg-white/60 border border-slate-200">
					{canBilling && (
						<TabsTrigger value="billing" className="cursor-pointer gap-2">
							<CreditCard className="h-4 w-4" />
							Billing
						</TabsTrigger>
					)}
					{canIntegrations && (
						<TabsTrigger value="integrations" className="cursor-pointer gap-2">
							<Puzzle className="h-4 w-4" />
							Integrations
						</TabsTrigger>
					)}
				</TabsList>

				{canBilling && (
					<TabsContent value="billing" className="space-y-6">
						<PermissionGate permission={PERMISSIONS.SETTINGS.BILLING}>
							{subscription && (
								<>
									<BillingOverviewCard
										planName={
											subscription.plan?.name || subscription.subscriptionTier
										}
										tier={subscription.subscriptionTier}
										status={subscription.billingStatus}
										interval={subscription.billingInterval}
										monthly={subscription.plan?.monthly ?? null}
										yearly={subscription.plan?.yearly ?? null}
										currentPeriodEnd={subscription.currentPeriodEnd}
										stripeConfigured={subscription.stripeConfigured}
										onManageBilling={handleManageBilling}
										onChangePlan={() => setShowPlans(true)}
										managing={managing}
									/>

									<UsageMetersCard
										storageUsed={subscription.usage.storage.used}
										storageLimit={subscription.usage.storage.limit}
										usersUsed={subscription.usage.users.used}
										usersLimit={subscription.usage.users.limit}
										departmentsUsed={subscription.usage.departments.used}
										departmentsLimit={subscription.usage.departments.limit}
										contractsUsed={subscription.usage.contracts.used}
										contractsLimit={subscription.usage.contracts.limit}
									/>

									{(showPlans ||
										subscription.billingStatus === "none" ||
										subscription.billingStatus === "canceled") && (
										<PlanUpgradeSection
											plans={subscription.plans}
											currentTier={subscription.subscriptionTier}
											stripeConfigured={subscription.stripeConfigured}
											onCheckout={handleCheckout}
											loadingTier={checkoutTier}
										/>
									)}

									{!showPlans &&
										subscription.billingStatus !== "none" &&
										subscription.billingStatus !== "canceled" && (
											<div className="flex justify-end">
												<Button
													variant="outline"
													className="primary-btn px-3 sm:px-4 cursor-pointer"
													onClick={() => setShowPlans(true)}
												>
													Compare plans
												</Button>
											</div>
										)}

									<InvoiceHistoryTable
										invoices={invoices}
										loading={loadingInvoices}
										error={invoiceError}
									/>
								</>
							)}
						</PermissionGate>
					</TabsContent>
				)}

				{canIntegrations && (
					<TabsContent value="integrations" className="space-y-6">
						<PermissionGate permission={PERMISSIONS.SETTINGS.INTEGRATIONS}>
							{user?.$id && (
								<IntegrationsPanel
									userId={user.$id}
									subscriptionTier={subscription?.subscriptionTier || "starter"}
									onViewPlans={() => {
										if (canBilling) {
											setTab("billing");
											setShowPlans(true);
										} else {
											toast({
												title: "Upgrade required",
												description:
													"Ask an admin with billing access to upgrade your plan.",
											});
										}
									}}
								/>
							)}
						</PermissionGate>
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
}
