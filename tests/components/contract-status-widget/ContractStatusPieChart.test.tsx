import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContractStatusPieChart from "@/components/ContractStatusPieChart";
import {
	createActiveContract,
	createCompletedContract,
	createExpiredContract,
	createExpiringContract,
} from "./test-helpers";

vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
	PieChart: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="pie-chart">{children}</div>
	),
	Pie: ({ data }: { data: Array<{ status: string; count: number }> }) => (
		<div data-testid="pie" data-count={data.length}>
			{data.map((item) => (
				<div
					key={item.status}
					data-status={item.status}
					data-count={item.count}
				/>
			))}
		</div>
	),
	Cell: ({ fill }: { fill: string }) => (
		<div data-testid="cell" data-fill={fill} />
	),
	Tooltip: () => <div data-testid="tooltip" />,
}));

describe("ContractStatusPieChart", () => {
	it("categorizes contracts passed via props into Active / Expiring / Expired", () => {
		const contracts = [
			createActiveContract(200, { contractName: "Active 1" }),
			createActiveContract(200, { contractName: "Active 2" }),
			createExpiringContract(30, { contractName: "Expiring 1" }),
			createCompletedContract({ contractName: "Inactive 1" }),
			createExpiredContract(10, { contractName: "Expired 1" }),
		];

		render(<ContractStatusPieChart contracts={contracts} />);

		expect(screen.getByText("Contract Status")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Expiring")).toBeInTheDocument();
		expect(screen.getByText("Expired")).toBeInTheDocument();

		const pie = screen.getByTestId("pie");
		expect(
			pie.querySelector('[data-status="active"]')?.getAttribute("data-count"),
		).toBe("2");
		expect(
			pie.querySelector('[data-status="expiring"]')?.getAttribute("data-count"),
		).toBe("1");
		expect(
			pie.querySelector('[data-status="expired"]')?.getAttribute("data-count"),
		).toBe("2");
		expect(screen.getAllByText("5").length).toBeGreaterThan(0);
	});

	it("renders empty zeros for an empty contracts list", () => {
		render(<ContractStatusPieChart contracts={[]} />);
		const pie = screen.getByTestId("pie");
		expect(
			pie.querySelector('[data-status="active"]')?.getAttribute("data-count"),
		).toBe("0");
		expect(
			pie.querySelector('[data-status="expiring"]')?.getAttribute("data-count"),
		).toBe("0");
		expect(
			pie.querySelector('[data-status="expired"]')?.getAttribute("data-count"),
		).toBe("0");
	});
});
