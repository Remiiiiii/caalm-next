import { describe, expect, it } from "vitest";
import {
	extractDoneWhenItems,
	extractSpecDescription,
	parseTitle,
} from "./sync-from-github";

describe("parseTitle", () => {
	it("extracts the section number and title", () => {
		expect(parseTitle("TODO 23.1 Sidebar color consistency")).toEqual({
			sectionNumber: 23,
			title: "Sidebar color consistency",
		});
	});

	it("returns null for a non-todo title", () => {
		expect(parseTitle("NPO 3.2 Something else")).toBeNull();
	});
});

// Real body from PR #326 (TODO 21.1 Sidebar color consistency, before it was
// retitled to 23.1 to resolve a section-number collision with PR #324) — the
// parser must handle actually-rendered markdown, not an idealized fixture.
const REAL_PR_BODY = `## Summary
Implement **Match sidebar item and sub-item icon color to text color** on branch \`cursor/todo/21-21.1-sidebar-color-consistency\`.
Board: **Todo Roadmap** (\`?catalog=todo\`), section 21 (\`21.1\`).
Source: Generated from a prompt on the Todo Roadmap page.

## Who / What / Where / Why / When / How

- **Who:** A frontend developer, reviewed by the dashboard design owner
- **What:** Make the icon and the text of every sidebar item and sub-item use one shared color, so the icon never differs from its label
- **Where:** The main sidebar navigation component and its sub-item (nested menu) styles in the IT dashboard
- **Why:** Icons and labels currently render in different colors, which looks inconsistent and makes the active and hover states hard to read
- **When:** Next UI polish pass; no dependencies on other roadmap items
- **How:** Remove hard-coded icon colors, set icons to inherit the label color (CSS currentColor or a shared color variable), and apply the same rule to default, hover, active, and disabled states for both top-level items and sub-items

## Done when

- [ ] For every sidebar item and sub-item, the computed color of the icon equals the computed color of its text in the default, hover, active, and disabled states.
- [ ] No hard-coded icon color values remain in the sidebar styles; icons inherit color from the label or a shared variable.
- [ ] Changing the shared text color variable (or the label color) in one place updates both text and icons in the sidebar and sub-items.
- [ ] The change causes no layout shifts and no regressions in the sidebar in light and dark themes, if both are supported.

## Test plan
- [ ] Roadmap test at \`tests/roadmap/todo/21-1.test.ts\` passes or ships with the feature
- [ ] \`pnpm run test:api-authz\` passes when routes or permissions change
- [ ] Tests and Vercel deploy / Playwright E2E green on this PR before merge`;

describe("extractDoneWhenItems", () => {
	it("pulls the checklist items out of a real PR body", () => {
		const items = extractDoneWhenItems(REAL_PR_BODY);
		expect(items).toHaveLength(4);
		expect(items[0]).toBe(
			"For every sidebar item and sub-item, the computed color of the icon equals the computed color of its text in the default, hover, active, and disabled states.",
		);
	});

	it("returns an empty list when there's no Done when section", () => {
		expect(extractDoneWhenItems("## Summary\nnothing here")).toEqual([]);
	});
});

describe("extractSpecDescription", () => {
	it("reconstructs a Who/What/... description from a real PR body", () => {
		const description = extractSpecDescription(REAL_PR_BODY);
		expect(description).toContain("Who: A frontend developer");
		expect(description).toContain("What: Make the icon and the text");
		expect(description).toContain("How: Remove hard-coded icon colors");
		expect(description).not.toContain("## Done when");
	});
});
