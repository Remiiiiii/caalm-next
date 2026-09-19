import { describe, expect, it } from "vitest";
import {
	isUndoLastCutHotkey,
	lastGraphMoveFromDrag,
	lastSolidInboundCut,
	withCutLineage,
} from "@/lib/users/graph-undo-cut";

describe("graph undo cut", () => {
	it("records the solid inbound edge, not a dashed matrix line", () => {
		const cut = lastSolidInboundCut(
			[
				{
					source: "matrix-boss",
					target: "priya",
					data: { dashed: true },
				},
				{ source: "john", target: "priya", data: { dashed: false } },
			],
			"priya",
		);
		expect(cut).toEqual({
			targetUserId: "priya",
			sourceId: "john",
			lineage: "reporting",
		});
		expect(withCutLineage(cut!, "assignment").lineage).toBe("assignment");
	});

	it("returns null when there is no solid edge to restore", () => {
		expect(
			lastSolidInboundCut(
				[{ source: "a", target: "b", data: { dashed: true } }],
				"b",
			),
		).toBeNull();
	});

	it("skips layout-only Super Admin hoist lines", () => {
		expect(
			lastSolidInboundCut(
				[
					{
						source: "super-admin",
						target: "orphan",
						data: { canEditGraph: false },
					},
				],
				"orphan",
			),
		).toBeNull();
	});

	it("records only cards that actually moved in a drag", () => {
		const starts = new Map([
			["priya", { x: 10, y: 20 }],
			["john", { x: 40, y: 50 }],
		]);
		expect(
			lastGraphMoveFromDrag(
				starts,
				[
					{ id: "priya", position: { x: 80, y: 20 } },
					{ id: "john", position: { x: 40, y: 50 } },
				],
				"reporting",
				"tb",
			),
		).toEqual({
			nodes: [{ id: "priya", from: { x: 10, y: 20 } }],
			lineage: "reporting",
			orientation: "tb",
		});
		expect(
			lastGraphMoveFromDrag(
				starts,
				[{ id: "priya", position: { x: 10, y: 20 } }],
				"reporting",
				"ltr",
			),
		).toBeNull();
	});

	it("records every card in a multi-select drag", () => {
		const starts = new Map([
			["priya", { x: 0, y: 0 }],
			["john", { x: 8, y: 8 }],
		]);
		const move = lastGraphMoveFromDrag(
			starts,
			[
				{ id: "priya", position: { x: 4, y: 0 } },
				{ id: "john", position: { x: 12, y: 8 } },
			],
			"assignment",
			"ltr",
		);
		expect(move?.nodes).toEqual([
			{ id: "priya", from: { x: 0, y: 0 } },
			{ id: "john", from: { x: 8, y: 8 } },
		]);
	});

	it("matches Ctrl+Z and Cmd+Z outside of text fields", () => {
		expect(
			isUndoLastCutHotkey({
				key: "z",
				ctrlKey: true,
				metaKey: false,
				altKey: false,
				shiftKey: false,
				defaultPrevented: false,
				target: document.body,
			}),
		).toBe(true);
		expect(
			isUndoLastCutHotkey({
				key: "z",
				ctrlKey: false,
				metaKey: true,
				altKey: false,
				shiftKey: false,
				defaultPrevented: false,
				target: document.body,
			}),
		).toBe(true);
	});

	it("ignores Ctrl+Shift+Z, Alt, and typing in an input", () => {
		const input = document.createElement("input");
		expect(
			isUndoLastCutHotkey({
				key: "z",
				ctrlKey: true,
				metaKey: false,
				altKey: false,
				shiftKey: true,
				defaultPrevented: false,
				target: document.body,
			}),
		).toBe(false);
		expect(
			isUndoLastCutHotkey({
				key: "z",
				ctrlKey: true,
				metaKey: false,
				altKey: false,
				shiftKey: false,
				defaultPrevented: false,
				target: input,
			}),
		).toBe(false);
	});
});
