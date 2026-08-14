import { describe, expect, it } from "vitest";
import { isITDepartment } from "@/lib/rbac/it-department";

describe("ticket notification recipient rules", () => {
	it("matches IT department managers by department field", () => {
		expect(isITDepartment({ department: "IT" })).toBe(true);
		expect(isITDepartment({ departmentLabel: "it" })).toBe(true);
		expect(
			isITDepartment({
				department: "Administration",
				departmentLabel: "Administration",
			}),
		).toBe(false);
	});
});
