import { describe, expect, it } from "vitest";
import { buildGitHubIssueBody } from "@/lib/tickets/github-tickets.service";
import {
	buildCreateTicketInput,
	parseCategory,
	parseSeverity,
	slugLabel,
} from "@/lib/tickets/ticket-intake.service";
import { deriveSeverityFromMatrix } from "@/lib/tickets/ticket-intake.constants";
import { resolveSubmitterDepartmentLabel } from "@/lib/tickets/submitter-placement";
import {
	buildCursorAgentPrompt,
	parsePrNumberFromUrl,
} from "@/lib/tickets/cursor-agent.service";

describe("ticket intake helpers", () => {
	it("rejects client-supplied invalid severity", () => {
		expect(() => parseSeverity("urgent")).toThrow("Invalid severity");
		expect(parseSeverity("high")).toBe("high");
	});

	it("rejects invalid category", () => {
		expect(() => parseCategory("Mystery")).toThrow("Invalid category");
		expect(parseCategory("Hardware")).toBe("Hardware");
	});

	it("derives severity from impact and urgency", () => {
		expect(deriveSeverityFromMatrix("critical", "critical")).toEqual({
			severity: "critical",
			responseSlaHours: 1,
		});
		expect(deriveSeverityFromMatrix("low", "low")).toEqual({
			severity: "low",
			responseSlaHours: 48,
		});
	});

	it("builds create payload with server-derived severity", () => {
		const payload = buildCreateTicketInput({
			title: "Login broken",
			description: "Cannot sign in after password reset flow.",
			category: "Software / Application",
			affectedModule: "User Management",
			impact: "high",
			urgency: "high",
		});
		expect(payload.severity).toBe("high");
		expect(payload.category).toBe("Software / Application");
		expect(payload.affectedModule).toBe("User Management");
	});

	it("builds a structured GitHub issue body from server fields", () => {
		const body = buildGitHubIssueBody({
			name: "Ada Lovelace",
			userId: "user_1",
			department: "Legal",
			submittedAt: "2026-08-12T12:00:00.000Z",
			severity: "high",
			category: "Software / Application",
			affectedModule: "User Management",
			impact: "high",
			urgency: "high",
			description: "SSO is down",
			ticketId: "ticket_1",
		});
		expect(body).toContain("Ada Lovelace");
		expect(body).toContain("Software / Application");
		expect(body).toContain("User Management");
		expect(body).toContain("SSO is down");
		expect(body).toContain("ticket_1");
	});

	it("includes ticket number in GitHub issue body when provided", () => {
		const body = buildGitHubIssueBody({
			name: "Ada Lovelace",
			userId: "user_1",
			department: "Legal",
			submittedAt: "2026-08-12T12:00:00.000Z",
			severity: "high",
			category: "Software / Application",
			affectedModule: "User Management",
			impact: "high",
			urgency: "high",
			description: "SSO is down",
			ticketId: "ticket_1",
			ticketNumber: "TKT-2026-0042",
		});
		expect(body).toContain("TKT-2026-0042");
	});

	it("slugs department labels for GitHub", () => {
		expect(slugLabel("Human Resources")).toBe("human-resources");
	});

	it("prefers departmentLabel over legacy division for submitter placement", () => {
		expect(
			resolveSubmitterDepartmentLabel({
				departmentLabel: "IT",
				division: null,
			}),
		).toBe("IT");
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
