import { beforeEach, describe, expect, it, vi } from "vitest";

const getUninvitedUsers = vi.fn();

vi.mock("@/lib/actions/user.actions", () => ({
	getUninvitedUsers: (...args: unknown[]) => getUninvitedUsers(...args),
}));

const { resolveDirectoryInvitees } = await import(
	"@/lib/assistant/directoryInvite"
);

describe("resolveDirectoryInvitees", () => {
	beforeEach(() => {
		getUninvitedUsers.mockReset();
		getUninvitedUsers.mockResolvedValue([
			{
				$id: "n1",
				email: "cao.chart@example.com",
				fullName: "Nora Castillo",
			},
			{
				$id: "r1",
				email: "csuite3.chart@example.com",
				fullName: "Robin Shaw",
			},
		]);
	});

	it("matches multiple directory names", async () => {
		const result = await resolveDirectoryInvitees({
			nameHints: ["Nora Castillo", "Robin Shaw"],
			emails: [],
		});
		expect(result.matched.map((m) => m.fullName)).toEqual([
			"Nora Castillo",
			"Robin Shaw",
		]);
		expect(result.unmatched).toEqual([]);
	});

	it("reports unmatched people", async () => {
		const result = await resolveDirectoryInvitees({
			nameHints: ["Nobody Here"],
			emails: [],
		});
		expect(result.matched).toEqual([]);
		expect(result.unmatched).toEqual(["Nobody Here"]);
	});

	it("matches names that end with a period", async () => {
		getUninvitedUsers.mockResolvedValue([
			{
				$id: "c1",
				email: "csuite5.chart@example.com",
				fullName: "Chris Vale",
			},
		]);
		const result = await resolveDirectoryInvitees({
			nameHints: ["Chris Vale."],
			emails: [],
		});
		expect(result.matched.map((m) => m.fullName)).toEqual(["Chris Vale"]);
		expect(result.unmatched).toEqual([]);
	});

	it("does not mark a name unmatched when the same person already matched by email", async () => {
		getUninvitedUsers.mockResolvedValue([
			{
				$id: "i1",
				email: "csuite4.chart@example.com",
				fullName: "Indira Sen",
			},
		]);
		const result = await resolveDirectoryInvitees({
			nameHints: ["Indira Sen"],
			emails: ["csuite4.chart@example.com"],
		});
		expect(result.matched.map((m) => m.fullName)).toEqual(["Indira Sen"]);
		expect(result.unmatched).toEqual([]);
	});
});
