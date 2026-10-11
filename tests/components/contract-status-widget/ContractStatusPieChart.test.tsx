import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContractStatusPieChart from "@/components/ContractStatusPieChart";
import {
	createActiveContract,
	createCompletedContract,
	createExpiredContract,
	createExpiringContract,
} from "./test-helpers";

vi.mock("scichart", () => {
	class PieSegment {
		value: number;
		text: string;
		color: string;
		constructor(opts: { value: number; text: string; color: string }) {
			this.value = opts.value;
			this.text = opts.text;
			this.color = opts.color;
		}
	}

	class SciChartPieSurface {
		labelStyle = {};
		labelProvider = { precision: 2 };
		pieSegments = {
			add: (...segments: PieSegment[]) => {
				const host = document.querySelector(
					'[data-testid="contract-status-donut"]',
				);
				if (!host) return;
				for (const seg of segments) {
					const el = document.createElement("div");
					el.setAttribute("data-status", seg.text);
					el.setAttribute("data-count", String(seg.value));
					el.setAttribute("data-testid", "pie-segment");
					host.appendChild(el);
				}
			},
		};
		delete = vi.fn();
		static create = vi.fn(async () => new SciChartPieSurface());
	}

	return {
		PieSegment,
		SciChartPieSurface,
		GradientParams: class {
			constructor(..._args: unknown[]) {}
		},
		Point: class {
			constructor(..._args: unknown[]) {}
		},
		EPieType: { Donut: "Donut", Pie: "Pie" },
		EPieValueMode: { Percentage: "Percentage", Raw: "Raw" },
		ESizingMode: { Relative: "Relative", Absolute: "Absolute" },
		Thickness: class {
			constructor(..._args: unknown[]) {}
		},
		SciChartJSLightTheme: class {
			sciChartBackground = "";
			loadingAnimationBackground = "";
		},
	};
});

describe("ContractStatusPieChart", () => {
	it("categorizes contracts passed via props into Active / Expiring / Expired", async () => {
		const contracts = [
			createActiveContract(200, { contractName: "Active 1" }),
			createActiveContract(200, { contractName: "Active 2" }),
			createExpiringContract(30, { contractName: "Expiring 1" }),
			createCompletedContract({ contractName: "Inactive 1" }),
			createExpiredContract(10, { contractName: "Expired 1" }),
		];

		render(<ContractStatusPieChart contracts={contracts} />);

		expect(screen.getByText("Contract status")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Expiring")).toBeInTheDocument();
		expect(screen.getByText("Expired")).toBeInTheDocument();
		expect(screen.getByText("total contracts")).toBeInTheDocument();
		expect(screen.getByLabelText("Open contracts")).toBeInTheDocument();
		expect(screen.getByText("3 of 5 need attention")).toBeInTheDocument();

		const segments = await screen.findAllByTestId("pie-segment");
		const byStatus = Object.fromEntries(
			segments.map((el) => [
				el.getAttribute("data-status"),
				el.getAttribute("data-count"),
			]),
		);
		expect(byStatus.active).toBe("2");
		expect(byStatus.expiring).toBe("1");
		expect(byStatus.expired).toBe("2");
		expect(screen.getAllByText("5").length).toBeGreaterThan(0);
	});

	it("shows the healthy pill when every contract is active", () => {
		const contracts = [
			createActiveContract(200, { contractName: "Active 1" }),
			createActiveContract(180, { contractName: "Active 2" }),
		];

		render(<ContractStatusPieChart contracts={contracts} />);

		expect(screen.getByText("All contracts healthy")).toBeInTheDocument();
		expect(screen.queryByText(/need attention/)).not.toBeInTheDocument();
	});

	it("renders empty zeros for an empty contracts list", async () => {
		render(<ContractStatusPieChart contracts={[]} />);
		expect(screen.getByText("All contracts healthy")).toBeInTheDocument();
		expect(screen.getByTestId("contract-status-donut")).toBeInTheDocument();
		const emptySeg = await screen.findByTestId("pie-segment");
		expect(emptySeg.getAttribute("data-status")).toBe("empty");
	});
});
