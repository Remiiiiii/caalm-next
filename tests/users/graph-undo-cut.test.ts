import { describe, expect, it } from "vitest";
import {
	isUndoLastCutHotkey,
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
