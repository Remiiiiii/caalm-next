import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaybookDeviationsPanel } from "@/components/playbook/PlaybookDeviationsPanel";
import { buildSeededDeviationReport } from "@/lib/playbook/seeded-deviations";

describe("PlaybookDeviationsPanel", () => {
	it("shows severity badges for seeded deviations", () => {
		const report = buildSeededDeviationReport();
		render(
			<PlaybookDeviationsPanel report={report} seeded />,
		);

		expect(screen.getByTestId("playbook-deviations-panel")).toBeTruthy();
		expect(screen.getByText("High severity")).toBeTruthy();
		expect(screen.getByText("Medium severity")).toBeTruthy();
		expect(screen.getByText("Low severity")).toBeTruthy();
		expect(screen.getByText("Off-standard")).toBeTruthy();
		expect(screen.getByText("Matches playbook")).toBeTruthy();
		expect(screen.getByText("No standard")).toBeTruthy();

		const highRow = document.querySelector('[data-severity="high"]');
		expect(highRow?.getAttribute("data-verdict")).toBe("deviate");
	});
});
