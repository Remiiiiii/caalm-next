"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Building2,
	Calendar,
	ChevronDown,
	ClipboardCheck,
	Crown,
	SquareArrowRightExit,
	FileText,
	Shield,
	TrendingUp,
	Users,
} from "lucide-react";
import Image from "next/image";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

/** Icon paths mirrored from `Sidebar.tsx` SECTION_ICONS / ITEM_ICONS */
const SIDEBAR_SECTIONS = [
	{
		header: "Dashboard",
		headerIcon: "/assets/icons/dashboard.svg",
		items: [
			{
				name: "Executive",
				lucideIcon: Crown,
				active: false,
			},
		],
	},
	{
		header: "Calendar",
		headerIcon: "/assets/icons/calendar2.svg",
		items: [
			{ name: "Calendar", icon: "/assets/icons/calendar3.svg", active: false },
		],
	},
	{
		header: "Contracts",
		headerIcon: "/assets/icons/contracts.svg",
		items: [
			{
				name: "All Contracts",
				icon: "/assets/icons/all-contracts.svg",
				active: false,
			},
		],
	},
	{
		header: "Licenses",
		headerIcon: "/assets/icons/license.svg",
		items: [
			{
				name: "All Licenses",
				icon: "/assets/icons/licenses.svg",
				active: false,
			},
		],
	},
	{
		header: "Audits",
		headerIcon: "/assets/icons/audit.svg",
		items: [
			{
				name: "Compliance Status",
				icon: "/assets/icons/compliance-status.svg",
				active: false,
			},
		],
	},
	{
		header: "Team",
		headerIcon: "/assets/icons/team.svg",
		items: [
			{
				name: "User Management",
				icon: "/assets/icons/user-management.svg",
				active: false,
			},
			{
				name: "Role Management",
				icon: "/assets/icons/user-management2.svg",
				active: false,
			},
			{
				name: "Assign Tasks",
				icon: "/assets/icons/task.svg",
				active: false,
			},
		],
	},
	{
		header: "Reports & Analytics",
		headerIcon: "/assets/icons/reports-analytics.svg",
		items: [
			{
				name: "Overview",
				icon: "/assets/icons/analytics.svg",
				active: true,
			},
			{
				name: "Quick View",
				icon: "/assets/icons/analytics.svg",
				active: false,
			},
			{
				name: "C Suite",
				icon: "/assets/icons/analytics.svg",
				active: false,
			},
		],
	},
	{
		header: "Settings",
		headerIcon: "/assets/icons/settings.svg",
		items: [
			{
				name: "System Settings",
				icon: "/assets/icons/settings2.svg",
				active: false,
			},
			{
				name: "Organization Settings",
				icon: "/assets/icons/settings2.svg",
				active: false,
			},
			{
				name: "Billing & Integrations",
				icon: "/assets/icons/settings2.svg",
				active: false,
			},
		],
	},
	{
		header: "My Roles & Permissions",
		headerIcon: "/assets/icons/shield.svg",
		items: [
			{
				name: "View My Access",
				icon: "/assets/icons/users.svg",
				active: false,
			},
		],
	},
] as const;

const STAT_CARDS = [
	{ title: "Total contracts", value: "248", icon: FileText },
	{ title: "Total budget", value: "$1.9M", icon: TrendingUp },
	{ title: "Active staff", value: "89", icon: Users },
	{ title: "Compliance rate", value: "92%", icon: ClipboardCheck },
] as const;

const TABS = [
	{ id: "organization", label: "Organization", icon: Building2, active: true },
	{ id: "contracts", label: "Contracts", icon: FileText, active: false },
	{
		id: "compliance",
		label: "Compliance & audit",
		icon: Shield,
		active: false,
	},
	{ id: "calendar", label: "Calendar", icon: Calendar, active: false },
] as const;

const DOMAIN_CARDS = [
	{
		label: "Contracts",
		percent: 94,
		atRisk: 2,
		tracked: 48,
		tone: "green" as const,
	},
	{
		label: "Licenses",
		percent: 88,
		atRisk: 3,
		tracked: 32,
		tone: "green" as const,
	},
	{
		label: "Governance",
		percent: 76,
		atRisk: 5,
		tracked: 18,
		tone: "amber" as const,
	},
] as const;

