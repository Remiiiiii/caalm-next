"use client";

import {
	CheckCircle,
	DollarSign,
	FileText,
	Filter,
	Search,
	TriangleAlert,
	Upload,
} from "lucide-react";
import Image from "next/image";
import { CONTRACT_MOCK_ROWS } from "../landingContent";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
	active: "bg-green/10 text-green border-green/20",
	pending: "bg-orange/10 text-orange border-orange/20",
	expired: "bg-red/10 text-red border-red/20",
} as const;

const SIDEBAR_SECTIONS = [
	{
		header: "Dashboard",
		items: [{ name: "Executive", active: false }],
	},
	{
		header: "Calendar",
		items: [{ name: "Calendar", active: false }],
	},
	{
		header: "Contracts",
		items: [
			{ name: "All Contracts", active: true },
			{ name: "My Contracts", active: false },
			{ name: "Approvals", active: false },
		],
	},
	{
		header: "Licenses",
		items: [{ name: "All Licenses", active: false }],
	},
	{
		header: "Audits",
		items: [{ name: "Compliance Status", active: false }],
	},
] as const;

const STATUS_TABS = [
	{ label: "All", count: 4 },
	{ label: "Active", count: 2 },
	{ label: "Pending", count: 1 },
	{ label: "Expiring", count: 0 },
	{ label: "Expired", count: 1 },
] as const;

function GlassStat({
	label,
	value,
	hint,
	icon: Icon,
}: {
	label: string;
	value: string;
	hint: string;
	icon: typeof FileText;
}) {
	return (
		<div className="glass-card relative min-w-0">
			<div className="glass-card-cap" />
			<div className="p-2.5 sm:p-3">
				<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text">
					{label}
				</p>
				<div className="flex items-center gap-1.5 pt-1">
					<span className="text-base sm:text-xl font-bold text-slate-700 tabular-nums">
						{value}
					</span>
					<Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 shrink-0" />
				</div>
				<p className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5 truncate">
					{hint}
				</p>
			</div>
		</div>
	);
}

export default function ContractsMock() {
	return (
		<div className="rounded-xl border border-slate-200/80 bg-white/80 overflow-hidden shadow-md">
			<div className="flex min-h-[360px]">
				{/* Sidebar — mirrors app Sidebar sections */}
				<aside className="hidden sm:flex w-[9.5rem] md:w-44 shrink-0 flex-col border-r border-slate-200/80 bg-white/90 p-2.5">
					<div className="mb-3 flex items-center gap-2 px-1">
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
					<nav className="flex flex-col gap-2.5 overflow-hidden">
						{SIDEBAR_SECTIONS.map((section) => (
							<div key={section.header}>
								<p className="mb-1 px-1 text-[10px] font-bold text-slate-800 lg:text-[11px]">
									{section.header}
								</p>
								<ul className="flex flex-col gap-0.5">
									{section.items.map((item) => (
										<li key={item.name}>
											<span
												className={cn(
													"block truncate rounded-md px-2 py-1 text-[10px]",
													item.active
														? "bg-[#0f5384]/10 font-semibold text-[#0f5384] underline underline-offset-2"
														: "text-slate-600",
												)}
											>
												{item.name}
											</span>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</aside>

				{/* Main — mirrors /contracts page chrome */}
				<div className="flex-1 min-w-0 p-3 sm:p-4">
					<div className="mb-3 flex items-center justify-between gap-2">
						<h3 className="h1 text-xl sm:text-2xl capitalize sidebar-gradient-text !leading-none">
							Contracts
						</h3>
						<span className="inline-flex items-center gap-1.5 rounded-full primary-btn px-2.5 py-1 text-[10px] sm:text-xs shrink-0">
							<Upload className="h-3 w-3" />
							Upload
						</span>
					</div>

					<div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
						<GlassStat
							label="Total Value"
							value="$2.3M"
							hint="Sum of contract amounts"
							icon={DollarSign}
						/>
						<GlassStat
							label="Total Contracts"
							value="4"
							hint="All contracts in view"
							icon={FileText}
						/>
						<GlassStat
							label="Expiring Soon"
							value="0"
							hint="Within 90 days"
							icon={TriangleAlert}
						/>
						<GlassStat
							label="Active"
							value="2"
							hint="Currently in force"
							icon={CheckCircle}
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

						{/* Control bar */}
						<div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 px-2 py-2">
							<div className="flex min-w-[120px] flex-1 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-400">
								<Search className="h-3 w-3 shrink-0" />
								Search contracts…
							</div>
							<span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
								<Filter className="h-3 w-3" />
								Filter
							</span>
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
													<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100">
														<FileText className="h-3 w-3 text-[#0f5384]" />
													</span>
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
			</div>
		</div>
	);
}
