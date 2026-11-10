import { describe, expect, it } from "vitest";
import { buildNextInviteForm } from "@/lib/assistant/nextInviteForm";

describe("buildNextInviteForm", () => {
	it("builds one-person form with step copy", () => {
		const next = buildNextInviteForm({
			remaining: [
				{
					$id: "r1",
					email: "csuite3.chart@example.com",
					fullName: "Robin Shaw",
				},
			],
			total: 2,
		});
		expect(next.answer).toMatch(/2 of 2/);
		expect(next.answer).toMatch(/Robin Shaw/);
		expect(next.inputForm.intent).toBe("invite_user");
		expect(next.inputForm.fields[0]?.defaultValue).toContain("Robin Shaw");
		expect(next.inputForm.fields[0]?.defaultValue).not.toContain("Nora");
	});

	it("builds a multi form for several deferred people", () => {
		const next = buildNextInviteForm({
			remaining: [
				{
					$id: "r1",
					email: "robin@example.com",
					fullName: "Robin Shaw",
				},
				{
					$id: "a1",
					email: "ada@example.com",
					fullName: "Ada Lovelace",
				},
			],
			total: 3,
		});
		expect(next.answer).toMatch(/2 left of 3/);
		expect(next.inputForm.fields[0]?.type).toBe("directory_multi");
		expect(next.inputForm.fields[0]?.options).toHaveLength(2);
	});
});
