import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGitHubWebhookSignature } from "@/lib/tickets/github-tickets.service";
import { classifyGitHubWebhook } from "@/lib/tickets/github-webhook.service";

describe("github webhook signature", () => {
	it("accepts a valid HMAC and rejects a bad one", () => {
		const payload = '{"action":"assigned"}';
		const secret = "whsec_test";
		const digest = createHmac("sha256", secret).update(payload).digest("hex");
		expect(
			verifyGitHubWebhookSignature(payload, `sha256=${digest}`, secret),
		).toBe(true);
		expect(
			verifyGitHubWebhookSignature(payload, "sha256=deadbeef", secret),
		).toBe(false);
		expect(verifyGitHubWebhookSignature(payload, null, secret)).toBe(false);
	});
});

describe("classifyGitHubWebhook", () => {
	it("maps issues.assigned", () => {
		expect(
			classifyGitHubWebhook("issues", {
				action: "assigned",
				issue: { number: 42 },
				assignee: { login: "octocat" },
			}),
		).toEqual({
			kind: "assigned",
			issueNumber: 42,
			assigneeLogin: "octocat",
		});
	});

	it("maps merged PRs using Fixes #N", () => {
		expect(
			classifyGitHubWebhook("pull_request", {
				action: "closed",
				pull_request: {
					number: 9,
					html_url: "https://github.com/org/repo/pull/9",
					merged: true,
					body: "Fixes #42",
				},
			}),
		).toEqual({
			kind: "pr_merged",
			issueNumber: 42,
			prNumber: 9,
			prUrl: "https://github.com/org/repo/pull/9",
		});
	});

	it("maps successful workflow_run to ci_passed", () => {
		expect(
			classifyGitHubWebhook("workflow_run", {
				workflow_run: {
					status: "completed",
					conclusion: "success",
					pull_requests: [{ number: 9 }],
				},
			}),
		).toEqual({ kind: "ci_passed", prNumber: 9 });
	});

	it("maps a green Vercel caalm-next GitHub status", () => {
		expect(
			classifyGitHubWebhook("status", {
				state: "success",
				sha: "abc123",
				context: "Vercel – caalm-next",
			}),
		).toEqual({
			kind: "vercel_deployed",
			sha: "abc123",
			context: "Vercel – caalm-next",
		});
	});

	it("ignores Vercel demo and failed statuses", () => {
		expect(
			classifyGitHubWebhook("status", {
				state: "success",
				sha: "abc123",
				context: "Vercel – caalm-demo",
			}),
		).toEqual({ kind: "ignored" });
		expect(
			classifyGitHubWebhook("status", {
				state: "failure",
				sha: "abc123",
				context: "Vercel – caalm-next",
			}),
		).toEqual({ kind: "ignored" });
	});

	it("ignores unrelated events", () => {
		expect(classifyGitHubWebhook("ping", {})).toEqual({ kind: "ignored" });
	});
});
