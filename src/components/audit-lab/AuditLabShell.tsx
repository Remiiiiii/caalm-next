"use client";

import {
	BarChart3,
	ClipboardList,
	FileText,
	GraduationCap,
	LayoutDashboard,
	ListChecks,
	MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { LabCapabilities } from "@/lib/audit-lab/access";
import { cn } from "@/lib/utils";

const NAV = [
	{ href: "/audit-lab/overview", label: "Overview", icon: LayoutDashboard },
	{ href: "/audit-lab/sessions", label: "Sessions", icon: ClipboardList },
	{
		href: "/audit-lab/interview",
		label: "Interview Builder",
		icon: MessagesSquare,
	},
	{ href: "/audit-lab/practice", label: "Practice & Roleplay", icon: GraduationCap },
	{ href: "/audit-lab/evidence", label: "Evidence Matrix", icon: ListChecks },
	{ href: "/audit-lab/reports", label: "Reports", icon: BarChart3 },
] as const;

export function AuditLabShell({
	title,
	description,
	primaryAction,
	capabilities,
	children,
}: {
	title: string;
	description: string;
	primaryAction?: ReactNode;
	capabilities: LabCapabilities;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const activePath =
		NAV.find((item) => pathname?.startsWith(item.href))?.href ??
		"/audit-lab/overview";

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[208px_minmax(0,1fr)]">
				<nav
					aria-label="Audit Lab surfaces"
					className="hidden flex-col gap-1 border-r border-slate-200/70 bg-white/20 p-3 lg:flex"
				>
					<p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
						Audit Lab
					</p>
					<ul className="space-y-0.5">
						{NAV.map((item) => {
							const Icon = item.icon;
							const active = activePath === item.href;
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										aria-current={active ? "page" : undefined}
										className={cn(
											"flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
											active
												? "bg-blue/10 font-medium text-[#0f5384]"
												: "text-slate-600 hover:bg-white/60 hover:text-slate-700",
										)}
									>
										<Icon
											className={cn(
												"h-3.5 w-3.5 shrink-0",
												active ? "text-[#0f5384]" : "text-slate-400",
											)}
											aria-hidden
										/>
										<span className="truncate">{item.label}</span>
									</Link>
								</li>
							);
						})}
					</ul>
					{capabilities.readOnly ? (
						<p className="mt-auto px-2 text-[11px] text-slate-400">
							View-only for your role.
						</p>
					) : null}
				</nav>
				<div className="flex min-h-0 min-w-0 flex-col">
					<header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-4 lg:px-6">
						<div>
							<h1 className="text-[17px] font-bold tracking-tight text-[#0f5384]">
								{title}
							</h1>
							<p className="mt-1 text-[13px] text-slate-500">{description}</p>
						</div>
						{primaryAction ? (
							<div className="shrink-0">{primaryAction}</div>
						) : null}
					</header>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6">
						{children}
					</div>
				</div>
			</div>
			<div className="border-t border-slate-200/70 p-2 lg:hidden">
				<select
					aria-label="Audit Lab surface"
					className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
					value={activePath}
					onChange={(e) => {
						window.location.href = e.target.value;
					}}
				>
					{NAV.map((item) => (
						<option key={item.href} value={item.href}>
							{item.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}