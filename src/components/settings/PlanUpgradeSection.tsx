"use client";

import { Check } from "lucide-react";
import type { PricingPlan } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface PlanUpgradeSectionProps {
	plans: PricingPlan[];
	currentTier: string;
	stripeConfigured: boolean;
	billingInterval: "monthly" | "yearly";
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
		.replace(/__([^_]+)__/g, "$1")
		.replace(/_([^_]+)_/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\*/g, "");
}

function featureListHeading(index: number): string {
	if (index === 0) return "Includes";
	if (index === 1) return "Everything in Starter, plus";
	return "Everything in Growth, plus";
}

export default function PlanUpgradeSection({
	plans,
	currentTier,
	stripeConfigured,
	billingInterval,
	billingStatus = "none",
	pilotEligible = false,
	pilotTrialDays = 90,
	onCheckout,
	loadingTier,
	salesEmail = "sales@caalm.app",
}: PlanUpgradeSectionProps) {
	const showPilotCta =
		pilotEligible &&
		(billingStatus === "none" || billingStatus === "canceled") &&
		currentTier !== "growth" &&
		currentTier !== "enterprise";

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch md:gap-6">
			{plans.map((plan, idx) => {
				const isCurrent = plan.key === currentTier;
				const isEnterprise = plan.key === "enterprise";
				const isGrowth = plan.key === "growth";
				const price =
					billingInterval === "monthly" ? plan.monthly : plan.yearly;
				const busy = loadingTier === plan.key;
				const periodLabel =
					billingInterval === "monthly"
						? "/ workspace / month"
						: "/ workspace / year";

				let ctaLabel: string;
				if (isEnterprise) {
					ctaLabel = "Contact sales";
				} else if (isCurrent) {
					ctaLabel = "Current plan";
				} else if (busy) {
					ctaLabel = "Redirecting…";
				} else if (isGrowth && showPilotCta) {
					ctaLabel = `Start ${pilotTrialDays}-day Growth pilot`;
				} else if (isGrowth) {
					ctaLabel = "Choose Growth";
				} else {
					ctaLabel = "Get started";
				}

				const ctaClassName = cn(
					"inline-flex w-full items-center justify-center rounded-full py-3 text-center font-semibold shadow-sm transition-all duration-200",
					isCurrent
						? "cursor-default bg-[linear-gradient(135deg,#12477d_0%,#03afbf_100%)] text-white disabled:opacity-100"
						: cn(
								"cursor-pointer text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
								isGrowth
									? "bg-linear-to-r from-[#00C1CB] via-[#078FAB] to-[#162768]"
									: "bg-linear-to-r from-slate-500 to-slate-700",
							),
				);

				return (
					<div
						key={plan.key}
						className={cn(
							"h-full rounded-xl",
							isGrowth &&
								"relative z-10 ring-2 ring-[#05A1B7]/70 shadow-[0_12px_40px_rgba(5,161,183,0.22)]",
						)}
					>
						<div className="glass-card flex h-full flex-col rounded-xl">
							<div className="glass-card-cap" />
							<div className="relative z-[1] flex h-full flex-col p-6">
								<h3 className="mb-2 mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-700">
									{plan.name}
									{isGrowth ? (
										<span className="inline-flex items-center rounded-full border border-[#05A1B7]/30 bg-[#E8F8FA] px-2.5 py-0.5 text-xs font-medium text-[#057A8A]">
											Most Popular
										</span>
									) : null}
									{isCurrent ? (
										<span className="inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue">
											Current
										</span>
									) : null}
								</h3>

								<div className="mb-4 flex items-baseline gap-1">
									{isEnterprise || price === 0 ? (
										<span className="text-4xl font-bold text-slate-700">
											Custom
										</span>
									) : (
										<>
											<span className="text-4xl font-bold text-slate-700">
												${price.toLocaleString()}
											</span>
											<span className="text-sm text-slate-600">
												{periodLabel}
											</span>
										</>
									)}
								</div>

								{isEnterprise ? (
									<a
										href={`mailto:${salesEmail}?subject=CAALM%20Enterprise`}
										className={ctaClassName}
									>
										{ctaLabel}
									</a>
								) : (
									<button
										type="button"
										className={ctaClassName}
										disabled={!stripeConfigured || isCurrent || busy}
										onClick={() =>
											onCheckout(
												plan.key as "starter" | "growth",
												billingInterval,
											)
										}
									>
										{ctaLabel}
									</button>
								)}

								<hr className="my-6 border-slate-200" />

								<h4 className="mb-3 text-sm font-semibold text-slate-800">
									{featureListHeading(idx)}
								</h4>
								<ul className="space-y-2 text-sm text-slate-600">
									{plan.features.slice(0, 10).map((feature) => (
										<li key={feature} className="flex items-start gap-2">
											<Check
												className="mt-0.5 h-5 w-5 shrink-0"
												aria-hidden
												style={{ color: "#05A1B7" }}
											/>
											<span>{stripMarkdown(feature)}</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
