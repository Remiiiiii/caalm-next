import { describe, expect, it } from "vitest";
import {
	formatInvitePeopleLine,
	inviteDraftIsReady,
	parseInviteDraft,
} from "@/lib/assistant/parseInviteDraft";

describe("parseInviteDraft", () => {
	it("parses multi-name directory invite wording", () => {
		const draft = parseInviteDraft(
			"send and invite to Nora Castillo and Robin Shaw from the connected directory",
		);
		expect(draft.nameHints).toEqual(
			expect.arrayContaining(["Nora Castillo", "Robin Shaw"]),
		);
		expect(draft.emails).toEqual([]);
	});

	it("strips trailing period from a typed name", () => {
		const draft = parseInviteDraft("invite Chris Vale.");
		expect(draft.nameHints).toEqual(["Chris Vale"]);
	});

	it("parses form reply lines", () => {
		const draft = parseInviteDraft(
			[
				"People: Nora Castillo <cao.chart@example.com>, Robin Shaw <csuite3.chart@example.com>",
				"Role: Viewer",
				"Department: Administration",
				"Division: c-suite",
			].join("\n"),
		);
		expect(draft.emails).toEqual([
			"cao.chart@example.com",
			"csuite3.chart@example.com",
		]);
		expect(draft.role).toBe("Viewer");
		expect(draft.department).toBe("Administration");
		expect(draft.division).toBe("c-suite");
		expect(inviteDraftIsReady(draft)).toBe(true);
	});

	it("parses single-person form label", () => {
		const draft = parseInviteDraft(
			[
				"Person: Nora Castillo <cao.chart@example.com>",
				"Role: Executive",
				"Department: Executive",
			].join("\n"),
		);
		expect(draft.emails).toEqual(["cao.chart@example.com"]);
		expect(draft.nameHints).toEqual(["Nora Castillo"]);
		expect(draft.role).toBe("Executive");
	});

	it("formats people line for the invite form", () => {
		expect(
			formatInvitePeopleLine([
				{ fullName: "Nora Castillo", email: "cao.chart@example.com" },
			]),
		).toBe("Nora Castillo (cao.chart@example.com)");
	});
});
