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
	const showScissors = canEdit && (hovered || selected);
	const scissorsX = cutPos?.x ?? labelX;
	const scissorsY = cutPos?.y ?? labelY;

	const placeScissorsAtPointer = (clientX: number, clientY: number) => {
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
					strokeWidth: selected || hovered ? 2.5 : 1.75,
					strokeDasharray: data?.dashed ? "6 4" : "none",
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
						placeScissorsAtPointer(event.clientX, event.clientY);
					}}
					onMouseMove={(event) => {
						placeScissorsAtPointer(event.clientX, event.clientY);
					}}
					onMouseLeave={() => setHover(false)}
				/>
			) : null}
			{showScissors ? (
				<EdgeLabelRenderer>
					<div
						className="nodrag nopan nowheel"
						data-cut-x={scissorsX}
						data-cut-y={scissorsY}
						style={{
							position: "absolute",
							transform: `translate(-50%, -50%) translate(${scissorsX}px, ${scissorsY}px)`,
							pointerEvents: "all",
							zIndex: 1001,
						}}
						onMouseEnter={() => setHover(true)}
						onMouseMove={(event) => {
							placeScissorsAtPointer(event.clientX, event.clientY);
						}}
						onMouseLeave={() => setHover(false)}
					>
						<div className="relative flex h-7 w-7 items-center justify-center">
							<span className="absolute bottom-full mb-1 whitespace-nowrap rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-white">
								Disconnect
							</span>
							<button
								type="button"
								title="Disconnect"
								aria-label="Disconnect assignment"
								className="nodrag nopan nowheel flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[#0f5384] text-white shadow-md transition-colors duration-200 hover:bg-[#0c436a]"
								onPointerDown={cutConnection}
								onPointerUp={stopFlowEvent}
								onMouseDown={stopFlowEvent}
								onClick={cutConnection}
							>
								<Scissors className="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				</EdgeLabelRenderer>
			) : null}
		</>
	);
}
