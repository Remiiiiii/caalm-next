import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadinessAiPanel } from "@/components/audits/ReadinessAiPanel";

afterEach(() => vi.unstubAllGlobals());

describe("ReadinessAiPanel", () => {
	it("cites the records a summary was based on", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					data: {
						summary: "One contract needs attention.",
						suggestedQuestions: [],
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
		render(<ReadinessAiPanel snapshotId="s1" />);
		await userEvent.click(
			screen.getByRole("button", { name: /run auto-summary/i }),
		);
		expect(
			await screen.findByText("One contract needs attention."),
		).toBeInTheDocument();
		expect(screen.getByText("Based on these records")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Solvent Technologies" }),
		).toHaveAttribute("href", "/contracts");
	});
});
