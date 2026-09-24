import { describe, expect, it } from "vitest";
import {
	DiagramPositionError,
	diagramPositionFields,
} from "@/lib/users/diagram-position";

describe("diagramPositionFields", () => {
	it("writes only x/y and never assignedBy, org, or manager", () => {
		const fields = diagramPositionFields(12.5, -40);
		expect(fields).toEqual({
			diagramPositionX: 12.5,
			diagramPositionY: -40,
		});
		expect(Object.keys(fields).sort()).toEqual([
			"diagramPositionX",
			"diagramPositionY",
		]);
		expect("assignedBy" in fields).toBe(false);
		expect("department" in fields).toBe(false);
		expect("division" in fields).toBe(false);
		expect("managerUserId" in fields).toBe(false);
	});

	it("rejects non-finite coordinates", () => {
		expect(() => diagramPositionFields(Number.NaN, 0)).toThrow(
			DiagramPositionError,
		);
		expect(() => diagramPositionFields(1, Number.POSITIVE_INFINITY)).toThrow(
			DiagramPositionError,
		);
	});
});
