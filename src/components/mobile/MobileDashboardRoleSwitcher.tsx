"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/constants/navigation-permissions";
import { isNavItemActive } from "@/components/sidebar/sidebar-icons";
import { cn } from "@/lib/utils";

type MobileDashboardRoleSwitcherProps = {
	items: NavigationItem[];
	onNavigate?: () => void;
};

/** Mobile-only: dashboard role links separated from main nav ("Viewing as"). */
export function MobileDashboardRoleSwitcher({
	items,
	onNavigate,
}: MobileDashboardRoleSwitcherProps) {
	const pathname = usePathname();

	if (items.length === 0) return null;

	return (
		<div className="mb-4 px-1">
			<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
				Viewing as
			</p>
			<div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/80 p-1">
				{items.map((item) => {
					if (!item.url) return null;
					const active = isNavItemActive(pathname, item.url, "/analytics");
					return (
						<Link
							key={item.url}
							href={item.url}
							onClick={() => onNavigate?.()}
							className={cn(
								"flex min-h-10 cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
								active
									? "bg-blue/10 text-[#0f5384] border border-blue/20"
									: "text-slate-700 hover:bg-blue-50 hover:border-blue-300 border border-transparent",
							)}
						>
							{item.name}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
