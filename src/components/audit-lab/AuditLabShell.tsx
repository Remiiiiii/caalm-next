"use client";

import {
	BarChart3,
	ChartQuadrant,
	ClipboardList,
	Drama,
	LayoutDashboard,
	MessagesSquare,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { LabCapabilities } from "@/lib/audit-lab/access";

const NAV = [
	{ href: "/audit-lab/overview", label: "Overview", icon: LayoutDashboard },
	{ href: "/audit-lab/sessions", label: "Sessions", icon: ClipboardList },
	{
		href: "/audit-lab/interview",
		label: "Interview Builder",
		icon: MessagesSquare,
	},
	{ href: "/audit-lab/practice", label: "Practice & Roleplay", icon: Drama },
	{
		href: "/audit-lab/evidence",
		label: "Evidence Matrix",
		icon: ChartQuadrant,
	},
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
	const router = useRouter();
	const activePath =
		NAV.find((item) => pathname?.startsWith(item.href))?.href ??
		"/audit-lab/overview";

	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="shrink-0 border-b border-slate-200/70 px-4 py-4 lg:px-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-[17px] font-bold tracking-tight text-[#0f5384]">
							{title}
						</h1>
						<p className="mt-1 text-[13px] text-slate-500">{description}</p>
					</div>
					{primaryAction ? (
						<div className="shrink-0">{primaryAction}</div>
					) : null}
				</div>
				<SegmentedToggle
					value={activePath}
					onChange={(href) => router.push(href)}
					ariaLabel="Audit Lab surfaces"
					className="mt-4"
					tabs={NAV.map((item) => ({
						value: item.href,
						label: item.label,
						icon: item.icon,
					}))}
				/>
				{capabilities.readOnly ? (
					<p className="mt-2 text-[11px] text-slate-400">
						View-only for your role.
					</p>
				) : null}
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6">
				{children}
			</div>
		</div>
	);
}
