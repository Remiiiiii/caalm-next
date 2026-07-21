"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import SidebarSectionFlyout, {
	type FlyoutNavItem,
} from "@/components/sidebar/SidebarSectionFlyout";
import {
	isSectionActive,
	SECTION_ICONS,
} from "@/components/sidebar/sidebar-icons";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { NavigationItem } from "@/constants/navigation-permissions";
import { cn } from "@/lib/utils";

export type CollapsedSection = {
	header: string;
	items: FlyoutNavItem[];
	/** Optional override icon src (IT sidebar uses item icons) */
	iconSrc?: string;
};

type SidebarCollapsedRailProps = {
	sections: CollapsedSection[];
	isViewer?: boolean;
	shouldShowLock?: (item: NavigationItem) => boolean;
	rootException?: string;
	/** Custom section icon renderer (e.g. Dashboard SVG) */
	renderSectionIcon?: (header: string) => ReactNode;
};

function DashboardIcon({ size = 22 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
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
	);
}

function SectionIcon({
	header,
	iconSrc,
	renderSectionIcon,
}: {
	header: string;
	iconSrc?: string;
	renderSectionIcon?: (header: string) => ReactNode;
}) {
	if (renderSectionIcon) {
		const custom = renderSectionIcon(header);
		if (custom) return custom;
	}

	if (header === "Dashboard") {
		return (
			<span className="text-[#03AFBF]">
				<DashboardIcon size={22} />
			</span>
		);
	}

	const config = SECTION_ICONS[header];
	const src = iconSrc || config?.src;
	if (!src) {
		return (
			<span className="text-[#03AFBF]">
				<DashboardIcon size={22} />
			</span>
		);
	}

	return (
		<span className="text-[#03AFBF]">
			<Image
				src={src}
				alt=""
				width={22}
				height={22}
				className="shrink-0 max-w-none"
				style={{ width: "auto", height: "22px" }}
			/>
		</span>
	);
}

export default function SidebarCollapsedRail({
	sections,
	isViewer = false,
	shouldShowLock,
	rootException,
	renderSectionIcon,
}: SidebarCollapsedRailProps) {
	const pathname = usePathname();

	return (
		<nav className="sidebar-collapsed-rail flex flex-1 flex-col items-center gap-1 mt-6">
			{sections.map((section) => {
				if (section.items.length === 0) return null;

				const urls = section.items.map((item) => item.url).filter(Boolean);
				const active = isSectionActive(pathname, urls, rootException);

				return (
					<HoverCard key={section.header} openDelay={0} closeDelay={150}>
						<HoverCardTrigger asChild>
							<button
								type="button"
								aria-label={section.header}
								tabIndex={0}
								className={cn(
									"sidebar-rail-icon flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer",
									"transition-all duration-200 border border-transparent",
									"hover:bg-blue/10 hover:border-blue/20",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									active && "bg-blue/10 border-[#0f5384]/30 shadow-sm",
								)}
							>
								<SectionIcon
									header={section.header}
									iconSrc={section.iconSrc}
									renderSectionIcon={renderSectionIcon}
								/>
							</button>
						</HoverCardTrigger>
						<HoverCardContent
							side="right"
							align="start"
							sideOffset={12}
							className="z-50 w-auto border-0 bg-transparent p-0 shadow-none"
						>
							<SidebarSectionFlyout
								sectionHeader={section.header}
								items={section.items}
								isViewer={isViewer}
								shouldShowLock={shouldShowLock}
								rootException={rootException}
							/>
						</HoverCardContent>
					</HoverCard>
				);
			})}
		</nav>
	);
}
