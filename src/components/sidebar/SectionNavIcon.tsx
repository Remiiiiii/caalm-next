"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { SECTION_ICONS } from "@/components/sidebar/sidebar-icons";

/** Source of truth for expanded + collapsed sidebar section title icons */
export const SECTION_NAV_ICON_SIZE = 22;
export const NAV_SECTION_TEAL = "#03AFBF";

const iconBoxClass = "inline-flex shrink-0 items-center justify-center";
const iconBoxStyle = {
	width: SECTION_NAV_ICON_SIZE,
	height: SECTION_NAV_ICON_SIZE,
} as const;

function SectionIconShell({ children }: { children: ReactNode }) {
	return (
		<span
			className={`${iconBoxClass}`}
			style={{ ...iconBoxStyle, color: NAV_SECTION_TEAL }}
		>
			{children}
		</span>
	);
}

function DashboardSectionIcon() {
	return (
		<svg
			width={SECTION_NAV_ICON_SIZE}
			height={SECTION_NAV_ICON_SIZE}
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

type SectionNavIconProps = {
	header: string;
	/** Optional override for IT / collapsed rail */
	iconSrc?: string;
	priority?: boolean;
};

export function SectionNavIcon({
	header,
	iconSrc,
	priority = false,
}: SectionNavIconProps) {
	if (header === "Dashboard") {
		return (
			<SectionIconShell>
				<DashboardSectionIcon />
			</SectionIconShell>
		);
	}

	const config = SECTION_ICONS[header];
	const src = iconSrc || config?.src;
	if (!src) return null;

	return (
		<span className={iconBoxClass} style={iconBoxStyle}>
			<Image
				src={src}
				alt=""
				width={SECTION_NAV_ICON_SIZE}
				height={SECTION_NAV_ICON_SIZE}
				priority={priority}
				fetchPriority={priority ? "high" : "auto"}
				loading={priority ? undefined : "lazy"}
				className="h-[22px] w-[22px] object-contain"
			/>
		</span>
	);
}
