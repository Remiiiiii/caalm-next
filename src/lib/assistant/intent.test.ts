import { describe, expect, it } from "vitest";
import {
	detectDataIntent,
	parseDepartmentFilter,
} from "@/lib/assistant/intent";

describe("detectDataIntent", () => {
	it("routes department catalog asks to list_departments, not list_users", () => {
		expect(
			detectDataIntent("list the departments in the organization"),
		).toBe("list_departments");
		expect(detectDataIntent("What departments do we have?")).toBe(
			"list_departments",
		);
		expect(detectDataIntent("show available departments")).toBe(
			"list_departments",
		);
	});

	it("routes people-in-department asks to list_users, not list_departments", () => {
		expect(detectDataIntent("list all users in the IT department")).toBe(
			"list_users",
		);
		expect(detectDataIntent("show people in Finance")).toBe("list_users");
		expect(detectDataIntent("who is in the Legal department")).toBe(
			"list_users",
		);
	});

	it("still routes people list asks to list_users", () => {
		expect(detectDataIntent("list the users in the organization")).toBe(
			"list_users",
		);
		expect(detectDataIntent("show people in the directory")).toBe(
			"list_users",
		);
	});

	it("routes role catalog asks to list_roles", () => {
		expect(detectDataIntent("list the roles in the organization")).toBe(
			"list_roles",
		);
		expect(detectDataIntent("what roles do we have?")).toBe("list_roles");
	});
});

describe("parseDepartmentFilter", () => {
	it("reads a department from a people-list ask", () => {
		expect(parseDepartmentFilter("list all users in the IT department")).toBe(
			"IT",
		);
		expect(parseDepartmentFilter("show people in Finance")).toBe("Finance");
		expect(parseDepartmentFilter("who is in Legal")).toBe("Legal");
	});

	it("returns undefined when no department is named", () => {
		expect(parseDepartmentFilter("list all users")).toBeUndefined();
		expect(
			parseDepartmentFilter("list the departments in the organization"),
		).toBeUndefined();
	});
});
