"use client";

import {
	AlertTriangle,
	CheckCircle2,
	CircleAlert,
	ClipboardCheck,
	Crown,
	FileText,
	Shield,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Icon paths mirrored from `Sidebar.tsx` SECTION_ICONS / ITEM_ICONS */
const SIDEBAR_SECTIONS = [
	{
		header: "Dashboard",
		headerIcon: "/assets/icons/dashboard.svg",
		items: [
			{
				name: "Executive",
				// Super Admin badge icon from Sidebar.tsx
				lucideIcon: Crown,
				active: false,
			},
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
				active: true,
			},
			{
				name: "Audit Log",
				icon: "/assets/icons/audit-logs.svg",
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
				active: false,
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
] as const;

const STAT_CARDS = [
	{
		label: "Areas at risk",
		value: "3",
		hint: "Contracts, licenses, or filings needing action",
	},
	{
		label: "Upcoming deadlines",
		value: "7",
		hint: "Next 90 days across CAALM modules",
	},
	{
		label: "Contract compliance",
		value: "92%",
		hint: "Live from Contracts module",
	},
	{
		label: "License compliance",
		value: "88%",
		hint: "Live from Licenses module",
	},
] as const;

const QUICK_ACTIONS = [
	{ label: "Contracts", icon: FileText },
	{ label: "Licenses", icon: Shield },
	{ label: "Documents", icon: FileText },
	{ label: "Reports", icon: ClipboardCheck },
] as const;

export default function AuditsMock() {
	return (
		<div className="rounded-xl border border-slate-200/80 bg-white/80 overflow-hidden shadow-md">
			<div className="relative flex min-h-[360px] items-stretch">
				{/* Sidebar — height locked to main; excess nav soft-fades */}
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

				{/* Main — mirrors /audits/status (AuditPageShell + ComplianceOverviewPanel) */}
				<div className="flex-1 min-w-0 p-3 sm:p-4">
					<div className="mb-3">
						<h3 className="text-xl sm:text-2xl font-bold capitalize sidebar-gradient-text leading-tight">
							Compliance status
						</h3>
						<p className="mt-1 text-[10px] sm:text-xs text-slate-600 max-w-xl">
							Nonprofit compliance posture across regulatory filings, contracts,
							licenses, documents, and governance aligned with CAALM modules.
						</p>
					</div>

					{/* Posture card */}
					<div className="glass-card relative mb-3 border-2 border-green/30">
						<div className="glass-card-cap" />
						<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div className="min-w-0">
									<div className="flex items-start gap-2">
										<CheckCircle2 className="h-6 w-6 text-[#0f5384] shrink-0" />
										<p className="text-xs font-medium sidebar-gradient-text pt-1">
											Organization compliance posture
										</p>
									</div>
									<div className="mt-1 pl-8 flex flex-wrap items-center gap-2">
										<span className="text-2xl font-bold text-slate-700">
											87%
										</span>
										<span className="inline-flex items-center rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-[10px] font-medium text-green">
											On track
										</span>
									</div>
									<p className="mt-1 pl-8 text-[10px] text-slate-600">
										Nonprofit compliance view across filings, contracts,
										licenses, documents, and governance.
									</p>
								</div>
								<div className="shrink-0 rounded-lg bg-slate-50/80 px-3 py-2">
									<p className="mb-1.5 text-[10px] font-medium text-slate-600">
										Quick actions
									</p>
									<div className="flex flex-wrap gap-1.5">
										{QUICK_ACTIONS.map((action) => (
											<span
												key={action.label}
												className="inline-flex items-center gap-1 rounded-full primary-btn px-2 py-1 text-[9px] sm:text-[10px]"
											>
												<action.icon className="h-2.5 w-2.5" />
												{action.label}
											</span>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Stat cards — ComplianceOverviewPanel */}
					<div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
						{STAT_CARDS.map((stat) => (
							<div key={stat.label} className="glass-card relative min-w-0">
								<div className="glass-card-cap" />
								<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5 text-center">
									<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text">
										{stat.label}
									</p>
									<div className="pt-1 text-lg sm:text-2xl font-bold text-slate-700 tabular-nums">
										{stat.value}
									</div>
									<p className="mt-0.5 text-[9px] sm:text-[10px] text-slate-600 line-clamp-2 text-left">
										{stat.hint}
									</p>
								</div>
							</div>
						))}
					</div>

					<div className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] sm:text-xs text-slate-600">
						<ClipboardCheck className="h-3.5 w-3.5 text-[#0f5384] shrink-0 mt-0.5" />
						<span>
							Contracts and licenses pull live data from your organization.
							Regulatory, document, and governance metrics reflect standard
							nonprofit KRIs.
						</span>
					</div>

					{/* Module RAG strip */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{[
							{
								label: "Regulatory",
								tone: "green" as const,
								icon: CheckCircle2,
							},
							{ label: "Contracts", tone: "amber" as const, icon: CircleAlert },
							{ label: "Licenses", tone: "green" as const, icon: CheckCircle2 },
							{ label: "Documents", tone: "red" as const, icon: AlertTriangle },
						].map((mod) => {
							const badge =
								mod.tone === "green"
									? "bg-green/10 text-green border-green/20"
									: mod.tone === "amber"
										? "bg-orange/10 text-orange border-orange/20"
										: "bg-red/10 text-red border-red/20";
							const Icon = mod.icon;
							return (
								<div key={mod.label} className="glass-card relative min-w-0">
									<div className="glass-card-cap" />
									<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5 flex flex-col items-center text-center">
										<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text">
											{mod.label}
										</p>
										<span
											className={cn(
												"mt-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
												badge,
											)}
										>
											<Icon className="h-2.5 w-2.5" />
											{mod.tone === "green"
												? "On track"
												: mod.tone === "amber"
													? "Attention"
													: "At risk"}
										</span>
									</div>
								</div>
							);
						})}
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
