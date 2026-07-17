"use client";

import {
	AlertTriangle,
	CheckCircle2,
	CircleAlert,
	ClipboardCheck,
	FileText,
	Shield,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const SIDEBAR_SECTIONS = [
	{
		header: "Dashboard",
		items: [{ name: "Executive", active: false }],
	},
	{
		header: "Contracts",
		items: [{ name: "All Contracts", active: false }],
	},
	{
		header: "Licenses",
		items: [{ name: "All Licenses", active: false }],
	},
	{
		header: "Audits",
		items: [
			{ name: "Compliance Status", active: true },
			{ name: "Audit Log", active: false },
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
			<div className="flex min-h-[360px]">
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
					<nav className="flex flex-col gap-2.5">
						{SIDEBAR_SECTIONS.map((section) => (
							<div key={section.header}>
								<p className="mb-1 px-1 text-[10px] font-bold text-slate-800">
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

				{/* Main — mirrors /audits/status (AuditPageShell + ComplianceOverviewPanel) */}
				<div className="flex-1 min-w-0 p-3 sm:p-4">
					<div className="mb-3">
						<h3 className="text-xl sm:text-2xl font-bold capitalize sidebar-gradient-text leading-tight">
							Compliance status
						</h3>
						<p className="mt-1 text-[10px] sm:text-xs text-slate-600 max-w-xl">
							Nonprofit compliance posture across regulatory filings, contracts,
							licenses, documents, and governance — aligned with CAALM modules.
						</p>
					</div>

					{/* Posture card */}
					<div className="glass-card relative mb-3 border-2 border-green/30">
						<div className="glass-card-cap" />
						<div className="p-3 sm:p-4">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div className="min-w-0">
									<div className="flex items-start gap-2">
										<CheckCircle2 className="h-6 w-6 text-[#0f5384] shrink-0" />
										<p className="text-xs font-medium sidebar-gradient-text pt-1">
											Organization compliance posture
										</p>
									</div>
									<div className="mt-1 pl-8 flex flex-wrap items-center gap-2">
										<span className="text-2xl font-bold text-slate-700">87%</span>
										<span className="inline-flex items-center rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-[10px] font-medium text-green">
											On track
										</span>
									</div>
									<p className="mt-1 pl-8 text-[10px] text-slate-600">
										Nonprofit compliance view across filings, contracts, licenses,
										documents, and governance.
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
								<div className="p-2.5 sm:p-3">
									<p className="text-[10px] sm:text-xs font-medium sidebar-gradient-text">
										{stat.label}
									</p>
									<div className="pt-1 text-lg sm:text-2xl font-bold text-slate-700 tabular-nums">
										{stat.value}
									</div>
									<p className="mt-0.5 text-[9px] sm:text-[10px] text-slate-600 line-clamp-2">
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
								<div
									key={mod.label}
									className="glass-card relative p-2.5 pt-3"
								>
									<div className="glass-card-cap" />
									<p className="text-[10px] font-medium text-slate-800">
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
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
