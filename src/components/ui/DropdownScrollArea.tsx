"use client";

/**
 * Dropdown / popover lists — OverlayScrollbars paints a button-free bar.
 * Native Windows/Chromium scrollbars keep triangle arrows; this replaces them.
 */
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const DROPDOWN_OS_OPTIONS = {
	overflow: {
		x: "hidden" as const,
		y: "scroll" as const,
	},
	scrollbars: {
		theme: "os-theme-dark",
		visibility: "auto" as const,
		autoHide: "leave" as const,
		autoHideDelay: 800,
		dragScroll: true,
	},
};

export function DropdownScrollArea({
	children,
	className,
	maxHeightClassName = "max-h-72",
}: {
	children: ReactNode;
	className?: string;
	maxHeightClassName?: string;
}) {
	return (
		<OverlayScrollbarsComponent
			defer
			options={DROPDOWN_OS_OPTIONS}
			className={cn("w-full", maxHeightClassName, className)}
		>
			{children}
		</OverlayScrollbarsComponent>
	);
}
