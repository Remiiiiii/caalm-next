"use client";

import {
	Bookmark,
	CheckCircle,
	ChevronDown,
	Crown,
	FileText,
	Filter,
	LayoutGrid,
	Search,
	Table,
	TriangleAlert,
	Upload,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import Thumbnail from "@/components/Thumbnail";
import { cn } from "@/lib/utils";
import { CONTRACT_MOCK_ROWS } from "../landingContent";

const STATUS_STYLES = {
	active: "bg-green/10 text-green border-green/20",
	pending: "bg-orange/10 text-orange border-orange/20",
	expired: "bg-red/10 text-red border-red/20",
} as const;

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
				active: true,
			},
			{
				name: "My Contracts",
				icon: "/assets/icons/my-contracts.svg",
				active: false,
			},
			{
				name: "Approvals",
				icon: "/assets/icons/proposal-approval.svg",
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

const STATUS_TABS = [
	{ label: "All", count: 16 },
	{ label: "Active", count: 14 },
	{ label: "Pending", count: 1 },
	{ label: "Expiring", count: 4 },
	{ label: "Expired", count: 1 },
] as const;

function GlassStat({
	label,
	value,
	hint,
	icon: Icon,
	iconClassName,
}: {
	label: string;
	value: string;
	hint: ReactNode;
	icon?: typeof FileText;
	iconClassName?: string;
}) {
	return (
		<div className="glass-card relative min-w-0">
			<div className="glass-card-cap" />
			<div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-4 sm:pt-5 text-center">
				<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text">
					{label}
				</p>
				<div className="flex items-center justify-center gap-1.5 pt-1">
					<span className="text-base sm:text-xl font-bold text-slate-700 tabular-nums">
						{value}
					</span>
					{Icon ? (
						<Icon
							className={cn(
								"h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0",
								iconClassName ?? "text-slate-600",
							)}
						/>
					) : null}
				</div>
				{typeof hint === "string" ? (
					<p className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5 truncate">
						{hint}
					</p>
				) : (
					hint
				)}
			</div>
		</div>
	);
}

export default function ContractsMock() {
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
									<p className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-bold text-slate-800 lg:text-[11px]">
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

				{/* Main — mirrors /contracts page chrome */}
				<div className="flex-1 min-w-0 p-3 sm:p-4">
					<div className="mb-3 flex items-center justify-between gap-2">
						<h3 className="h1 text-xl sm:text-2xl capitalize sidebar-gradient-text !leading-none">
							Contracts
						</h3>
						<div className="flex items-center gap-2 shrink-0">
							<span className="inline-flex items-center gap-1.5 rounded-full primary-btn px-2.5 py-1 text-[10px] sm:text-xs">
								<Upload className="h-3 w-3" />
								Upload
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full primary-btn px-2.5 py-1 text-[10px] sm:text-xs">
								<Upload className="h-3 w-3" />
								Export
							</span>
						</div>
					</div>

					<div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
						<GlassStat
							label="Total Value"
							value="$2.3M"
							hint="Sum of contract amounts"
						/>
						<GlassStat
							label="Total Contracts"
							value="16"
							hint="All contracts in view"
							icon={FileText}
							iconClassName="text-[#0f5384]"
						/>
						<GlassStat
							label="Expiring Soon"
							value="4"
							icon={TriangleAlert}
							iconClassName="text-orange"
							hint={
								<div className="mt-0.5 flex items-center justify-center gap-2 text-[9px] sm:text-[10px] text-slate-600">
									<span>30d: 1</span>
									<span>60d: 2</span>
									<span>90d: 1</span>
								</div>
							}
						/>
						<GlassStat
							label="Active"
							value="14"
							hint="88% of total"
							icon={CheckCircle}
							iconClassName="text-green"
						/>
					</div>

					{/* Status tabs — ContractsStatusTabs */}
					<div className="mb-2 rounded-lg border border-slate-200/80 bg-white/70 overflow-hidden">
						<div className="grid grid-cols-5 gap-0.5 bg-slate-100/80 p-1">
							{STATUS_TABS.map((tab, i) => (
								<span
									key={tab.label}
									className={cn(
										"rounded-md px-1 py-1.5 text-center text-[9px] sm:text-[10px]",
										i === 0
											? "bg-white shadow-sm font-medium"
											: "text-slate-600",
									)}
								>
									<span className="sidebar-gradient-text font-medium">
										{tab.label}
									</span>
									<span className="ml-0.5 text-slate-500 tabular-nums">
										{tab.count}
									</span>
								</span>
							))}
						</div>

						{/* Control bar — mirrors ContractsControlBar / TopControls / Filter / Views / Sort / ViewToggle */}
						<div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 px-2 py-2 sm:px-3">
							<div className="relative min-w-0 flex-1 sm:min-w-[140px] sm:max-w-[11rem]">
								<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
								<span className="flex h-7 w-full items-center rounded-md border border-slate-200 bg-white pl-7 pr-2 text-[10px] text-slate-400">
									Search contracts...
								</span>
							</div>
							<div className="flex flex-wrap items-center justify-end gap-1.5">
								<span className="inline-flex h-7 items-center gap-1 rounded-full primary-btn px-2.5 text-[10px]">
									<Filter className="h-3 w-3" />
									Filter
								</span>
								<span className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-700">
									<Bookmark className="h-3 w-3" />
									<span className="hidden sm:inline">Views</span>
								</span>
								<span className="inline-flex h-7 max-w-[9.5rem] items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-700">
									<span className="truncate">Date created (newest)</span>
									<ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
								</span>
								<span className="inline-flex items-center rounded-md border-2 border-slate-200 bg-white p-0.5 shadow-sm">
									<span className="inline-flex items-center justify-center rounded px-1.5 py-1 text-slate-600">
										<LayoutGrid className="h-3.5 w-3.5" />
									</span>
									<span className="inline-flex items-center justify-center rounded bg-[#03afbf] px-1.5 py-1 text-white shadow-sm">
										<Table className="h-3.5 w-3.5" />
									</span>
								</span>
							</div>
						</div>

						{/* Table — ContractsTableView columns */}
						<div className="overflow-x-auto border-t border-slate-200/80">
							<table className="w-full text-left text-[10px] sm:text-[11px]">
								<thead>
									<tr className="bg-slate-50/90 text-slate-500">
										<th className="w-6 px-2 py-2">
											<span className="inline-block h-3 w-3 rounded border border-slate-300" />
										</th>
										<th className="px-2 py-2 font-medium">Name</th>
										<th className="px-2 py-2 font-medium">Status</th>
										<th className="hidden md:table-cell px-2 py-2 font-medium">
											Size
										</th>
										<th className="hidden lg:table-cell px-2 py-2 font-medium">
											Uploaded
										</th>
										<th className="hidden sm:table-cell px-2 py-2 font-medium">
											Expires
										</th>
									</tr>
								</thead>
								<tbody>
									{CONTRACT_MOCK_ROWS.map((row) => (
										<tr
											key={row.name}
											className="border-t border-slate-100 bg-white/50 hover:bg-blue-50/40"
										>
											<td className="px-2 py-2">
												<span className="inline-block h-3 w-3 rounded border border-slate-300" />
											</td>
											<td className="px-2 py-2">
												<div className="flex items-center gap-1.5 min-w-0">
													<Thumbnail
														type="document"
														extension="pdf"
														url=""
														className="!size-6 !min-w-6 !min-h-6 shrink-0 aspect-square rounded-full"
														imageClassName="!size-4"
													/>
													<span className="truncate font-medium text-slate-800 max-w-[110px] sm:max-w-[160px]">
														{row.name}
													</span>
												</div>
											</td>
											<td className="px-2 py-2">
												<span
													className={cn(
														"inline-block whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium",
														STATUS_STYLES[row.statusTone],
													)}
												>
													{row.status}
												</span>
											</td>
											<td className="hidden md:table-cell px-2 py-2 text-slate-600">
												{row.size}
											</td>
											<td className="hidden lg:table-cell px-2 py-2 text-slate-600">
												{row.uploaded}
											</td>
											<td className="hidden sm:table-cell px-2 py-2 text-slate-600">
												{row.expires}
											</td>
										</tr>
									))}
								</tbody>
							</table>
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
