import { describe, expect, it } from "vitest";
import { guessUserImportField } from "@/lib/users/import/fields";
import {
	applyUserColumnMapping,
	normalizeInviteRoleName,
} from "@/lib/users/import/parse";

describe("user invite import mapping", () => {
	it("guesses user headers and legacy role names", () => {
		expect(guessUserImportField("full_name")).toBe("name");
		expect(normalizeInviteRoleName("manager")).toBe("Department Manager");
	});

	it("rejects invalid emails and missing roles", () => {
		const { valid, errors } = applyUserColumnMapping(
			[
				{
					name: "Alex Rivera",
					email: "alex@example.org",
					role: "Viewer",
				},
				{ name: "Bad", email: "not-an-email", role: "Viewer" },
				{ name: "No role", email: "pat@example.org", role: "" },
			],
			{ name: "name", email: "email", role: "role" },
		);
		expect(valid).toHaveLength(1);
		expect(valid[0]?.email).toBe("alex@example.org");
		expect(errors).toHaveLength(2);
	});
});
