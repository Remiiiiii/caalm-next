"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PricingPlan } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface PlanUpgradeSectionProps {
	plans: PricingPlan[];
	currentTier: string;
	stripeConfigured: boolean;
	billingInterval: "monthly" | "yearly";
	onCheckout: (
		tier: "starter" | "growth" | "enterprise",
		interval: "monthly" | "yearly",
	) => void;
	onSendQuote?: (
		tier: "starter" | "growth" | "enterprise",
		interval: "monthly" | "yearly",
	) => void;
	loadingTier?: string | null;
	quotingTier?: string | null;
}

function stripMarkdown(value: string): string {
	return value
		.replace(/\*\*(.*?)\*\*/g, "$1")
		.replace(/\*(.*?)\*/g, "$1")
		.replace(/`([^`]+)`/g, "$1");
}

const RECOMMENDED_TIER = "growth";

export default function PlanUpgradeSection({
	plans,
	currentTier,
	stripeConfigured,
	billingInterval,
	onCheckout,
	onSendQuote,
	loadingTier,
	quotingTier,
}: PlanUpgradeSectionProps) {
	return (
		<div className="grid grid-cols-1 items-stretch gap-3 pt-3 md:grid-cols-3 md:gap-4">
			{plans.map((plan) => {
				const isCurrent = plan.key === currentTier;
				const isRecommended = plan.key === RECOMMENDED_TIER;
				const price =
					billingInterval === "monthly" ? plan.monthly : plan.yearly;
				const busy = loadingTier === plan.key;

				return (
					<div key={plan.key} className="relative flex h-full flex-col">
						{isRecommended ? (
							<span className="absolute -top-2.5 left-4 z-10 rounded-sm bg-[#0f5384] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
								Recommended
							</span>
						) : null}
						<Card
							className={cn(
								"glass-card flex h-full flex-col",
								isRecommended && "ring-2 ring-[#0f5384]/40",
							)}
						>
							<div className="glass-card-cap" />
							<CardContent className="flex h-full flex-col p-4 sm:p-5">
							<p className="text-sm font-semibold text-[#0f5384]">
								{plan.name}
							</p>
							<p className="pt-2 text-3xl font-bold text-slate-700">
								${price.toLocaleString()}
								<span className="ml-1 text-sm font-normal text-slate-600">
									/{billingInterval === "monthly" ? "mo" : "yr"}
								</span>
							</p>
							<ul className="mt-4 flex-1 space-y-1.5">
								{plan.features.slice(0, 6).map((feature) => (
									<li
										key={feature}
										className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
									>
										<Check
											className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green"
											strokeWidth={2.5}
											aria-hidden
										/>
										<span>{stripMarkdown(feature)}</span>
									</li>
								))}
							</ul>
							<Button
								variant={isCurrent ? "outline" : isRecommended ? "default" : "outline"}
								className={cn(
									"primary-btn mt-5 w-full cursor-pointer px-3 sm:px-4",
									isCurrent &&
										"cursor-default border-slate-200 bg-light-400/50 text-slate-500 hover:bg-light-400/50",
									!isCurrent &&
										!isRecommended &&
										"border-[#0f5384]/30 hover:bg-blue/5",
								)}
								disabled={!stripeConfigured || isCurrent || busy}
								onClick={() => onCheckout(plan.key, billingInterval)}
							>
								{isCurrent
									? "Current plan"
									: busy
										? "Redirecting…"
										: `Choose ${plan.name}`}
							</Button>
							{onSendQuote && plan.key === "enterprise" && !isCurrent ? (
								<Button
									variant="outline"
									className="primary-btn mt-2 w-full cursor-pointer px-3 sm:px-4"
									disabled={!stripeConfigured || quotingTier === plan.key}
									onClick={() => onSendQuote(plan.key, billingInterval)}
								>
									{quotingTier === plan.key
										? "Creating quote…"
										: "Send quote"}
								</Button>
							) : null}
						</CardContent>
					</Card>
					</div>
				);
			})}
		</div>
	);
}
