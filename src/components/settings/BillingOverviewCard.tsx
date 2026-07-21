"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
	onManageBilling: () => void;
	onChangePlan: () => void;
	managing?: boolean;
}

function statusBadgeClass(status: string): string {
	switch (status) {
		case "active":
			return "bg-green/10 text-green border-green/20";
		case "trialing":
			return "bg-blue/10 text-blue border-blue/20";
		case "past_due":
			return "bg-orange/10 text-orange border-orange/20";
		case "canceled":
			return "bg-red/10 text-red border-red/20";
		default:
			return "bg-slate-100 text-slate-600 border-slate-200";
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
	onManageBilling,
	onChangePlan,
	managing,
}: BillingOverviewCardProps) {
	const price =
		interval === "yearly" ? yearly : monthly !== null ? monthly : null;
	const priceLabel =
		price !== null
			? `$${price.toLocaleString()}/${interval === "yearly" ? "year" : "month"}`
			: "—";

	const renewalLabel = currentPeriodEnd
		? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "—";

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">
							Current plan
						</p>
						<div className="flex items-center gap-3 pt-2 flex-wrap">
							<span className="text-3xl font-bold text-slate-700 capitalize">
								{planName || tier}
							</span>
							<Badge
								variant="outline"
								className={cn("capitalize", statusBadgeClass(status))}
							>
								{status === "none"
									? "No subscription"
									: status.replace("_", " ")}
							</Badge>
						</div>
						<p className="text-sm text-slate-600 mt-2">
							{priceLabel}
							{interval ? ` · billed ${interval}` : ""}
						</p>
						<p className="text-xs text-slate-600 mt-1">
							{status === "active" || status === "trialing"
								? `Renews on ${renewalLabel}`
								: status === "canceled"
									? `Ends ${renewalLabel}`
									: "No active renewal"}
						</p>
					</div>
					<div className="flex flex-col sm:flex-row gap-3">
						<Button
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={onManageBilling}
							disabled={!stripeConfigured || managing}
						>
							<CreditCard className="h-4 w-4" />
							Manage billing
							<ExternalLink className="h-3.5 w-3.5 opacity-70" />
						</Button>
						<Button
							variant="outline"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={onChangePlan}
							disabled={!stripeConfigured}
						>
							Change plan
						</Button>
					</div>
				</div>
				{!stripeConfigured && (
					<p className="text-xs text-slate-500">
						Stripe is not configured. Add billing keys to enable checkout and
						the customer portal.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
