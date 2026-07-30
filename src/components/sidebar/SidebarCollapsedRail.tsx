"use client";

import { usePathname } from "next/navigation";
import SidebarSectionFlyout, {
	type FlyoutNavItem,
} from "@/components/sidebar/SidebarSectionFlyout";
import { SectionNavIcon } from "@/components/sidebar/SectionNavIcon";
import { isSectionActive } from "@/components/sidebar/sidebar-icons";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { NavigationItem } from "@/constants/navigation-permissions";
import { sectionTourId } from "@/lib/demo/tour/sectionTourId";
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
};

export default function SidebarCollapsedRail({
	sections,
	isViewer = false,
	shouldShowLock,
	rootException,
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
								data-tour={sectionTourId(section.header)}
								className={cn(
									"sidebar-rail-icon flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer",
									"transition-all duration-200 border border-transparent",
									"hover:bg-blue/10 hover:border-blue/20",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									active && "bg-blue/10 border-[#0f5384]/30 shadow-sm",
								)}
							>
								<SectionNavIcon
									header={section.header}
									iconSrc={section.iconSrc}
									priority={
										section.header === "Dashboard" ||
										section.header === "Calendar"
									}
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
