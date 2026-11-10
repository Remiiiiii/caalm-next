import { describe, expect, it } from "vitest";
import { parseUserProfileRename } from "./parseUserProfileUpdate";

describe("parseUserProfileRename", () => {
	it("parses change username X to Y", () => {
		expect(
			parseUserProfileRename(
				"Change username Blair Montgomery to Blair Rodriguez",
			),
		).toEqual({
			lookup: "Blair Montgomery",
			fullName: "Blair Rodriguez",
		});
	});

	it("parses rename X to Y", () => {
		expect(parseUserProfileRename("rename Alice Example to Alice New")).toEqual(
			{
				lookup: "Alice Example",
				fullName: "Alice New",
			},
		);
	});

	it("parses change X's name to Y", () => {
		expect(
			parseUserProfileRename("change Blair Montgomery's name to Blair Rodriguez"),
		).toEqual({
			lookup: "Blair Montgomery",
			fullName: "Blair Rodriguez",
		});
	});

	it("returns null when there is no rename shape", () => {
		expect(parseUserProfileRename("list users named Blair")).toBeNull();
		expect(parseUserProfileRename("Change username Blair to Blair")).toBeNull();
	});
});
