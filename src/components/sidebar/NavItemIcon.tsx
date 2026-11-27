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

function DocumentsNavIcon({
	width,
	height,
}: {
	width: number;
	height: number;
}) {
	return (
		<Image
			src="/assets/icons/files-documents.svg"
			alt="Documents"
			width={20}
			height={20}
			className="shrink-0 max-w-none object-contain"
		/>
	);
}

export function NavItemIcon({
	name,
	width = 15,
	height = 15,
	priority = false,
}: NavItemIconProps) {
	if (name === "Documents") {
		return <DocumentsNavIcon width={width} height={height} />;
	}
	if (name === "Contract Templates") {
		return <ContractTemplatesNavIcon size={height} />;
	}

	// All SVG/PNG nav icons go through ITEM_ICONS so they share the same
	// eager/priority loading path and paint together on first paint.
	const iconConfig = ITEM_ICONS[name];
	if (!iconConfig?.src) return null;

	const resolvedWidth = iconConfig.width ?? width;
	const resolvedHeight = iconConfig.height ?? height;
	// Keep both style dimensions explicit — width:"auto" alone trips Next's
	// aspect-ratio warning when the SVG is not a perfect square (e.g. calendar3).
	const sizeStyle = {
		width: `${resolvedWidth}px`,
		height: `${resolvedHeight}px`,
	} as const;

	return (
		<Image
			src={iconConfig.src}
			alt=""
			width={resolvedWidth}
			height={resolvedHeight}
			priority={priority || iconConfig.src.endsWith(".png")}
			fetchPriority={
				priority || iconConfig.src.endsWith(".png") ? "high" : "auto"
			}
			loading="eager"
			unoptimized={iconConfig.src.endsWith(".png")}
			className="shrink-0 max-w-none object-contain"
			style={sizeStyle}
		/>
	);
}
