import { describe, expect, it } from "vitest";
import { inviteUsersForm } from "@/lib/assistant/inputForm";
import {
	encodeInvitePersonOption,
	formatInviteNamesForAnswer,
	formatInvitePeopleValue,
	parseInvitePeopleValue,
} from "@/lib/assistant/invitePeopleField";
import { scrubAssistantProse } from "@/lib/assistant/scrubAssistantProse";

describe("invitePeopleField", () => {
	it("round-trips selected people for form submit", () => {
		const people = [
			{ fullName: "Nora Castillo", email: "cao.chart@example.com" },
			{ fullName: "Robin Shaw", email: "csuite3.chart@example.com" },
		];
		const encoded = formatInvitePeopleValue(people);
		expect(parseInvitePeopleValue(encoded)).toEqual([
			{
				fullName: "Nora Castillo",
				email: "cao.chart@example.com",
			},
			{
				fullName: "Robin Shaw",
				email: "csuite3.chart@example.com",
			},
		]);
	});

	it("builds a clickable directory_multi field for bulk invite", () => {
		const form = inviteUsersForm(
			{},
			[
				{ fullName: "Nora Castillo", email: "cao.chart@example.com" },
				{ fullName: "Robin Shaw", email: "csuite3.chart@example.com" },
			],
		);
		const people = form.fields[0]!;
		expect(people.type).toBe("directory_multi");
		expect(people.options).toEqual([
			encodeInvitePersonOption({
				fullName: "Nora Castillo",
				email: "cao.chart@example.com",
			}),
			encodeInvitePersonOption({
				fullName: "Robin Shaw",
				email: "csuite3.chart@example.com",
			}),
		]);
		expect(parseInvitePeopleValue(people.defaultValue ?? "")).toHaveLength(2);
	});

	it("names people for answer copy without a dash separator habit", () => {
		expect(
			formatInviteNamesForAnswer([
				{ fullName: "Nora Castillo" },
				{ fullName: "Robin Shaw" },
			]),
		).toBe("**Nora Castillo** and **Robin Shaw**");
	});
});

describe("scrubAssistantProse", () => {
	it("replaces em dashes with sentence breaks and keeps hyphenated words", () => {
		expect(
			scrubAssistantProse(
				"Choose one role, then Confirm — nothing is sent until you confirm. She is well-known.",
			),
		).toBe(
			"Choose one role, then Confirm. Nothing is sent until you confirm. She is well-known.",
		);
	});
});
