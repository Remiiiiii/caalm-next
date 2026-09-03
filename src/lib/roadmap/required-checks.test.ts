import { describe, expect, it } from "vitest";
import {
	evaluateRoadmapCompletionGate,
	ROADMAP_REQUIRED_JOB_NAMES,
	ROADMAP_WORKFLOW_NAME,
	type WorkflowRunSummary,
} from "./required-checks";

function run(
	overrides: Partial<WorkflowRunSummary> & {
		jobs: WorkflowRunSummary["jobs"];
		event: string;
	},
): WorkflowRunSummary {
	return {
		name: ROADMAP_WORKFLOW_NAME,
		conclusion: "success",
		headSha: "abc123",
		...overrides,
	};
}

describe("evaluateRoadmapCompletionGate", () => {
	it("passes when Playwright E2E (push) and Deploy to Vercel (production) succeed", () => {
		const gate = evaluateRoadmapCompletionGate([
			run({
				event: "push",
				jobs: [
					{
						name: ROADMAP_REQUIRED_JOB_NAMES.playwrightE2E,
						conclusion: "success",
					},
					{
						name: ROADMAP_REQUIRED_JOB_NAMES.deployProduction,
						conclusion: "success",
					},
				],
			}),
		]);
		expect(gate.ok).toBe(true);
		expect(gate.playwrightPushPassed).toBe(true);
		expect(gate.deployProductionPassed).toBe(true);
	});

	it("rejects Playwright success on pull_request alone", () => {
		const gate = evaluateRoadmapCompletionGate([
			run({
				event: "pull_request",
				jobs: [
					{
						name: ROADMAP_REQUIRED_JOB_NAMES.playwrightE2E,
						conclusion: "success",
					},
					{
						name: ROADMAP_REQUIRED_JOB_NAMES.deployProduction,
						conclusion: "success",
					},
				],
			}),
		]);
		expect(gate.ok).toBe(false);
		expect(gate.playwrightPushPassed).toBe(false);
		expect(gate.reason).toMatch(/Playwright E2E \(push\)/i);
	});

	it("rejects when production deploy is missing", () => {
		const gate = evaluateRoadmapCompletionGate([
			run({
				event: "push",
				jobs: [
					{
						name: ROADMAP_REQUIRED_JOB_NAMES.playwrightE2E,
						conclusion: "success",
					},
				],
			}),
		]);
		expect(gate.ok).toBe(false);
		expect(gate.deployProductionPassed).toBe(false);
		expect(gate.reason).toMatch(/Deploy to Vercel \(production\)/i);
	});
});
