import { describe, expect, it } from "vitest";
import {
	buildCreateClauseData,
	buildListQueries,
	planClauseArchive,
	planClauseUpdate,
} from "./clause-library.service";
import type { Clause } from "@/types/clauses";

function clause(overrides: Partial<Clause> = {}): Clause {
	return {
		$id: "clause_1",
		$createdAt: "2026-08-01T00:00:00.000Z",
		$updatedAt: "2026-08-01T00:00:00.000Z",
		orgId: "org_a",
		familyId: "family_1",
		version: 1,
		isCurrent: true,
		title: "Confidentiality",
		category: "confidentiality",
		body: "Each party shall keep confidential information secret.",
		status: "draft",
		createdBy: "user_1",
		updatedBy: "user_1",
		...overrides,
	};
}

describe("clause library versioning", () => {
	it("creates version 1 as the current draft", () => {
		const data = buildCreateClauseData(
			{
				title: "Payment terms",
				category: "payment",
				body: "Invoices are due in 30 days.",
			},
			{ orgId: "org_a", userId: "user_1", familyId: "family_new" },
		);

		expect(data).toMatchObject({
			orgId: "org_a",
			familyId: "family_new",
			version: 1,
			isCurrent: true,
			status: "draft",
			createdBy: "user_1",
			updatedBy: "user_1",
		});
	});

	it("updates a draft in place without bumping version", () => {
		const plan = planClauseUpdate(
			clause({ status: "draft" }),
			{ body: "Updated draft body." },
			"user_2",
		);

		expect(plan.mode).toBe("in-place");
		if (plan.mode !== "in-place") return;
		expect(plan.rowId).toBe("clause_1");
		expect(plan.patch.body).toBe("Updated draft body.");
		expect(plan.patch.updatedBy).toBe("user_2");
		expect(plan.patch).not.toHaveProperty("version");
		expect(plan.patch).not.toHaveProperty("familyId");
	});

	it("publishes a draft in place", () => {
		const plan = planClauseUpdate(
			clause({ status: "draft" }),
			{ status: "active" },
			"user_1",
		);
		expect(plan.mode).toBe("in-place");
		if (plan.mode !== "in-place") return;
		expect(plan.patch.status).toBe("active");
	});

	it("creates a new version when an active clause is edited", () => {
		const plan = planClauseUpdate(
			clause({ status: "active", version: 1, isCurrent: true }),
			{ body: "New published wording.", changeNote: "Tightened NDA scope" },
			"user_2",
		);

		expect(plan.mode).toBe("version-bump");
		if (plan.mode !== "version-bump") return;
		expect(plan.previousPatch.isCurrent).toBe(false);
		expect(plan.next).toMatchObject({
			familyId: "family_1",
			orgId: "org_a",
			version: 2,
			isCurrent: true,
			body: "New published wording.",
			changeNote: "Tightened NDA scope",
			createdBy: "user_1",
			updatedBy: "user_2",
		});
	});

	it("archives by clearing isCurrent instead of deleting", () => {
		const plan = planClauseArchive(
			clause({ status: "active", isCurrent: true }),
			"user_2",
		);
		expect(plan.patch).toEqual({
			status: "archived",
			isCurrent: false,
			updatedBy: "user_2",
		});
	});

	it("lists archived rows without the current-only filter", () => {
		const queries = buildListQueries({
			orgId: "org_a",
			status: "archived",
			currentOnly: false,
		});
		expect(queries.join(" ")).not.toContain("isCurrent");
		expect(queries.join(" ")).toContain("archived");
	});

	it("scopes every list query to the caller org", () => {
		const queries = buildListQueries({ orgId: "org_a" });
		expect(queries[0]).toContain("org_a");
		expect(queries.some((q) => q.includes("org_b"))).toBe(false);

		const otherOrg = buildListQueries({ orgId: "org_b", familyId: "family_1" });
		expect(otherOrg[0]).toContain("org_b");
		expect(otherOrg.some((q) => q.includes('"family_1"') || q.includes("family_1"))).toBe(
			true,
		);
	});
});
