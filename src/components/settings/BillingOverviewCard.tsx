"use client";

import { AlertTriangle, Columns3Cog, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BillingOverviewCardProps {
	planName: string;
	tier: string;
	status: string;
	interval: string | null;
	monthly: number | null;
	yearly: number | null;
	currentPeriodEnd: string | null;
	stripeConfigured: boolean;
	accessWarning?: string | null;
	onManageBilling: () => void;
	onChangePlan: () => void;
	managing?: boolean;
}

function statusPillClass(status: string): string {
	switch (status) {
		case "active":
			return "bg-green/10 text-green border-green/20";
		case "trialing":
		case "pilot":
			return "bg-blue/10 text-[#0f5384] border-blue/20";
		case "past_due":
			return "bg-orange/10 text-orange border-orange/20";
		case "canceled":
			return "bg-red/10 text-red border-red/20";
		default:
			return "bg-orange/10 text-orange border-orange/20";
	}
}

function statusLabel(status: string): string {
	switch (status) {
		case "none":
			return "No active subscription";
		case "past_due":
			return "Past due";
		case "trialing":
			return "Trial";
		case "pilot":
			return "Pilot";
		default:
			return status.replace("_", " ");
	}
}

export default function BillingOverviewCard({
	planName,
	tier,
	status,
	interval,
	monthly,
	yearly,
	currentPeriodEnd,
	stripeConfigured,
	accessWarning,
	onManageBilling,
	onChangePlan,
	managing,
}: BillingOverviewCardProps) {
	const price =
		interval === "yearly" ? yearly : monthly !== null ? monthly : monthly;
	const priceDisplay =
		price !== null ? `$${price.toLocaleString()}` : null;
	const billingCadence =
		interval === "yearly"
			? "year · billed yearly"
			: interval === "monthly"
				? "month · billed monthly"
				: "month";

	const renewalLabel = currentPeriodEnd
		? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: null;

	const showWarning =
		Boolean(accessWarning) ||
		status === "none" ||
		status === "canceled" ||
		status === "past_due";

	const warningText =
		accessWarning ||
		(status === "none"
			? "No active renewal is scheduled — this workspace will lose plan features at the end of the current period unless a subscription is started."
			: status === "canceled"
				? `Your subscription ends ${renewalLabel ?? "soon"}. Restart billing to keep plan features.`
				: status === "past_due"
					? "Payment is past due. Update your payment method in the billing portal to avoid losing access."
					: null);

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="space-y-3 p-4 sm:p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2.5">
							<h2 className="text-xl font-semibold capitalize text-slate-700 sm:text-2xl">
								{planName || tier}
							</h2>
							<span
								className={cn(
									"rounded-sm border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
									statusPillClass(status),
								)}
							>
								{statusLabel(status)}
							</span>
						</div>
						<p className="mt-1 text-sm text-slate-600">
							{priceDisplay ? (
								<>
									<span className="font-semibold text-slate-700">
										{priceDisplay}
									</span>{" "}
									/{billingCadence}
								</>
							) : (
								"Pricing unavailable"
							)}
						</p>
						{(status === "active" || status === "trialing") && renewalLabel ? (
							<p className="mt-0.5 text-xs text-slate-500">
								Renews on {renewalLabel}
							</p>
						) : null}
					</div>

					<div className="flex shrink-0 flex-wrap gap-2">
						<Button
							variant="outline"
							className="primary-btn cursor-pointer px-3 sm:px-4"
							onClick={onManageBilling}
							disabled={!stripeConfigured || managing}
						>
							<CreditCard className="h-4 w-4" />
							Manage billing
						</Button>
						<Button
							className="primary-btn cursor-pointer px-3 sm:px-4"
							onClick={onChangePlan}
							disabled={!stripeConfigured}
						>
							<Columns3Cog className="h-4 w-4" />
							Change plan
						</Button>
					</div>
				</div>

				{showWarning && warningText ? (
					<div className="flex gap-2 rounded-md border border-orange/20 bg-orange/10 px-3 py-2.5">
						<AlertTriangle
							className="mt-0.5 h-4 w-4 shrink-0 text-orange"
							aria-hidden
						/>
						<p className="text-xs leading-relaxed text-slate-700">
							{warningText}
						</p>
					</div>
				) : null}

				{!stripeConfigured ? (
					<p className="text-xs text-slate-500">
						Stripe is not configured. Add billing keys to enable checkout and
						the customer portal.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
