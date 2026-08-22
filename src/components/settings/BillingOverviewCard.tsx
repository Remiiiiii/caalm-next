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
	actionsDisabled?: boolean;
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

function formatMoney(amount: number): string {
	return `$${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatPaymentDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

function BillingBreakdownRow({
	label,
	amount,
	emphasis = false,
}: {
	label: string;
	amount: string;
	emphasis?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-4 px-4 py-3 text-sm",
				emphasis ? "font-semibold text-slate-700" : "text-slate-600",
			)}
		>
			<span>{label}</span>
			<span className={cn("tabular-nums", emphasis && "text-slate-800")}>
				{amount}
			</span>
		</div>
	);
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
	actionsDisabled,
}: BillingOverviewCardProps) {
	const billingActionsDisabled =
		actionsDisabled || !stripeConfigured || managing;
	const activeAmount =
		interval === "yearly"
			? yearly
			: monthly !== null
				? monthly
				: yearly;
	const monthlyDisplay =
		monthly !== null ? formatMoney(monthly) : null;
	const yearlyDisplay = yearly !== null ? formatMoney(yearly) : null;
	const basePlanDisplay =
		activeAmount !== null ? formatMoney(activeAmount) : "—";

	const nextPaymentDate = currentPeriodEnd
		? formatPaymentDate(currentPeriodEnd)
		: null;

	const pricePair =
		monthlyDisplay && yearlyDisplay
			? `${monthlyDisplay}/${yearlyDisplay}`
			: basePlanDisplay !== "—"
				? basePlanDisplay
				: null;

	const hasScheduledPayment =
		Boolean(nextPaymentDate) &&
		(status === "active" || status === "trialing" || status === "past_due");

	const nextPaymentLine = (() => {
		if (hasScheduledPayment && nextPaymentDate) {
			const amount =
				interval === "yearly"
					? yearlyDisplay ?? basePlanDisplay
					: monthlyDisplay ?? basePlanDisplay;
			if (amount) {
				return `Next payment of ${amount} will occur on ${nextPaymentDate}.`;
			}
		}
		if (pricePair) {
			return `Next payment of ${pricePair} will occur when you start a subscription.`;
		}
		if (status === "pilot" && nextPaymentDate) {
			return `Pilot access ends on ${nextPaymentDate}. Choose a plan to continue after that date.`;
		}
		return "No upcoming payment scheduled.";
	})();

	const showWarning =
		Boolean(accessWarning) ||
		status === "none" ||
		status === "canceled" ||
		status === "past_due";

	const renewalLabel = currentPeriodEnd
		? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: null;

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
			<CardContent className="flex flex-col gap-4 p-4 sm:p-6">
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
					<p className="mt-2 text-sm text-slate-600">{nextPaymentLine}</p>
				</div>

				<div className="overflow-hidden rounded-lg border border-slate-200 bg-white/65">
					<BillingBreakdownRow label="Base plan" amount={basePlanDisplay} />
					<div className="border-t border-slate-200" aria-hidden />
					<BillingBreakdownRow
						label="Total"
						amount={basePlanDisplay}
						emphasis
					/>
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

				<div className="flex flex-wrap justify-end gap-2 pt-1">
					<Button
						variant="outline"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={onManageBilling}
						disabled={billingActionsDisabled}
					>
						<CreditCard className="h-4 w-4" />
						Manage billing
					</Button>
					<Button
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={onChangePlan}
						disabled={billingActionsDisabled}
					>
						<Columns3Cog className="h-4 w-4" />
						Change plan
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
