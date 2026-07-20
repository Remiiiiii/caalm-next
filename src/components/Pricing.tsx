"use client";

import { BadgeDollarSign, Check, HandHeart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PricingPlan } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import LandingFrostedCard from "./landing/LandingFrostedCard";
import LandingSection from "./landing/LandingSection";
import { TRUSTED_BRAND_LOGOS } from "./landing/landingContent";

type Props = {
	plans: PricingPlan[];
};

export default function Pricing({ plans }: Props) {
	const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

	useEffect(() => {
		setPeriod("monthly");
	}, []);

	const formattedPlans = useMemo(() => {
		return plans.map((p) => ({
			...p,
			displayPrice: period === "monthly" ? p.monthly : p.yearly,
		}));
	}, [plans, period]);

	const stripMarkdown = (value: string): string => {
		return value
			.replace(/\*\*(.*?)\*\*/g, "$1")
			.replace(/\*(.*?)\*/g, "$1")
			.replace(/__([^_]+)__/g, "$1")
			.replace(/_([^_]+)_/g, "$1")
			.replace(/`([^`]+)`/g, "$1")
			.replace(/\*/g, "");
	};

	return (
		<LandingSection id="pricing" ariaLabelledBy="pricing-heading">
			<div className="mb-6 flex justify-center relative z-10">
				<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
					<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
						<BadgeDollarSign className="h-3.5 w-3.5 text-slate-700" />
					</span>
					<span className="text-slate-700 text-sm">Transparent pricing</span>
				</div>
			</div>

			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-6 sm:mb-8">
					<h2
						id="pricing-heading"
						className="text-2xl sm:text-3xl md:text-[3em] py-2 sidebar-gradient-text landing-section-title"
					>
						Explore our plans
					</h2>
					<p className="mt-2 text-slate-700 text-sm sm:text-base">
						Flexible monthly plans and cost-effective annual subscriptions.
					</p>
				</div>
				<div className="flex items-center justify-center mb-8">
					<div
						role="tablist"
						aria-label="Billing period"
						className="flex items-center gap-2 rounded-full bg-white/80 shadow-lg border border-slate-200 px-2 py-1 backdrop-blur"
					>
						<button
							type="button"
							role="tab"
							aria-selected={period === "monthly"}
							onClick={() => setPeriod("monthly")}
							className={cn(
								"px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer",
								period === "monthly"
									? "bg-gradient-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white"
									: "text-slate-600",
							)}
						>
							Monthly
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={period === "yearly"}
							onClick={() => setPeriod("yearly")}
							className={cn(
								"px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer",
								period === "yearly"
									? "bg-gradient-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white"
									: "text-slate-600",
							)}
						>
							Annual
						</button>
						{period === "yearly" ? (
							<span className="ml-2 mr-2 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
								Save 20%
							</span>
						) : (
							<span
								className="ml-2 mr-2 strike-th inline-block text-xs font-medium text-slate-400"
								aria-hidden
							>
								Save 20%
							</span>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
					{formattedPlans.map((plan, idx) => (
						<LandingFrostedCard
							key={plan.key}
							className={cn(
								"flex flex-col transition-all duration-200",
								idx === 1 ? "ring-2 ring-[#05A1B7]/70" : "",
							)}
							contentClassName="p-6 flex flex-col h-full"
						>
							<h3 className="text-lg font-semibold text-slate-900 mb-2 mt-2">
								{plan.name}
							</h3>
							<div className="flex items-baseline gap-1 mb-4">
								<span className="text-4xl font-bold text-slate-700">
									${plan.displayPrice}
								</span>
								<span className="text-sm text-slate-600">
									{period === "monthly" ? "user/month" : "user/year"}
								</span>
							</div>
							{idx === 2 ? (
								<a href="#contact">
									<button
										type="button"
										className="w-full rounded-full py-3 cursor-pointer font-semibold shadow-sm transition-all duration-200 bg-gradient-to-r from-slate-500 to-slate-700 text-white hover:opacity-90"
									>
										Contact sales
									</button>
								</a>
							) : (
								<Link href="/sign-in">
									<button
										type="button"
										className={cn(
											"w-full rounded-full py-3 cursor-pointer font-semibold shadow-sm transition-all duration-200",
											idx === 1
												? "primary-btn"
												: "bg-gradient-to-r from-slate-500 to-slate-700 text-white hover:opacity-90",
										)}
									>
										Get started
									</button>
								</Link>
							)}
							<hr className="my-6 border-slate-200" />
							<h4 className="text-sm font-semibold text-slate-800 mb-3">
								{idx === 0
									? "Everything in starter plan"
									: idx === 1
										? "Everything in Starter plan plus"
										: "Everything in Growth plan plus"}
							</h4>
							<ul className="space-y-2 text-slate-600 text-sm">
								{plan.features.slice(0, 8).map((feature) => (
									<li key={feature} className="flex items-start gap-2">
										<Check
											className="mt-0.5 h-5 w-5"
											aria-hidden
											style={{ color: "#05A1B7" }}
										/>
										<span>{stripMarkdown(feature)}</span>
									</li>
								))}
							</ul>
						</LandingFrostedCard>
					))}
				</div>

				<div className="mt-10">
					<p className="text-center text-xs font-medium uppercase tracking-wider text-slate-500 mb-4">
						Trusted by market leaders
					</p>
					<div className="flex flex-wrap items-center justify-center gap-8 sm:gap-10 opacity-70">
						{TRUSTED_BRAND_LOGOS.map((logo) => (
							<Image
								key={logo.alt}
								src={logo.src}
								alt={logo.alt}
								width={100}
								height={24}
								className="h-5 w-auto"
							/>
						))}
					</div>
				</div>

				<p className="flex items-center gap-2 justify-center mt-8 text-center text-slate-600 text-sm">
					<span>
						<HandHeart />
					</span>
					We donate 2% of your membership to child and family wellbeing
				</p>
			</div>
		</LandingSection>
	);
}
