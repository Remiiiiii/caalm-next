"use client";

import { DOCS_NAV } from "@/lib/docs/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();

	return (
		<nav aria-label="Documentation" className="space-y-8 pb-10">
			{DOCS_NAV.map((group) => (
				<div key={group.id}>
					<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
						{group.title}
					</p>
					<ul className="space-y-0.5">
						{group.items.map((item) => {
							const href = `/docs/${item.slug}`;
							const active =
								pathname === href || pathname === `/docs/${item.slug}/`;
							return (
								<li key={item.slug}>
									<Link
										href={href}
										onClick={onNavigate}
										className={cn(
											"block rounded-md px-2 py-1.5 text-sm transition-colors duration-200",
											active
												? "bg-blue-50 font-medium text-[#0f5384]"
												: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
										)}
									>
										{item.title}
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</nav>
	);
}
