"use client";

import { Columns3Cog } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import PlanUpgradeSection from "@/components/settings/PlanUpgradeSection";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useBillingSubscription } from "@/hooks/useBillingSubscription";
import { useOrgPlanSummary } from "@/hooks/useOrgPlanSummary";

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
	const {
		canBilling,
		resolvedOrgId,
		plans,
		subscription,
	} = useBillingSubscription();

	const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
	const [billingInterval, setBillingInterval] = useState<
		"monthly" | "yearly"
	>("monthly");

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
				body: JSON.stringify({ orgId: resolvedOrgId, tier: nextTier, interval }),
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6 pr-12">
						<Columns3Cog className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Adjust your plan
						</DialogTitle>
					</div>
					<DialogDescription className="mt-1 ml-14 text-sm text-slate-600">
						Compare Starter, Growth, and Enterprise. Annual billing saves 20%.
					</DialogDescription>
				</div>

				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					<div className="space-y-5">
						<div className="flex flex-col items-center gap-2">
							<Tabs
								value={billingInterval}
								onValueChange={(value) =>
									setBillingInterval(value as "monthly" | "yearly")
								}
							>
								<TabsList className="h-auto rounded-full border border-slate-200 bg-slate-100 p-1">
									<TabsTrigger
										value="monthly"
										className="cursor-pointer rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
									>
										Monthly
									</TabsTrigger>
									<TabsTrigger
										value="yearly"
										className="cursor-pointer rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
									>
										Annual
									</TabsTrigger>
								</TabsList>
							</Tabs>
							<p className="text-sm font-medium text-green">
								Save 20% when billed annually.
							</p>
						</div>

						<PlanUpgradeSection
							plans={plans}
							currentTier={currentTier}
							stripeConfigured={Boolean(stripeReady)}
							billingInterval={billingInterval}
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

				<div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
					<p className="text-xs text-slate-500">
						Need more for your business?{" "}
						<Link
							href="/contact"
							className="cursor-pointer font-medium text-[#0f5384] underline underline-offset-2"
						>
							Learn more about our Enterprise plans
						</Link>
						.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
