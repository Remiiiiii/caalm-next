import { fireEvent, render, screen } from "@testing-library/react";
import {
	Position,
	ReactFlow,
	ReactFlowProvider,
} from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";
import { AssignmentGraphEdge } from "@/components/users/AssignmentGraphEdge";

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("AssignmentGraphEdge", () => {
	it("cuts the connection on pointer down of the scissors", () => {
		const onDisconnect = vi.fn();
		render(
			<div style={{ width: 400, height: 200 }}>
				<ReactFlowProvider>
					<ReactFlow
						nodes={[]}
						edges={[]}
						fitView
					>
						<svg>
							<AssignmentGraphEdge
								id="e-admin-jimmy"
								source="victor"
								target="jimmy"
								sourceX={10}
								sourceY={40}
								targetX={180}
								targetY={40}
								sourcePosition={Position.Right}
								targetPosition={Position.Left}
								markerEnd={undefined}
								markerStart={undefined}
								label={undefined}
								labelStyle={undefined}
								labelShowBg
								labelBgStyle={undefined}
								labelBgPadding={undefined}
								labelBgBorderRadius={undefined}
								data={{
									kind: "admin",
									canEditGraph: true,
									onDisconnect,
								}}
								selected
								selectable
								deletable
								pathOptions={undefined}
							/>
						</svg>
					</ReactFlow>
				</ReactFlowProvider>
			</div>,
		);

		const button = screen.getByRole("button", {
			name: "Disconnect assignment",
		});
		expect(button).not.toHaveTextContent("Disconnect");
		expect(button.className).toContain("bg-red/10");
		fireEvent.pointerDown(button);
		expect(onDisconnect).toHaveBeenCalledTimes(1);

		fireEvent.click(button);
		expect(onDisconnect).toHaveBeenCalledTimes(2);
	});

	it("hides the disconnect badge on dashed matrix edges", () => {
		const onDisconnect = vi.fn();
		render(
			<div style={{ width: 400, height: 200 }}>
				<ReactFlowProvider>
					<ReactFlow nodes={[]} edges={[]} fitView>
						<svg>
							<AssignmentGraphEdge
								id="m-coo-cfo"
								source="coo"
								target="cfo"
								sourceX={10}
								sourceY={40}
								targetX={180}
								targetY={40}
								sourcePosition={Position.Bottom}
								targetPosition={Position.Top}
								markerEnd={undefined}
								markerStart={undefined}
								label={undefined}
								labelStyle={undefined}
								labelShowBg
								labelBgStyle={undefined}
								labelBgPadding={undefined}
								labelBgBorderRadius={undefined}
								data={{
									kind: "admin",
									canEditGraph: true,
									onDisconnect,
									dashed: true,
								}}
								selected
								selectable
								deletable
								pathOptions={undefined}
							/>
						</svg>
					</ReactFlow>
				</ReactFlowProvider>
			</div>,
		);

		expect(
			screen.queryByRole("button", { name: "Disconnect assignment" }),
		).not.toBeInTheDocument();
	});

	it("moves the scissors along the edge to the pointer", () => {
		const { container } = render(
			<div style={{ width: 400, height: 200 }}>
				<ReactFlowProvider>
					<ReactFlow nodes={[]} edges={[]} fitView>
						<svg>
							<AssignmentGraphEdge
								id="e-admin-jimmy"
								source="victor"
								target="jimmy"
								sourceX={10}
								sourceY={40}
								targetX={180}
								targetY={40}
								sourcePosition={Position.Right}
								targetPosition={Position.Left}
								markerEnd={undefined}
								markerStart={undefined}
								label={undefined}
								labelStyle={undefined}
								labelShowBg
								labelBgStyle={undefined}
								labelBgPadding={undefined}
								labelBgBorderRadius={undefined}
								data={{
									kind: "admin",
									canEditGraph: true,
									onDisconnect: vi.fn(),
								}}
								selected
								selectable
								deletable
								pathOptions={undefined}
							/>
						</svg>
					</ReactFlow>
				</ReactFlowProvider>
			</div>,
		);

		const hitPath = container.querySelector("path.cursor-pointer");
		expect(hitPath).toBeTruthy();
		const before = screen.getByRole("button", {
			name: "Disconnect assignment",
		}).parentElement;
		const startX = Number(before?.getAttribute("data-cut-x"));

		fireEvent.mouseMove(hitPath as Element, { clientX: 28, clientY: 40 });

		const after = screen.getByRole("button", {
			name: "Disconnect assignment",
		}).parentElement;
		const nextX = Number(after?.getAttribute("data-cut-x"));
		expect(nextX).not.toBe(startX);
		expect(nextX).toBeLessThan(startX);
	});
});
