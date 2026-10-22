"use client";

import { Columns3Cog } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import PlanUpgradeSection from "@/components/settings/PlanUpgradeSection";
import { AppDialog } from "@/components/ui/app-dialog";
import { useToast } from "@/hooks/use-toast";
import { useBillingSubscription } from "@/hooks/useBillingSubscription";
import { useOrgPlanSummary } from "@/hooks/useOrgPlanSummary";
import { cn } from "@/lib/utils";

type AdjustPlanDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export default function AdjustPlanDialog({
	open,
	onOpenChange,
}: AdjustPlanDialogProps) {
	const { toast } = useToast();
	const { tier } = useOrgPlanSummary();
	const { canBilling, resolvedOrgId, plans, subscription } =
		useBillingSubscription();

	const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
	const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
		"monthly",
	);

	useEffect(() => {
		if (subscription?.billingInterval === "yearly") {
			setBillingInterval("yearly");
		}
	}, [subscription?.billingInterval]);

	const currentTier =
		subscription?.subscriptionTier ||
		(tier === "growth" || tier === "enterprise" || tier === "starter"
			? tier
			: "starter");

	const stripeReady =
		canBilling &&
		subscription?.stripeConfigured !== false &&
		subscription?.access?.canCheckout !== false;

	const billingStatus = subscription?.billingStatus ?? "none";
	const pilotEligible = Boolean(subscription?.pilot?.eligible);
	const pilotTrialDays = subscription?.pilot?.trialDays ?? 90;

	const handleCheckout = async (
		nextTier: "starter" | "growth" | "enterprise",
		interval: "monthly" | "yearly",
	) => {
		try {
			setCheckoutTier(nextTier);
			const res = await fetch("/api/billing/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-org-id": resolvedOrgId,
				},
				body: JSON.stringify({
					orgId: resolvedOrgId,
					tier: nextTier,
					interval,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Checkout unavailable");
			window.location.href = data.url;
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Could not start checkout";
			toast({
				title: "Checkout error",
				description: message,
				variant: "destructive",
			});
			setCheckoutTier(null);
		}
	};

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh] max-w-7xl"
			pending={checkoutTier !== null}
			icon={<Columns3Cog className="h-5 w-5" />}
			title="Adjust your plan"
			description="Compare Starter, Growth, and Enterprise. Annual billing saves 20%."
			footer={
				<p className="text-center text-xs text-slate-500">
					Need more for your business?{" "}
					<Link
						href="/contact"
						className="cursor-pointer font-medium text-[#0f5384] underline underline-offset-2"
					>
						Learn more about our Enterprise plans
					</Link>
					.
				</p>
			}
		>
			<div className="pb-1">
					<div className="space-y-6">
						<div className="flex items-center justify-center">
							<div
								role="tablist"
								aria-label="Billing period"
								className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-lg backdrop-blur"
							>
								<button
									type="button"
									role="tab"
									aria-selected={billingInterval === "monthly"}
									onClick={() => setBillingInterval("monthly")}
									className={cn(
										"cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
										billingInterval === "monthly"
											? "bg-linear-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white"
											: "text-slate-600",
									)}
								>
									Monthly
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={billingInterval === "yearly"}
									onClick={() => setBillingInterval("yearly")}
									className={cn(
										"cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
										billingInterval === "yearly"
											? "bg-linear-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white"
											: "text-slate-600",
									)}
								>
									Annual
								</button>
								{billingInterval === "yearly" ? (
									<span className="ml-2 mr-2 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
										Save 20%
									</span>
								) : (
									<span
										className="strike-th ml-2 mr-2 inline-block text-xs font-medium text-slate-400"
										aria-hidden
									>
										Save 20%
									</span>
								)}
							</div>
						</div>

						<PlanUpgradeSection
							plans={plans}
							currentTier={currentTier}
							stripeConfigured={Boolean(stripeReady)}
							billingInterval={billingInterval}
							billingStatus={billingStatus}
							pilotEligible={pilotEligible}
							pilotTrialDays={pilotTrialDays}
							onCheckout={handleCheckout}
							loadingTier={checkoutTier}
						/>

						{!canBilling ? (
							<p className="text-center text-xs text-slate-500">
								Changing plans requires billing permission.{" "}
								<Link
									href="/contact"
									className="cursor-pointer font-medium text-[#0f5384] underline-offset-2 hover:underline"
								>
									Contact us
								</Link>{" "}
								or ask an organization admin.
							</p>
						) : null}
					</div>
			</div>
		</AppDialog>
	);
}
