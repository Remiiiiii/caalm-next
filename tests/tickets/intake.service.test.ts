import { describe, expect, it } from "vitest";
import { buildGitHubIssueBody } from "@/lib/tickets/github-tickets.service";
import { parseSeverity, slugLabel } from "@/lib/tickets/ticket-intake.service";
import {
	buildCursorAgentPrompt,
	parsePrNumberFromUrl,
} from "@/lib/tickets/cursor-agent.service";

describe("ticket intake helpers", () => {
	it("rejects client-supplied invalid severity", () => {
		expect(() => parseSeverity("urgent")).toThrow("Invalid severity");
		expect(parseSeverity("high")).toBe("high");
	});

	it("builds a structured GitHub issue body from server fields", () => {
		const body = buildGitHubIssueBody({
			name: "Ada Lovelace",
			userId: "user_1",
			department: "Legal",
			submittedAt: "2026-08-12T12:00:00.000Z",
			severity: "high",
			description: "SSO is down",
			ticketId: "ticket_1",
		});
		expect(body).toContain("Ada Lovelace");
		expect(body).toContain("user_1");
		expect(body).toContain("Legal");
		expect(body).toContain("SSO is down");
		expect(body).toContain("ticket_1");
	});

	it("slugs department labels for GitHub", () => {
		expect(slugLabel("Human Resources")).toBe("human-resources");
	});
});

describe("cursor agent helpers", () => {
	it("requires Fixes #N and tests in the prompt", () => {
		const prompt = buildCursorAgentPrompt({
			issueNumber: 12,
			issueUrl: "https://github.com/org/repo/issues/12",
			issueTitle: "Bug",
			issueBody: "Details",
		});
		expect(prompt).toContain("Fixes #12");
		expect(prompt).toContain("tests");
	});

	it("parses a PR number from a GitHub URL", () => {
		expect(
			parsePrNumberFromUrl("https://github.com/org/repo/pull/88"),
		).toBe(88);
		expect(parsePrNumberFromUrl(undefined)).toBeNull();
	});
});