const DEPT_BARS = [
	{ name: "Finance", rate: 96, color: "bg-green" },
	{ name: "Legal", rate: 91, color: "bg-[#0f5384]" },
	{ name: "Operations", rate: 84, color: "bg-[#00C1CB]" },
	{ name: "HR", rate: 78, color: "bg-orange" },
] as const;

function AnimatedPercentBar({
	percent,
	fillClassName,
	trackClassName,
	delay = 0,
	reduceMotion,
}: {
	percent: number;
	fillClassName: string;
	trackClassName?: string;
	delay?: number;
	reduceMotion: boolean | null;
}) {
	return (
		<div
			className={cn(
				"rounded-full bg-slate-200 overflow-hidden",
				trackClassName,
			)}
		>
			<motion.div
				className={cn("h-full rounded-full", fillClassName)}
				initial={{ width: "0%" }}
				animate={{ width: `${percent}%` }}
				transition={
					reduceMotion
						? { duration: 0 }
						: {
								duration: 1.2,
								ease: [0.22, 1, 0.36, 1],
								delay,
							}
				}
				aria-hidden
			/>
		</div>
	);
}

function AnimatedPercentLabel({
	percent,
	className,
	reduceMotion,
	delay = 0,
}: {
	percent: number;
	className?: string;
	reduceMotion: boolean | null;
	delay?: number;
}) {
	if (reduceMotion) {
		return <span className={className}>{percent}%</span>;
	}
	return (
		<span className={className}>
			<CountUp
				end={percent}
				suffix="%"
				duration={1.2}
				delay={delay}
				start={0}
			/>
		</span>
	);
}

