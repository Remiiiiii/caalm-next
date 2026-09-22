import { describe, expect, it } from "vitest";
import {
	assigneeFallbackMessage,
	pickAssigneeIds,
} from "./resolve-default-assignee";

describe("pickAssigneeIds", () => {
	it("keeps an explicit selection", () => {
		const pick = pickAssigneeIds({
			selectedIds: ["mgr-1"],
			departmentCandidates: [{ $id: "mgr-2" }],
		});
		expect(pick.ids).toEqual(["mgr-1"]);
		expect(pick.source).toBe("selected");
	});

	it("prefers a manager in the chosen division", () => {
		const pick = pickAssigneeIds({
			division: "sales",
			divisionCandidates: [
				{ $id: "legal-1", division: "legal" },
				{ $id: "sales-1", division: "sales" },
			],
			departmentCandidates: [{ $id: "dept-1" }],
		});
		expect(pick.ids).toEqual(["sales-1"]);
		expect(pick.source).toBe("division");
	});

	it("falls back to the department when the division is empty", () => {
		const pick = pickAssigneeIds({
			division: "sales",
			divisionCandidates: [{ $id: "legal-1", division: "legal" }],
			departmentCandidates: [{ $id: "dept-1", fullName: "Dana Chen" }],
		});
		expect(pick.ids).toEqual(["dept-1"]);
		expect(pick.source).toBe("department");
		expect(assigneeFallbackMessage(pick.source, "Dana Chen")).toContain(
			"Dana Chen",
		);
	});

	it("falls back to the uploader when no managers exist", () => {
		const pick = pickAssigneeIds({
			division: "sales",
			fallbackUser: { $id: "me", fullName: "You" },
		});
		expect(pick.ids).toEqual(["me"]);
		expect(pick.source).toBe("uploader");
	});
});
