import { describe, expect, it } from "vitest";
import { composeEngineeringBugDescription } from "@/lib/tickets/bug-report-body";
import {
	buildCursorAgentPrompt,
	parsePrNumberFromUrl,
} from "@/lib/tickets/cursor-agent.service";
import { buildGitHubIssueBody } from "@/lib/tickets/github-tickets.service";
import { resolveSubmitterDepartmentLabel } from "@/lib/tickets/submitter-placement";
import { deriveSeverityFromMatrix } from "@/lib/tickets/ticket-intake.constants";
import {
	buildCreateTicketInput,
	parseCategory,
	parseSeverity,
	slugLabel,
} from "@/lib/tickets/ticket-intake.service";

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
			description: "",
			lane: "engineering",
			category: "Software / Application",
			affectedModule: "User Management",
			impact: "high",
			urgency: "high",
			steps: "1. Open sign-in\n2. Enter password",
			expected: "The user should land on the dashboard.",
			actual: "The form stays on a spinner.",
			os: "Windows",
			environment: "Local",
			searchedExisting: true,
			isBug: true,
		});
		expect(payload.severity).toBe("high");
		expect(payload.lane).toBe("engineering");
		expect(payload.category).toBe("Software / Application");
		expect(payload.affectedModule).toBe("User Management");
		expect(payload.description).toContain("### Reproduction steps");
		expect(payload.description).toContain("### Expected behavior");
		expect(payload.description).toContain("### Actual behavior");
		expect(payload.description).toContain("### OS");
		expect(payload.description).toContain("Windows");
		expect(payload.description).toContain("### Environment");
		expect(payload.description).toContain("Local");
	});

	it("rejects help category on engineering lane", () => {
		expect(() =>
			buildCreateTicketInput({
				title: "Need laptop",
				description: "Requesting a replacement device for my role.",
				lane: "engineering",
				category: "Hardware",
				impact: "low",
				urgency: "medium",
			}),
		).toThrow(/category/i);
	});

	it("rejects engineering tickets missing reproduction steps", () => {
		expect(() =>
			buildCreateTicketInput({
				title: "Login broken",
				description: "",
				lane: "engineering",
				category: "Software / Application",
				affectedModule: "User Management",
				impact: "high",
				urgency: "high",
			}),
		).toThrow(/reproduction steps/i);
	});

	it("builds help lane payload without engineering-only category", () => {
		const payload = buildCreateTicketInput({
			title: "Need laptop",
			description: "Requesting a replacement device for my role.",
			lane: "help",
			category: "Hardware",
			impact: "low",
			urgency: "medium",
		});
		expect(payload.lane).toBe("help");
		expect(payload.category).toBe("Hardware");
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

	it("keeps CAALM metadata and GitHub bug headings in the issue body", () => {
		const description = composeEngineeringBugDescription({
			steps: "1. Open contracts\n2. Click save",
			expected: "The contract should save.",
			actual: "Nothing happens.",
			os: "Windows",
			environment: "Production",
			searchedExisting: true,
			isBug: true,
		});
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
			description,
			ticketId: "ticket_1",
			ticketNumber: "TKT-2026-0042",
		});
		expect(body).toContain("Ada Lovelace");
		expect(body).toContain("TKT-2026-0042");
		expect(body).toContain("### Reproduction steps");
		expect(body).toContain("### Expected behavior");
		expect(body).toContain("### Actual behavior");
		expect(body).toContain("### OS");
		expect(body).toContain("Windows");
		expect(body).toContain("### Environment");
		expect(body).toContain("Production");
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
		expect(parsePrNumberFromUrl("https://github.com/org/repo/pull/88")).toBe(
			88,
		);
		expect(parsePrNumberFromUrl(undefined)).toBeNull();
	});
});
