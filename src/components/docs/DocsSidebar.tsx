"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DOCS_NAV } from "@/lib/docs/navigation";
import { cn } from "@/lib/utils";

function isItemActive(pathname: string, slug: string) {
	const href = `/docs/${slug}`;
	return pathname === href || pathname === `${href}/`;
}

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		() => new Set(),
	);

	useEffect(() => {
		const activeGroup = DOCS_NAV.find((group) =>
			group.items.some((item) => isItemActive(pathname, item.slug)),
		);
		if (!activeGroup) return;
		setCollapsedGroups((prev) => {
			if (!prev.has(activeGroup.id)) return prev;
			const next = new Set(prev);
			next.delete(activeGroup.id);
			return next;
		});
	}, [pathname]);

	const toggleGroup = (id: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<nav aria-label="Documentation" className="space-y-6 pb-10">
			{DOCS_NAV.map((group) => {
				const collapsed = collapsedGroups.has(group.id);

				return (
					<div key={group.id}>
						<button
							type="button"
							onClick={() => toggleGroup(group.id)}
							aria-expanded={!collapsed}
							className={cn(
								"mb-2 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5",
								"transition-colors duration-200",
								"hover:bg-slate-100/80 dark:hover:bg-slate-800/80",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
							)}
						>
							<span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100">
								{group.title}
							</span>
							<ChevronDown
								className={cn(
									"h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400",
									collapsed && "-rotate-90",
								)}
								aria-hidden
							/>
						</button>
						{!collapsed ? (
							<ul className="space-y-0.5">
								{group.items.map((item) => {
									const href = `/docs/${item.slug}`;
									const active = isItemActive(pathname, item.slug);
									return (
										<li key={item.slug}>
											<Link
												href={href}
												onClick={onNavigate}
												className={cn(
													"block rounded-md px-2 py-1.5 text-sm transition-colors duration-200",
													active
														? "bg-blue-50 font-medium text-[#0f5384] dark:bg-slate-800 dark:text-sky-300"
														: "font-normal text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200",
												)}
											>
												{item.title}
											</Link>
										</li>
									);
								})}
							</ul>
						) : null}
					</div>
				);
			})}
		</nav>
	);
}
