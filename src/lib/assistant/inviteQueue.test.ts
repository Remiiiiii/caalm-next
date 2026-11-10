import { describe, expect, it } from "vitest";
import { completedEmailsFromInviteArgs } from "@/lib/assistant/inviteQueue";

describe("completedEmailsFromInviteArgs", () => {
	it("reads a single invite_user email", () => {
		expect(
			completedEmailsFromInviteArgs({
				email: "Nora@Example.com",
				name: "Nora",
			}),
		).toEqual(["nora@example.com"]);
	});

	it("reads invite_users invitees and invitees_json", () => {
		expect(
			completedEmailsFromInviteArgs({
				invitees: [{ email: "a@x.com", name: "A" }],
				invitees_json: JSON.stringify([
					{ email: "a@x.com", name: "A" },
					{ email: "b@x.com", name: "B" },
				]),
			}),
		).toEqual(["a@x.com", "b@x.com"]);
	});
});
