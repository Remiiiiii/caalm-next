"use client";

import { Building, Building2, Crown, Eye, Lock, Server } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ITNavIcon } from "@/components/sidebar/ITNavIcon";
import { NavItemIcon } from "@/components/sidebar/NavItemIcon";
import {
	DASHBOARD_ITEM_COLORS,
	ITEM_ICONS,
	isNavItemActive,
} from "@/components/sidebar/sidebar-icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ITNavIconKey } from "@/constants/it-navigation";
import type { NavigationItem } from "@/constants/navigation-permissions";
import { cn } from "@/lib/utils";

export type FlyoutNavItem = {
	name: string;
	url: string;
	icon?: string;
	iconKey?: ITNavIconKey;
	permissions?: string[];
	viewerReadOnly?: boolean;
};

type SidebarSectionFlyoutProps = {
	sectionHeader: string;
	items: FlyoutNavItem[];
	isViewer?: boolean;
	shouldShowLock?: (item: NavigationItem) => boolean;
	/** Used to avoid marking /analytics as active for nested routes incorrectly */
	rootException?: string;
	onNavigate?: () => void;
};

function ItemIcon({
	item,
	sectionHeader,
}: {
	item: FlyoutNavItem;
	sectionHeader: string;
}) {
	if (item.iconKey) {
		return (
			<ITNavIcon
				name={item.iconKey}
				size={16}
				className="text-slate-600 shrink-0"
			/>
		);
	}

	if (sectionHeader === "Dashboard" || sectionHeader === "Workspaces") {
		if (item.name === "Super Admin")
			return <Crown className="h-4 w-4 text-yellow-500 shrink-0" />;
		if (item.name === "Organization Admin")
			return <Building2 className="h-4 w-4 text-blue-500 shrink-0" />;
		if (item.name === "Department Manager")
			return <Building className="h-4 w-4 text-green-500 shrink-0" />;
		if (item.name === "Viewer")
			return <Eye className="h-4 w-4 text-gray-500 shrink-0" />;
		if (item.name === "IT")
			return <Server className="h-4 w-4 text-[#0f5384] shrink-0" />;
	}

	const mapped = ITEM_ICONS[item.name];
	if (item.name === "Documents" || mapped?.src) {
		return (
			<NavItemIcon
				name={item.name}
				width={mapped?.width ?? 18}
				height={mapped?.height ?? 18}
			/>
		);
	}

	const src = item.icon;
	if (!src) return null;

	return (
		<Image
			src={src}
			alt=""
			width={18}
			height={18}
			className="shrink-0 max-w-none"
			style={{ width: "auto", height: "18px" }}
		/>
	);
}

export default function SidebarSectionFlyout({
	sectionHeader,
	items,
	isViewer = false,
	shouldShowLock,
	rootException,
	onNavigate,
}: SidebarSectionFlyoutProps) {
	const pathname = usePathname();

	return (
		<div className="glass-card-frosted sidebar-flyout-frost w-[220px] sm:w-[240px] rounded-lg shadow-lg">
			<div className="glass-card-cap" />
			<div className="relative z-10 p-3 pt-5">
				<p className="text-sm font-semibold sidebar-gradient-text px-1">
					{sectionHeader}
				</p>
				<div className="my-2 h-px w-full bg-slate-200/70" aria-hidden />
				<ul className="flex flex-col gap-0.5">
					{items.map((item) => {
						const active = isNavItemActive(pathname, item.url, rootException);
						const showLock =
							shouldShowLock &&
							item.permissions &&
							shouldShowLock(item as NavigationItem);

						return (
							<li key={`${sectionHeader}-${item.name}-${item.url}`}>
								<Link
									href={item.url || "#"}
									onClick={onNavigate}
									className={cn(
										"flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-all duration-200",
										"hover:bg-blue-50 hover:border-blue-300 border border-transparent",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										active && "bg-blue/10 border-blue/20",
										isViewer && item.viewerReadOnly && "opacity-75",
									)}
								>
									<ItemIcon item={item} sectionHeader={sectionHeader} />
									<span
										className="text-xs font-medium flex-1 truncate"
										style={{
											color:
												ITEM_ICONS[item.name]?.color ??
												DASHBOARD_ITEM_COLORS[item.name] ??
												"#8E8E8E",
										}}
									>
										{item.name}
									</span>
									{showLock && (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="flex items-center">
														<Lock className="h-3 w-3 text-gray-500" />
													</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>
														Permission required. Contact your administrator.
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									)}
									{isViewer && item.viewerReadOnly && (
										<span className="text-[10px] text-gray-500">
											(read-only)
										</span>
									)}
								</Link>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
