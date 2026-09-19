"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const USER_GRAPH_MIN_ZOOM = 0.05;
export const USER_GRAPH_MAX_ZOOM = 1.5;

const ZOOM_STEP = { duration: 160 };
const FIT_PADDING = 0.18;

function ZoomButton({
	label,
	disabled,
	onClick,
	children,
}: {
	label: string;
	disabled?: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"flex h-8 w-8 cursor-pointer items-center justify-center text-slate-600",
				"transition-colors duration-200 hover:bg-blue-50 hover:text-[#0f5384]",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				"disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600",
			)}
		>
			{children}
		</button>
	);
}

/** Custom + / − / fit controls. Default xyflow Controls sit under other overlays. */
export function UserGraphZoomControls() {
	const { zoomIn, zoomOut, fitView } = useReactFlow();
	const { zoom } = useViewport();
	const atMin = zoom <= USER_GRAPH_MIN_ZOOM + 0.001;
	const atMax = zoom >= USER_GRAPH_MAX_ZOOM - 0.001;

	return (
		<div
			role="group"
			aria-label="Diagram zoom"
			className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-md"
		>
			<ZoomButton
				label="Zoom In"
				disabled={atMax}
				onClick={() => {
					void zoomIn(ZOOM_STEP);
				}}
			>
				<Plus className="h-4 w-4" aria-hidden />
			</ZoomButton>
			<ZoomButton
				label="Zoom Out"
				disabled={atMin}
				onClick={() => {
					void zoomOut(ZOOM_STEP);
				}}
			>
				<Minus className="h-4 w-4" aria-hidden />
			</ZoomButton>
			<div className="h-px bg-slate-200" aria-hidden />
			<ZoomButton
				label="Fit View"
				onClick={() => {
					void fitView({ padding: FIT_PADDING, duration: 280 });
				}}
			>
				<Maximize2 className="h-3.5 w-3.5" aria-hidden />
			</ZoomButton>
		</div>
	);
}
