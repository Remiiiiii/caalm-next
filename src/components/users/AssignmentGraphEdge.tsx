"use client";

import {
	BaseEdge,
	EdgeLabelRenderer,
	getBezierPath,
	useReactFlow,
	type Edge,
	type EdgeProps,
} from "@xyflow/react";
import { Scissors } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	ADMIN_ASSIGN_COLOR,
	SYSTEM_ASSIGN_COLOR,
	type AssignmentEdgeKind,
} from "@/lib/users/assignment-graph";
import { cutPositionAlongEdge } from "@/lib/users/edge-cut-position";

export type AssignmentGraphEdgeData = {
	kind: AssignmentEdgeKind;
	canEditGraph: boolean;
	onDisconnect: () => void;
	dashed?: boolean;
};

export type AssignmentGraphEdgeType = Edge<AssignmentGraphEdgeData, "assignment">;

function stopFlowEvent(event: { preventDefault: () => void; stopPropagation: () => void }) {
	event.preventDefault();
	event.stopPropagation();
}

export function AssignmentGraphEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
	selected,
}: EdgeProps<AssignmentGraphEdgeType>) {
	const { screenToFlowPosition } = useReactFlow();
	const [hovered, setHovered] = useState(false);
	const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	});
	const [cutPos, setCutPos] = useState<{ x: number; y: number } | null>(null);
	const color =
		data?.kind === "admin" ? ADMIN_ASSIGN_COLOR : SYSTEM_ASSIGN_COLOR;
	const canEdit = Boolean(data?.canEditGraph) && !data?.dashed;
	const showCut = canEdit && (hovered || selected);
	const cutX = cutPos?.x ?? labelX;
	const cutY = cutPos?.y ?? labelY;

	const placeCutAtPointer = (clientX: number, clientY: number) => {
		const pointer = screenToFlowPosition({ x: clientX, y: clientY });
		setCutPos(
			cutPositionAlongEdge(edgePath, pointer, { x: labelX, y: labelY }),
		);
	};

	useEffect(() => {
		return () => {
			if (leaveTimer.current) clearTimeout(leaveTimer.current);
		};
	}, []);

	const setHover = (next: boolean) => {
		if (leaveTimer.current) {
			clearTimeout(leaveTimer.current);
			leaveTimer.current = null;
		}
		if (next) {
			setHovered(true);
			return;
		}
		// Keep the badge up long enough to move from the line onto it.
		leaveTimer.current = setTimeout(() => setHovered(false), 280);
	};

	const cutConnection = (
		event: { preventDefault: () => void; stopPropagation: () => void },
	) => {
		stopFlowEvent(event);
		if (!canEdit) return;
		setHovered(false);
		data?.onDisconnect();
	};

	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				interactionWidth={24}
				style={{
					stroke: color,
					strokeWidth: data?.dashed
						? selected || hovered
							? 3
							: 2.25
						: selected || hovered
							? 2.5
							: 1.75,
					strokeDasharray: data?.dashed ? "18 12" : "none",
				}}
			/>
			{canEdit ? (
				<path
					d={edgePath}
					fill="none"
					stroke="transparent"
					strokeWidth={24}
					className="cursor-pointer"
					style={{ pointerEvents: "stroke", vectorEffect: "non-scaling-stroke" }}
					onMouseEnter={(event) => {
						setHover(true);
						placeCutAtPointer(event.clientX, event.clientY);
					}}
					onMouseMove={(event) => {
						placeCutAtPointer(event.clientX, event.clientY);
					}}
					onMouseLeave={() => setHover(false)}
				/>
			) : null}
			{showCut ? (
				<EdgeLabelRenderer>
					<div
						className="nodrag nopan nowheel"
						data-cut-x={cutX}
						data-cut-y={cutY}
						style={{
							position: "absolute",
							transform: `translate(-50%, -50%) translate(${cutX}px, ${cutY}px)`,
							pointerEvents: "all",
							zIndex: 1001,
						}}
						onMouseEnter={() => setHover(true)}
						onMouseMove={(event) => {
							placeCutAtPointer(event.clientX, event.clientY);
						}}
						onMouseLeave={() => setHover(false)}
					>
						<button
							type="button"
							aria-label="Disconnect assignment"
							className="nodrag nopan nowheel inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-red/20 bg-red/10 text-red shadow-sm transition-all duration-200 hover:border-red/30 hover:bg-red/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
							onPointerDown={cutConnection}
							onPointerUp={stopFlowEvent}
							onMouseDown={stopFlowEvent}
							onClick={cutConnection}
						>
							<Scissors className="h-3 w-3" aria-hidden />
						</button>
					</div>
				</EdgeLabelRenderer>
			) : null}
		</>
	);
}
