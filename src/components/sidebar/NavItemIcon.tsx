"use client";

import { LayoutTemplate } from "lucide-react";
import Image from "next/image";
import {
	ITEM_ICONS,
	NAV_ICON_FILL_GREY,
} from "@/components/sidebar/sidebar-icons";

type NavItemIconProps = {
	name: string;
	width?: number;
	height?: number;
	priority?: boolean;
};

export function ContractTemplatesNavIcon({ size = 20 }: { size?: number }) {
	return (
		<LayoutTemplate
			className="shrink-0"
			size={size}
			fill={NAV_ICON_FILL_GREY}
			stroke={NAV_ICON_FILL_GREY}
			strokeWidth={1}
			aria-hidden
		/>
	);
}

function DocumentsNavIcon({ height }: { height: number }) {
	return (
		<svg
			viewBox="4 2 16 20"
			fill="none"
			className="shrink-0 max-w-none"
			style={{ width: "auto", height: `${height}px` }}
			aria-hidden
		>
			<path
				fill={NAV_ICON_FILL_GREY}
				stroke={NAV_ICON_FILL_GREY}
				strokeWidth={0}
				strokeLinejoin="round"
				paintOrder="stroke fill"
				d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8h-6a2 2 0 0 1-2-2V2z"
			/>
			<path
				stroke="white"
				strokeWidth="1.75"
				strokeLinecap="round"
				d="M8 13h8M8 17h8"
			/>
		</svg>
	);
}

export function NavItemIcon({
	name,
	width = 20,
	height = 20,
	priority = false,
}: NavItemIconProps) {
	if (name === "Documents") {
		return <DocumentsNavIcon height={height} />;
	}
	if (name === "Contract Templates") {
		return <ContractTemplatesNavIcon size={height} />;
	}
	const iconConfig = ITEM_ICONS[name];
	if (!iconConfig?.src) return null;

	// Static PNGs from /public bypass next/image so the exact file is shown (no optimizer cache).
	if (iconConfig.src.endsWith(".png")) {
		return (
			<img
				src={iconConfig.src}
				alt=""
				width={width}
				height={height}
				className="shrink-0 max-w-none"
				style={{ width: "auto", height: `${height}px` }}
			/>
		);
	}

	return (
		<Image
			src={iconConfig.src}
			alt=""
			width={width}
			height={height}
			priority={priority}
			fetchPriority={priority ? "high" : "auto"}
			loading={priority ? undefined : "lazy"}
			className="shrink-0 max-w-none"
			style={{ width: "auto", height: `${height}px` }}
		/>
	);
}
