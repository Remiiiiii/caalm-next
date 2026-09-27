import { describe, expect, it } from "vitest";
import {
	assignmentWouldCycle,
	buildReassignUserPatch,
} from "@/lib/users/reassign-assigner";
import { SYSTEM_NODE_ID, wouldCreateCycle } from "@/lib/users/assignment-graph";

describe("buildReassignUserPatch", () => {
	it("copies department and division from the assigner", () => {
		const { patch, skippedManager } = buildReassignUserPatch({
			assignerIsSystem: false,
			assignerUserId: "user-c",
			assignerDepartment: "IT",
			assignerDivision: "Help Desk",
			managerSource: "scim",
		});
		expect(patch.department).toBe("IT");
		expect(patch.division).toBe("Help Desk");
		expect(patch.managerUserId).toBeUndefined();
		expect(skippedManager).toBe(true);
	});

	it("sets managerUserId only when source is manual", () => {
		const { patch, skippedManager } = buildReassignUserPatch({
			assignerIsSystem: false,
			assignerUserId: "user-c",
			assignerDepartment: "IT",
			managerSource: "manual",
		});
		expect(patch.managerUserId).toBe("user-c");
		expect(skippedManager).toBe(false);
	});

	it("clears managerUserId on disconnect when source is manual", () => {
		const { patch } = buildReassignUserPatch({
			assignerIsSystem: true,
			assignerUserId: SYSTEM_NODE_ID,
			managerSource: "manual",
		});
		expect(patch.department).toBeUndefined();
		expect(patch.managerUserId).toBeNull();
	});

	it("overwrites inbound assignedBy as a single value", () => {
		// Connecting B → C replaces B's one assignedBy; a second inbound cannot exist.
		const { patch } = buildReassignUserPatch({
			assignerIsSystem: false,
			assignerUserId: "user-c",
			assignerDepartment: "Finance",
			assignerDivision: "AP",
			managerSource: "manual",
		});
		expect(patch.department).toBe("Finance");
		expect(patch.division).toBe("AP");
		expect(patch.managerUserId).toBe("user-c");
	});

	it("does not touch managerUserId when source is unset", () => {
		const { patch, skippedManager } = buildReassignUserPatch({
			assignerIsSystem: false,
			assignerUserId: "user-c",
			assignerDepartment: "IT",
			managerSource: undefined,
		});
		expect(patch.managerUserId).toBeUndefined();
		expect(skippedManager).toBe(true);
	});
});

describe("assignmentWouldCycle", () => {
	it("rejects A → B when B already assigns A", () => {
		const parentOf = new Map([
			["b", "a"],
			["c", "b"],
		]);
		expect(assignmentWouldCycle("a", "c", parentOf)).toBe(true);
	});

	it("allows connecting to a sibling chain", () => {
		const parentOf = new Map([
			["b", "a"],
			["c", "a"],
		]);
		expect(assignmentWouldCycle("c", "b", parentOf)).toBe(false);
	});

	it("rejects assigning a user to themselves", () => {
		expect(assignmentWouldCycle("a", "a", new Map())).toBe(true);
	});

	it("never cycles when the assigner is system", () => {
		const parentOf = new Map([["b", "a"]]);
		expect(assignmentWouldCycle("a", SYSTEM_NODE_ID, parentOf)).toBe(false);
	});
});

describe("wouldCreateCycle", () => {
	it("detects a loop walking up the assigner chain", () => {
		const parentOf = new Map([
			["b", "a"],
			["c", "b"],
		]);
		expect(wouldCreateCycle("c", "a", parentOf)).toBe(true);
		expect(wouldCreateCycle("a", "c", parentOf)).toBe(false);
	});
});
