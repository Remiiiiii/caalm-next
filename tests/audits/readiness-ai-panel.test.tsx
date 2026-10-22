import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadinessAiPanel } from "@/components/audits/ReadinessAiPanel";
import type { ReadinessAssistantStructured } from "@/lib/audits/readiness/summary-tiles";

afterEach(() => vi.unstubAllGlobals());

const structured: ReadinessAssistantStructured = {
	overallScore: 50,
	overallRag: "red",
	overallBadgeLabel: "Red",
	contractsGrantsScore: 0,
	contractsGrantsRag: "red",
	contractsBadgeLabel: "Gap · moderate",
	licensesScore: 100,
	licensesRag: "green",
	licensesBadgeLabel: "No risk",
	scopeLine:
		"Scope: Contracts and Licenses only · 1 expiring item · 1 upcoming deadline",
	priorityAction: {
		title: "Solvent Technologies",
		dueDateLabel: "Due Sep 30, 2027",
		instruction:
			"Action required. Update the contract documentation and milestones.",
		affectsModules: ["HRSA written service agreements"],
		moduleHref: "/contracts",
	},
	byModule: [
		{
			name: "Contracts",
			score: 0,
			ragStatus: "red",
			atRiskCount: 1,
			evidenceCount: 1,
			modulePath: "/contracts",
			blurb: "1 action-required item (see above) and 1 upcoming deadline.",
		},
	],
	sourceLine: "Source: Contracts and Licenses records",
	publicSiteCrawl: {
		websiteUrl: "https://www.example.org",
		sitemapFound: true,
		pagesCrawled: 4,
		healthHint: "needs_attention",
	},
};

describe("ReadinessAiPanel", () => {
	it("shows the last saved snapshot as soon as the sheet opens", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		render(
			<ReadinessAiPanel
				snapshotId="s1"
				open
				onOpenChange={() => {}}
				initialSummary="Full narrative text for copy."
				initialSummaryAt="2026-10-21T12:00:00.000Z"
				initialStructured={structured}
			/>,
		);
		expect(screen.getByText("Show full narrative")).toBeInTheDocument();
		expect(
			screen.getByText("Source: Contracts and Licenses records"),
		).toBeInTheDocument();
		expect(screen.queryByText("Based on these records")).not.toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("saves a new snapshot when play is pressed", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: {
					snapshot: {
						id: "s2",
						createdAt: "2026-10-22T12:00:00.000Z",
						aiSummary: "New run.",
					},
					summary: "New run.",
					structured,
				},
			}),
		});
		vi.stubGlobal("fetch", fetchMock);
		render(
			<ReadinessAiPanel snapshotId="s1" open onOpenChange={() => {}} />,
		);
		await userEvent.click(
			screen.getByRole("button", { name: /run auto-summary/i }),
		);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/audits/readiness",
			expect.objectContaining({ method: "POST" }),
		);
		expect(await screen.findByText("Show full narrative")).toBeInTheDocument();
	});

	it("cites the records a follow-up answer was based on", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					data: {
						answer: "One contract needs attention.",
						citations: [
							{
								id: "c1",
								title: "Solvent Technologies",
								href: "/contracts",
								label: "Contracts",
							},
						],
					},
				}),
			}),
		);
		render(
			<ReadinessAiPanel
				snapshotId="s1"
				open
				onOpenChange={() => {}}
				initialSummary="Saved summary."
				initialStructured={structured}
			/>,
		);
		await userEvent.click(
			screen.getByRole("button", {
				name: "Which gaps matter most for HRSA OSV prep?",
			}),
		);
		expect(
			await screen.findByText("One contract needs attention."),
		).toBeInTheDocument();
		expect(screen.getByText("Based on these records")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Solvent Technologies" }),
		).toHaveAttribute("href", "/contracts");
	});

	it("shows assistant text as human-readable prose without markdown syntax", () => {
		render(
			<ReadinessAiPanel
				snapshotId="s1"
				open
				onOpenChange={() => {}}
				initialSummary={
					"**Critical** gap in [Contracts](/contracts).\n\n- Renew the license"
				}
			/>,
		);
		const body = document.body.textContent ?? "";
		expect(body).toContain("Critical gap in Contracts.");
		expect(body).toContain("Renew the license");
		expect(body).not.toContain("**Critical**");
		expect(body).not.toContain("[Contracts](/contracts)");
		expect(body).not.toContain("(/contracts)");
	});
});
