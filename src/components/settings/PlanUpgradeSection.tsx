"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PricingPlan } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface PlanUpgradeSectionProps {
	plans: PricingPlan[];
	currentTier: string;
	stripeConfigured: boolean;
	billingStatus?: string;
	pilotEligible?: boolean;
	pilotTrialDays?: number;
	onCheckout: (
		tier: "starter" | "growth",
		interval: "monthly" | "yearly",
	) => void;
	loadingTier?: string | null;
	salesEmail?: string;
}

function stripMarkdown(value: string): string {
	return value
		.replace(/\*\*(.*?)\*\*/g, "$1")
		.replace(/\*(.*?)\*/g, "$1")
		.replace(/`([^`]+)`/g, "$1");
}

export default function PlanUpgradeSection({
	plans,
	currentTier,
	stripeConfigured,
	billingStatus = "none",
	pilotEligible = false,
	pilotTrialDays = 90,
	onCheckout,
	loadingTier,
	salesEmail = "sales@caalm.app",
}: PlanUpgradeSectionProps) {
	const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
	const showPilotCta =
		pilotEligible &&
		(billingStatus === "none" || billingStatus === "canceled") &&
		currentTier !== "growth" &&
		currentTier !== "enterprise";

	return (
		<div className="space-y-4">
			{showPilotCta && (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<p className="text-sm font-medium sidebar-gradient-text">
								90-day Growth pilot
							</p>
							<p className="text-xs text-slate-600 mt-1">
								Try Growth for {pilotTrialDays} days. No charge until the trial
								ends unless you cancel. AI extractions capped at 100 / month
								during the pilot.
							</p>
						</div>
						<Button
							className="primary-btn px-3 sm:px-4 cursor-pointer shrink-0"
							disabled={!stripeConfigured || loadingTier === "growth"}
							onClick={() => onCheckout("growth", interval)}
						>
							{loadingTier === "growth"
								? "Redirecting…"
								: "Start 90-day Growth pilot"}
						</Button>
					</CardContent>
				</Card>
			)}

			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<p className="text-sm font-medium sidebar-gradient-text">Change plan</p>
				<div
					role="tablist"
					aria-label="Billing period"
					className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-1.5 py-1 shadow-sm"
				>
					{(["monthly", "yearly"] as const).map((period) => (
						<button
							key={period}
							type="button"
							role="tab"
							aria-selected={interval === period}
							className={cn(
								"cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-all duration-200",
								interval === period
									? "bg-gradient-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white shadow-sm"
									: "text-slate-600 hover:bg-blue-50",
							)}
							onClick={() => setInterval(period)}
						>
							{period}
							{period === "yearly" ? " (−20%)" : ""}
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{plans.map((plan) => {
					const isCurrent = plan.key === currentTier;
					const isEnterprise = plan.key === "enterprise";
					const price = interval === "monthly" ? plan.monthly : plan.yearly;
					const busy = loadingTier === plan.key;

					return (
						<Card key={plan.key} className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6 flex flex-col h-full">
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-medium sidebar-gradient-text">
										{plan.name}
									</p>
									{isCurrent && (
										<Badge
											variant="outline"
											className="bg-blue/10 text-blue border-blue/20"
										>
											Current
										</Badge>
									)}
								</div>
								{isEnterprise || price === 0 ? (
									<p className="text-3xl font-bold text-slate-700 pt-2">
										Custom
									</p>
								) : (
									<p className="text-3xl font-bold text-slate-700 pt-2">
										${price.toLocaleString()}
										<span className="text-sm font-medium text-slate-600 ml-1">
											/{interval === "monthly" ? "mo" : "yr"}
										</span>
									</p>
								)}
								<ul className="mt-4 space-y-2 flex-1">
									{plan.features.slice(0, 5).map((feature) => (
										<li
											key={feature}
											className="flex items-start gap-2 text-xs text-slate-600"
										>
											<Check className="h-3.5 w-3.5 text-[#0f5384] mt-0.5 shrink-0" />
											<span>{stripMarkdown(feature)}</span>
										</li>
									))}
								</ul>
								{isEnterprise ? (
									<Button
										asChild
										className="primary-btn px-3 sm:px-4 mt-6 w-full cursor-pointer"
									>
										<a href={`mailto:${salesEmail}?subject=CAALM%20Enterprise`}>
											Contact sales
										</a>
									</Button>
								) : (
									<Button
										className="primary-btn px-3 sm:px-4 mt-6 w-full cursor-pointer"
										disabled={!stripeConfigured || isCurrent || busy}
										onClick={() =>
											onCheckout(plan.key as "starter" | "growth", interval)
										}
									>
										{isCurrent
											? "Current plan"
											: busy
												? "Redirecting…"
												: `Choose ${plan.name}`}
									</Button>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
