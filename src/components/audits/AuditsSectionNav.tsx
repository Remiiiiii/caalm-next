"use client";

import { ClipboardCheck, Gauge, ScrollText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTION_TABS = [
	{
		href: "/audits/readiness",
		label: "Readiness",
		icon: Gauge,
		match: (pathname: string) => pathname.startsWith("/audits/readiness"),
	},
	{
		href: "/audits/status",
		label: "Compliance status",
		icon: ClipboardCheck,
		match: (pathname: string) =>
			pathname === "/audits/status" || pathname.startsWith("/audits/status/"),
	},
	{
		href: "/audits/audit",
		label: "Audit logs",
		icon: ScrollText,
		match: (pathname: string) => pathname.startsWith("/audits/audit"),
	},
] as const;

export function AuditsSectionNav() {
	const pathname = usePathname();

	return (
		<nav
			className="flex flex-wrap gap-1 mb-4 border-b border-slate-200"
			aria-label="Audit sections"
		>
			{SECTION_TABS.map((tab) => {
				const Icon = tab.icon;
				const isActive = tab.match(pathname);
				return (
					<Link
						key={tab.href}
						href={tab.href}
						data-state={isActive ? "active" : undefined}
						aria-current={isActive ? "page" : undefined}
						className={cn(
							"tabs-underline inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 cursor-pointer transition-colors duration-200",
							"hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
							isActive && "text-slate-700",
						)}
					>
						<Icon className="h-4 w-4 text-[#0f5384] shrink-0" />
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
