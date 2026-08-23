"use client";



import { CreditCard, Puzzle } from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PermissionGate } from "@/components/PermissionGate";

import AdjustPlanDialog from "@/components/sidebar/AdjustPlanDialog";

import BillingOverviewCard from "@/components/settings/BillingOverviewCard";

import { BillingSectionLabel } from "@/components/settings/BillingSectionLabel";

import IntegrationsPanel from "@/components/settings/IntegrationsPanel";

import InvoiceHistoryTable, {

	type InvoiceRow,

} from "@/components/settings/InvoiceHistoryTable";

import PaymentMethodsSection, {

	type PaymentMethodRow,

} from "@/components/settings/PaymentMethodsSection";

import UsageMetersCard from "@/components/settings/UsageMetersCard";

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

	const { orgId, loading: orgLoading } = useOrganization();

	const { permissions, loading: permissionsLoading } = usePermissions();

	const { toast } = useToast();

	const router = useRouter();

	const searchParams = useSearchParams();



	const resolvedOrgId = orgId ?? "";

	const initialTab =

		searchParams?.get("tab") === "integrations" ? "integrations" : "billing";



	const [tab, setTab] = useState(initialTab);

	const [subscription, setSubscription] = useState<SubscriptionPayload | null>(

		null,

	);

	const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

	const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
	const [hasUpcomingInvoice, setHasUpcomingInvoice] = useState(false);
	const [paymentMethodsOrgName, setPaymentMethodsOrgName] = useState("");

	const [loadingSub, setLoadingSub] = useState(true);
	const [subscriptionError, setSubscriptionError] = useState<string | null>(
		null,
	);

	const [loadingInvoices, setLoadingInvoices] = useState(false);

	const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

	const [invoiceError, setInvoiceError] = useState<string | null>(null);

	const [paymentMethodError, setPaymentMethodError] = useState<string | null>(

		null,

	);

	const [paymentMethodActionError, setPaymentMethodActionError] = useState<

		string | null

	>(null);

	const [managing, setManaging] = useState(false);

	const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);

	const [replacingPaymentMethodId, setReplacingPaymentMethodId] = useState<

		string | null

	>(null);

	const [planOpen, setPlanOpen] = useState(false);



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

		if (!canBilling || !resolvedOrgId) {

			setLoadingSub(false);

			return;

		}

		try {

			setLoadingSub(true);

			setSubscriptionError(null);

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

		} catch (error: unknown) {

			const message =

				error instanceof Error ? error.message : "Could not load subscription";

			setSubscriptionError(message);

			toast({

				title: "Billing unavailable",

				description: message,

				variant: "destructive",

			});

		} finally {

			setLoadingSub(false);

		}

	}, [canBilling, resolvedOrgId, toast]);



	const loadInvoices = useCallback(async () => {

		if (!canBilling || !resolvedOrgId) return;

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

		} catch (error: unknown) {

			const message =

				error instanceof Error ? error.message : "Failed to load invoices";

			setInvoiceError(message);

		} finally {

			setLoadingInvoices(false);

		}

	}, [canBilling, resolvedOrgId]);



	const loadPaymentMethods = useCallback(async (options?: { silent?: boolean }) => {

		if (!canBilling || !resolvedOrgId) return;

		try {

			if (!options?.silent) {
				setLoadingPaymentMethods(true);
			}

			setPaymentMethodError(null);

			const res = await fetch(

				`/api/billing/payment-methods?orgId=${encodeURIComponent(resolvedOrgId)}`,

				{ headers: { "x-org-id": resolvedOrgId } },

			);

			if (!res.ok) {

				const err = await res.json().catch(() => ({}));

				throw new Error(err.error || "Failed to load payment methods");

			}

			const data = await res.json();

			setPaymentMethods(data.paymentMethods || []);

			setHasUpcomingInvoice(Boolean(data.hasUpcomingInvoice));

			setPaymentMethodsOrgName(data.orgName || "");

		} catch (error: unknown) {

			const message =

				error instanceof Error ? error.message : "Failed to load payment methods";

			setPaymentMethodError(message);

		} finally {

			setLoadingPaymentMethods(false);

		}

	}, [canBilling, resolvedOrgId]);



	const handlePaymentMethodUpdated = useCallback((method: PaymentMethodRow) => {

		setPaymentMethods((current) =>

			current.map((entry) => (entry.id === method.id ? method : entry)),

		);

	}, []);



	const handlePaymentMethodsReplace = useCallback((methods: PaymentMethodRow[]) => {

		setPaymentMethods(methods);

	}, []);



	const handlePaymentMethodRemoved = useCallback((paymentMethodId: string) => {

		setPaymentMethods((current) =>

			current.filter((entry) => entry.id !== paymentMethodId),

		);

	}, []);



	useEffect(() => {

		if (orgLoading || permissionsLoading) {

			return;

		}

		if (canBilling && resolvedOrgId) {

			loadSubscription();

			loadInvoices();

			loadPaymentMethods();

		} else {

			setLoadingSub(false);

		}

	}, [

		orgLoading,

		permissionsLoading,

		canBilling,

		resolvedOrgId,

		loadSubscription,

		loadInvoices,

		loadPaymentMethods,

	]);



	useEffect(() => {

		const checkout = searchParams?.get("checkout");

		const setup = searchParams?.get("setup");

		if (checkout === "success") {

			toast({

				title: "Checkout complete",

				description: "Your subscription will update shortly.",

			});

			loadSubscription();

			loadInvoices();

			loadPaymentMethods();

		}

		if (setup === "success") {

			toast({

				title: "Payment method saved",

				description: "Your card list will refresh in a moment.",

			});

			loadPaymentMethods();

		}

	}, [

		searchParams,

		toast,

		loadSubscription,

		loadInvoices,

		loadPaymentMethods,

	]);



	useEffect(() => {

		if (orgLoading || permissionsLoading) {

			return;

		}

		if (!canAccessPage) {

			router.replace("/settings");

		}

	}, [orgLoading, permissionsLoading, canAccessPage, router]);



	useEffect(() => {

		if (!orgLoading && !permissionsLoading) {

			if (tab === "billing" && !canBilling && canIntegrations) {

				setTab("integrations");

			} else if (tab === "integrations" && !canIntegrations && canBilling) {

				setTab("billing");

			}

		}

	}, [orgLoading, permissionsLoading, tab, canBilling, canIntegrations]);



	const handleManageBilling = async () => {

		if (!resolvedOrgId) return;

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

		} catch (error: unknown) {

			const message =

				error instanceof Error ? error.message : "Could not open billing portal";

			toast({

				title: "Portal error",

				description: message,

				variant: "destructive",

			});

			setManaging(false);

		}

	};



	const startPaymentMethodSetup = async (replacePaymentMethodId?: string) => {

		if (!resolvedOrgId) return;

		try {

			setPaymentMethodActionError(null);

			if (replacePaymentMethodId) {

				setReplacingPaymentMethodId(replacePaymentMethodId);

			} else {

				setAddingPaymentMethod(true);

			}



			const res = await fetch("/api/billing/payment-methods/setup", {

				method: "POST",

				headers: {

					"Content-Type": "application/json",

					"x-org-id": resolvedOrgId,

				},

				body: JSON.stringify({

					orgId: resolvedOrgId,

					replacePaymentMethodId,

				}),

			});

			const data = await res.json();

			if (!res.ok) {

				throw new Error(data.error || "Could not start card setup");

			}

			window.location.href = data.url;

		} catch (error: unknown) {

			const message =

				error instanceof Error ? error.message : "Could not start card setup";

			setPaymentMethodActionError(message);

			setAddingPaymentMethod(false);

			setReplacingPaymentMethodId(null);

		}

	};



	if (orgLoading || permissionsLoading) {

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

			<div className="mb-6 flex items-center gap-4 justify-start self-start w-full">

				<div>

					<h1 className="h1 capitalize sidebar-gradient-text">

						Billing & Integrations

					</h1>

					<p className="mt-1 text-sm text-slate-600">

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

				<TabsList className="border border-slate-200 bg-white/60">

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

						<PermissionGate
							permission={PERMISSIONS.SETTINGS.BILLING}
							showOnLoading
						>

							<div className="flex flex-col gap-6">

								<div className="space-y-4">

									<BillingSectionLabel>Billing overview</BillingSectionLabel>



									<BillingOverviewCard

										planName={

											subscription?.plan?.name ||
											subscription?.subscriptionTier ||
											"Starter"

										}

										tier={subscription?.subscriptionTier || "starter"}

										status={subscription?.billingStatus || "none"}

										interval={subscription?.billingInterval ?? null}

										monthly={subscription?.plan?.monthly ?? null}

										yearly={subscription?.plan?.yearly ?? null}

										currentPeriodEnd={subscription?.currentPeriodEnd ?? null}

										stripeConfigured={Boolean(subscription?.stripeConfigured)}

										accessWarning={
											subscriptionError || subscription?.access?.warning
										}

										onManageBilling={handleManageBilling}

										onChangePlan={() => setPlanOpen(true)}

										managing={managing}

										actionsDisabled={loadingPaymentMethods}

									/>

								</div>



								<PaymentMethodsSection

									orgId={resolvedOrgId}

									orgName={paymentMethodsOrgName || subscription?.name || ""}

									hasUpcomingInvoice={hasUpcomingInvoice}

									paymentMethods={paymentMethods}

									loading={loadingPaymentMethods}

									error={paymentMethodError}

									onRefresh={loadPaymentMethods}

									onPaymentMethodUpdated={handlePaymentMethodUpdated}

									onPaymentMethodsReplace={handlePaymentMethodsReplace}

									onPaymentMethodRemoved={handlePaymentMethodRemoved}

									onAddPaymentMethod={() => startPaymentMethodSetup()}

									onReplacePaymentMethod={(paymentMethodId) =>

										startPaymentMethodSetup(paymentMethodId)

									}

									adding={addingPaymentMethod}

									replacingId={replacingPaymentMethodId}

									actionError={paymentMethodActionError}

								/>



								<UsageMetersCard

									storageUsed={subscription?.usage.storage.used ?? 0}

									storageLimit={subscription?.usage.storage.limit ?? 0}

									usersUsed={subscription?.usage.users.used ?? 0}

									usersLimit={subscription?.usage.users.limit ?? 0}

									departmentsUsed={subscription?.usage.departments.used ?? 0}

									departmentsLimit={subscription?.usage.departments.limit ?? 0}

									contractsUsed={subscription?.usage.contracts.used ?? 0}

									contractsLimit={subscription?.usage.contracts.limit ?? 0}

								/>



								<InvoiceHistoryTable
									invoices={invoices}
									orgId={resolvedOrgId}
									loading={loadingInvoices}
									error={invoiceError}
								/>

							</div>

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

											setPlanOpen(true);

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



			<AdjustPlanDialog open={planOpen} onOpenChange={setPlanOpen} />

		</div>

	);

}

