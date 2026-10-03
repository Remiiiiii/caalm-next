import { describe, expect, it } from "vitest";
import {
	donationPageConfigActorFromUser,
	needsPublisherNameLookup,
} from "@/lib/give/donation-page-config/actor";

describe("donationPageConfigActorFromUser", () => {
	it("prefers fullName over Auth name", () => {
		expect(
			donationPageConfigActorFromUser({
				$id: "u1",
				fullName: "Victor Ramirez",
				name: "",
				email: "victor@example.org",
			}),
		).toEqual({
			userId: "u1",
			userName: "Victor Ramirez",
			userEmail: "victor@example.org",
		});
	});

	it("falls back to email when names are empty", () => {
		expect(
			donationPageConfigActorFromUser({
				$id: "u1",
				fullName: "  ",
				email: "victor@example.org",
			}).userName,
		).toBe("victor@example.org");
	});
});

describe("needsPublisherNameLookup", () => {
	it("flags Unknown and empty names", () => {
		expect(needsPublisherNameLookup("Unknown")).toBe(true);
		expect(needsPublisherNameLookup("")).toBe(true);
		expect(needsPublisherNameLookup("Victor Ramirez")).toBe(false);
	});
});
