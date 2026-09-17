import { describe, expect, it } from "vitest";
import { evaluateCommitCheckGate } from "./checks";

describe("evaluateCommitCheckGate", () => {
	it("waits when no check runs exist yet", () => {
		const gate = evaluateCommitCheckGate([]);
		expect(gate.ok).toBe(false);
		expect(gate.reason).toMatch(/start/i);
	});

	it("waits while any check is still running", () => {
		const gate = evaluateCommitCheckGate([
			{
				name: "Playwright E2E (push)",
				status: "in_progress",
				conclusion: null,
			},
			{
				name: "GitGuardian Security Checks",
				status: "completed",
				conclusion: "success",
			},
		]);
		expect(gate.ok).toBe(false);
		expect(gate.reason).toMatch(/Playwright E2E/);
	});

	it("stays closed when a completed check failed", () => {
		const gate = evaluateCommitCheckGate([
			{
				name: "Deploy to Vercel (production)",
				status: "completed",
				conclusion: "failure",
			},
		]);
		expect(gate.ok).toBe(false);
		expect(gate.reason).toMatch(/Deploy to Vercel/);
	});

	it("passes only when every completed check succeeded or was skipped", () => {
		const gate = evaluateCommitCheckGate([
			{
				name: "Playwright E2E (push)",
				status: "completed",
				conclusion: "success",
			},
			{
				name: "Vercel – caalm-next",
				status: "completed",
				conclusion: "success",
			},
			{
				name: "optional lint",
				status: "completed",
				conclusion: "skipped",
			},
		]);
		expect(gate.ok).toBe(true);
	});
});