export default function AnalyticsMock() {
	const reduceMotion = useReducedMotion();

	return (
		<div className="rounded-xl border border-slate-200/80 bg-white/80 overflow-hidden shadow-md">
			<div className="relative flex min-h-[360px] items-stretch">
				{/* Sidebar */}
				<div className="relative hidden w-[10.5rem] shrink-0 border-r border-slate-200/80 bg-white/90 sm:block md:w-48">
					<aside className="absolute inset-0 flex flex-col overflow-hidden p-2.5">
						<div className="mb-3 flex shrink-0 items-center gap-2 px-1">
							<div className="relative h-7 w-7 shrink-0">
								<Image
									src="/assets/images/logo.svg"
									alt=""
									fill
									className="object-contain"
									sizes="28px"
								/>
							</div>
							<span className="text-[10px] font-bold sidebar-gradient-text truncate">
								CAALM
							</span>
						</div>
						<nav className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
							{SIDEBAR_SECTIONS.map((section) => (
								<div key={section.header} className="shrink-0">
									<p className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-bold text-slate-800">
										{section.header === "Dashboard" ? (
											<span className="text-[#03AFBF] shrink-0">
												<svg
													width="14"
													height="14"
													viewBox="0 0 26 26"
													fill="none"
													xmlns="http://www.w3.org/2000/svg"
													aria-hidden
												>
													<path
														d="M10.5167 2.16602H3.74582C2.87467 2.16602 2.16602 2.87467 2.16602 3.74582V7.80832C2.16602 8.67964 2.87467 9.38829 3.74582 9.38829H10.5167C11.388 9.38829 12.0966 8.67964 12.0966 7.80832V3.74582C12.0966 2.87467 11.388 2.16602 10.5167 2.16602ZM10.5167 11.1937H3.74582C2.87467 11.1937 2.16602 11.9024 2.16602 12.7737V22.2529C2.16602 23.124 2.87467 23.8327 3.74582 23.8327H10.5167C11.388 23.8327 12.0966 23.124 12.0966 22.2529V12.7737C12.0966 11.9024 11.388 11.1937 10.5167 11.1937ZM22.2529 16.6104H15.482C14.6107 16.6104 13.9021 17.3191 13.9021 18.1904V22.2529C13.9021 23.124 14.6107 23.8327 15.482 23.8327H22.2529C23.124 23.8327 23.8327 23.124 23.8327 22.2529V18.1904C23.8327 17.3191 23.124 16.6104 22.2529 16.6104ZM22.2529 2.16602H15.482C14.6107 2.16602 13.9021 2.87467 13.9021 3.74582V13.225C13.9021 14.0963 14.6107 14.805 15.482 14.805H22.2529C23.124 14.805 23.8327 14.0963 23.8327 13.225V3.74582C23.8327 2.87467 23.124 2.16602 22.2529 2.16602Z"
														fill="currentColor"
													/>
												</svg>
											</span>
										) : (
											<span className="relative h-3.5 w-3.5 shrink-0">
												<Image
													src={section.headerIcon}
													alt=""
													fill
													className="object-contain"
													sizes="14px"
												/>
											</span>
										)}
										<span className="truncate sidebar-gradient-text">
											{section.header}
										</span>
									</p>
									<ul className="relative ml-2.5 flex flex-col gap-0.5">
										{section.items.map((item, index) => (
											<li
												key={item.name}
												className="relative flex items-center"
											>
												{index < section.items.length && (
													<span
														className="absolute left-0 top-0 h-[22px] w-3 border-l border-[#BFBFBF]"
														aria-hidden
													/>
												)}
												<span
													className="absolute left-0 top-0 h-3.5 w-3 border-l border-b border-[#BFBFBF] rounded-bl-xl"
													aria-hidden
												/>
												<span
													className={cn(
														"ml-3 flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-[10px]",
														item.active
															? "bg-[#0f5384]/10 font-semibold text-[#0f5384] underline decoration-[#03AFBF] underline-offset-2"
															: "text-slate-600",
													)}
												>
													{"lucideIcon" in item && item.lucideIcon ? (
														<item.lucideIcon className="h-3 w-3 shrink-0 text-yellow-500" />
													) : "icon" in item && item.icon ? (
														<span className="relative h-3 w-3 shrink-0">
															<Image
																src={item.icon}
																alt=""
																fill
																className="object-contain"
																sizes="12px"
															/>
														</span>
													) : null}
													<span className="truncate">{item.name}</span>
												</span>
											</li>
										))}
									</ul>
								</div>
							))}
						</nav>
					</aside>
				</div>

				{/* Main — mirrors /analytics (AnalyticsPageShell + readiness + org tab) */}
				<div className="flex-1 min-w-0 p-3 sm:p-4">
					<div className="mb-3">
						<h3 className="text-xl sm:text-2xl font-bold capitalize sidebar-gradient-text leading-tight">
							Reports & analytics
						</h3>
						<p className="mt-1 text-[10px] sm:text-xs text-slate-600 max-w-xl">
							Comprehensive analytics and reporting for all departments
						</p>
					</div>

					{/* Filter bar */}
					<div className="glass-card relative mb-3">
						<div className="glass-card-cap" />
						<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5">
							<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text">
								Reporting period
							</p>
							<p className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5 mb-2">
								Filter every metric, chart, and readiness score on this page.
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 shadow-sm">
									Last 30 days
									<ChevronDown className="h-3 w-3 text-slate-400" />
								</span>
								<span className="text-[9px] text-slate-500 sm:ml-auto">
									Last updated Jul 21, 2026
								</span>
								<span className="inline-flex items-center gap-1 rounded-full primary-btn px-2 py-1 text-[9px]">
									<SquareArrowRightExit className="h-2.5 w-2.5" />
									Export
								</span>
							</div>
						</div>
					</div>

					{/* Audit readiness hero */}
					<div className="glass-card relative mb-3">
						<div className="glass-card-cap" />
						<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-start gap-2.5 min-w-0">
									<div className="rounded-lg bg-blue/10 p-2 shrink-0">
										<ClipboardCheck className="h-4 w-4 text-[#0f5384]" />
									</div>
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2 mb-1">
											<p className="text-xs sm:text-sm font-semibold sidebar-gradient-text">
												Audit readiness
											</p>
											<span className="rounded-full border border-green/20 bg-green/10 px-1.5 py-0.5 text-[9px] font-medium text-green">
												On track
											</span>
										</div>
										<p className="text-[9px] sm:text-[10px] text-slate-600 mb-1.5">
											Overall compliance posture across contracts, licenses, and
											governance.
										</p>
										<div className="flex flex-wrap gap-3 text-[9px] sm:text-[10px] text-slate-600">
											<span>
												<span className="font-semibold text-slate-700">4</span>{" "}
												areas at risk
											</span>
											<span>
												<span className="font-semibold text-slate-700">12</span>{" "}
												upcoming deadlines
											</span>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-3 shrink-0 sm:w-44">
									<div className="text-left sm:text-right">
										<AnimatedPercentLabel
											percent={87}
											className="text-2xl sm:text-3xl font-bold text-slate-700 tabular-nums"
											reduceMotion={reduceMotion}
											delay={0}
										/>
										<p className="text-[9px] text-slate-600">Readiness</p>
									</div>
									<AnimatedPercentBar
										percent={87}
										fillClassName="bg-green"
										trackClassName="h-2 flex-1"
										delay={0}
										reduceMotion={reduceMotion}
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Stat cards */}
					<div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
						{STAT_CARDS.map((stat) => (
							<div key={stat.title} className="glass-card relative min-w-0">
								<div className="glass-card-cap" />
								<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5">
									<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text">
										{stat.title}
									</p>
									<div className="flex items-center pt-1 text-lg sm:text-2xl font-bold text-slate-700 tabular-nums">
										<span>{stat.value}</span>
										<span className="ml-1.5 inline-block pb-0.5">
											<stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
										</span>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Tabs */}
					<div className="mb-3 flex w-full max-w-xl flex-wrap gap-1 rounded-lg border border-white/40 bg-white/40 p-1 backdrop-blur">
						{TABS.map((tab) => (
							<span
								key={tab.id}
								className={cn(
									"inline-flex flex-1 min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[9px] sm:text-[10px] font-medium",
									tab.active
										? "bg-white text-[#0f5384] shadow-sm"
										: "text-slate-600",
								)}
							>
								<tab.icon className="h-3 w-3 shrink-0" />
								<span className="truncate">{tab.label}</span>
							</span>
						))}
					</div>

					{/* Organization tab preview */}
					<div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
						{DOMAIN_CARDS.map((domain, i) => {
							const bar =
								domain.tone === "green"
									? "bg-green"
									: domain.tone === "amber"
										? "bg-orange"
										: "bg-red";
							const delay = 0.08 + i * 0.1;
							return (
								<div key={domain.label} className="glass-card relative min-w-0">
									<div className="glass-card-cap" />
									<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5">
										<div className="mb-2 flex items-start justify-between gap-2">
											<div className="min-w-0">
												<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text truncate">
													{domain.label}
												</p>
												<p className="text-[9px] text-slate-600">
													{domain.atRisk} at risk · {domain.tracked} tracked
												</p>
											</div>
											<AnimatedPercentLabel
												percent={domain.percent}
												className="text-base sm:text-lg font-bold text-slate-700 tabular-nums shrink-0"
												reduceMotion={reduceMotion}
												delay={delay}
											/>
										</div>
										<AnimatedPercentBar
											percent={domain.percent}
											fillClassName={bar}
											trackClassName="h-1.5"
											delay={delay}
											reduceMotion={reduceMotion}
										/>
									</div>
								</div>
							);
						})}
					</div>

					{/* Department compliance strip */}
					<div className="glass-card relative">
						<div className="glass-card-cap" />
						<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5">
							<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text mb-2">
								Department compliance
							</p>
							<div className="space-y-2">
								{DEPT_BARS.map((dept, i) => {
									const delay = 0.2 + i * 0.08;
									return (
										<div key={dept.name} className="flex items-center gap-2">
											<span className="w-16 shrink-0 text-[9px] sm:text-[10px] text-slate-600 truncate">
												{dept.name}
											</span>
											<AnimatedPercentBar
												percent={dept.rate}
												fillClassName={dept.color}
												trackClassName="h-1.5 flex-1"
												delay={delay}
												reduceMotion={reduceMotion}
											/>
											<AnimatedPercentLabel
												percent={dept.rate}
												className="w-8 shrink-0 text-right text-[9px] font-semibold text-slate-700 tabular-nums"
												reduceMotion={reduceMotion}
												delay={delay}
											/>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>

				<div
					className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-white via-white/80 to-transparent"
					aria-hidden
				/>
			</div>
		</div>
	);
}
