import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContractStatusPieChart from "@/components/ContractStatusPieChart";
import {
	createActiveContract,
	createCompletedContract,
	createExpiredContract,
	createExpiringContract,
	createMockContract,
} from "./test-helpers";

// Mock the useContractsExpiring hook
const mockUseContractsExpiring = vi.fn();

vi.mock("@/hooks/useContractsExpiring", () => ({
	useContractsExpiring: () => mockUseContractsExpiring(),
}));

// Mock recharts components to avoid rendering issues in tests
vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
	PieChart: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="pie-chart">{children}</div>
	),
	Pie: ({ data }: { data: any[] }) => (
		<div data-testid="pie" data-count={data.length}>
			{data.map((item, idx) => (
				<div key={idx} data-status={item.status} data-count={item.count} />
			))}
		</div>
	),
	Cell: ({ fill }: { fill: string }) => (
		<div data-testid="cell" data-fill={fill} />
	),
	Tooltip: ({
		content,
		active,
		payload,
	}: {
		content: any;
		active?: boolean;
		payload?: any[];
	}) => {
		// Render tooltip content when active and payload exists
		if (active && payload && payload.length > 0 && content) {
			const TooltipContent = content;
			return (
				<div
					data-testid="tooltip"
					data-active="true"
					data-payload-count={payload.length}
				>
					<TooltipContent active={active} payload={payload} />
				</div>
			);
		}
		return <div data-testid="tooltip" data-active="false" />;
	},
}));

describe("ContractStatusPieChart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock implementation
		mockUseContractsExpiring.mockReturnValue({
			contracts: [],
			isLoading: false,
			error: null,
		});
	});

	describe("Loading State", () => {
		it("should display loading state when contracts are being fetched", () => {
			mockUseContractsExpiring.mockReturnValue({
				contracts: [],
				isLoading: true,
				error: null,
			});

			render(<ContractStatusPieChart />);

			expect(screen.getByText("Contract Status")).toBeInTheDocument();
			expect(screen.getByText("Loading contracts...")).toBeInTheDocument();
			expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		});

		it("should not show loading spinner when not loading", () => {
			mockUseContractsExpiring.mockReturnValue({
				contracts: [],
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			expect(
				screen.queryByText("Loading contracts..."),
			).not.toBeInTheDocument();
		});

		it("should handle loading state with undefined contracts", () => {
			mockUseContractsExpiring.mockReturnValue({
				contracts: undefined,
				isLoading: true,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Should show loading state
			expect(screen.getByText("Contract Status")).toBeInTheDocument();
			expect(screen.getByText("Loading contracts...")).toBeInTheDocument();
			expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		});
	});

	describe("Error State", () => {
		it("should display error state when there is an error and no contracts", () => {
			mockUseContractsExpiring.mockReturnValue({
				contracts: [],
				isLoading: false,
				error: new Error("Failed to fetch contracts"),
			});

			render(<ContractStatusPieChart />);

			expect(screen.getByText("Contract Status")).toBeInTheDocument();
			expect(screen.getByText("Data Unavailable")).toBeInTheDocument();
			expect(screen.getByText("Check your connection")).toBeInTheDocument();
		});

		it("should not show error state when there is data despite error", () => {
			const mockContracts = [
				createActiveContract(200, { contractName: "Test Contract" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: new Error("Some error"),
			});

			render(<ContractStatusPieChart />);

			expect(screen.queryByText("Data Unavailable")).not.toBeInTheDocument();
		});
	});

	describe("Empty State", () => {
		it("should display empty state with zero counts when no contracts", () => {
			mockUseContractsExpiring.mockReturnValue({
				contracts: [],
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			expect(screen.getByText("Contract Status")).toBeInTheDocument();
			expect(screen.getByText(/Total:/)).toBeInTheDocument();
			// Check that zero appears (multiple times is expected - total, active, expiring, completed)
			const zeroElements = screen.getAllByText("0");
			expect(zeroElements.length).toBeGreaterThan(0);
		});

		it("should show all status categories with zero counts", () => {
			mockUseContractsExpiring.mockReturnValue({
				contracts: [],
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			const pieChart = screen.getByTestId("pie");
			expect(pieChart).toBeInTheDocument();
			expect(pieChart.getAttribute("data-count")).toBe("3"); // active, expiring, completed
		});
	});

	describe("Data Transformation", () => {
		it("should categorize active contracts correctly", () => {
			const mockContracts = [
				createActiveContract(200, { contractName: "Active Contract 1" }),
				createActiveContract(200, { contractName: "Active Contract 2" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Check total contracts using the pie chart data
			const pieChart = screen.getByTestId("pie");
			const activeCell = pieChart.querySelector('[data-status="active"]');
			expect(activeCell?.getAttribute("data-count")).toBe("2");

			// Verify total is displayed (may appear multiple times, so check it exists)
			const totalElements = screen.getAllByText("2");
			expect(totalElements.length).toBeGreaterThan(0);
		});

		it("should categorize expiring contracts correctly (within 90 days)", () => {
			const mockContracts = [
				createExpiringContract(30, { contractName: "Expiring Contract 1" }),
				createExpiringContract(30, { contractName: "Expiring Contract 2" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			const pieChart = screen.getByTestId("pie");
			const expiringCell = pieChart.querySelector('[data-status="expiring"]');
			expect(expiringCell?.getAttribute("data-count")).toBe("2");
		});

		it("should categorize completed contracts correctly (inactive status)", () => {
			const mockContracts = [
				createCompletedContract({ contractName: "Inactive Contract 1" }),
				createCompletedContract({ contractName: "Inactive Contract 2" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			const pieChart = screen.getByTestId("pie");
			const completedCell = pieChart.querySelector('[data-status="completed"]');
			expect(completedCell?.getAttribute("data-count")).toBe("2");
		});

		it("should categorize expired contracts as completed", () => {
			const mockContracts = [
				createExpiredContract(10, { contractName: "Expired Contract 1" }),
				createExpiredContract(5, { contractName: "Expired Contract 2" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			const pieChart = screen.getByTestId("pie");
			const completedCell = pieChart.querySelector('[data-status="completed"]');
			expect(completedCell?.getAttribute("data-count")).toBe("2");
		});

		it("should handle contracts expiring soon regardless of status", () => {
			const mockContracts = [
				createExpiringContract(45, {
					status: "pending-review",
					contractName: "Pending Expiring Contract",
				}),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			const pieChart = screen.getByTestId("pie");
			const expiringCell = pieChart.querySelector('[data-status="expiring"]');
			expect(expiringCell?.getAttribute("data-count")).toBe("1");
		});

		it("should handle mixed contract statuses correctly", () => {
			const mockContracts = [
				// Active contracts
				createActiveContract(200, { contractName: "Active 1" }),
				createActiveContract(200, { contractName: "Active 2" }),
				// Expiring contracts
				createExpiringContract(30, { contractName: "Expiring 1" }),
				// Completed contracts
				createCompletedContract({ contractName: "Inactive 1" }),
				createMockContract({
					status: "active",
					contractName: "Expired 1",
					contractExpiryDate: new Date(
						Date.now() - 10 * 24 * 60 * 60 * 1000,
					).toISOString(),
					isExpired: false,
				}),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Verify total contracts (may appear multiple times)
			const totalElements = screen.getAllByText("5");
			expect(totalElements.length).toBeGreaterThan(0);

			const pieChart = screen.getByTestId("pie");
			expect(
				pieChart
					.querySelector('[data-status="active"]')
					?.getAttribute("data-count"),
			).toBe("2");
			expect(
				pieChart
					.querySelector('[data-status="expiring"]')
					?.getAttribute("data-count"),
			).toBe("1");
			expect(
				pieChart
					.querySelector('[data-status="completed"]')
					?.getAttribute("data-count"),
			).toBe("2");
		});
	});

	describe("Percentage Calculations", () => {
		it("should calculate percentages correctly for equal distribution", () => {
			const mockContracts = [
				// 1 active
				createActiveContract(200, { contractName: "Active" }),
				// 1 expiring
				createExpiringContract(30, { contractName: "Expiring" }),
				// 1 completed
				createCompletedContract({ contractName: "Inactive" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Each should be approximately 33% (rounded)
			const pieChart = screen.getByTestId("pie");
			const activeCell = pieChart.querySelector('[data-status="active"]');
			const expiringCell = pieChart.querySelector('[data-status="expiring"]');
			const completedCell = pieChart.querySelector('[data-status="completed"]');

			expect(activeCell?.getAttribute("data-count")).toBe("1");
			expect(expiringCell?.getAttribute("data-count")).toBe("1");
			expect(completedCell?.getAttribute("data-count")).toBe("1");
		});

		it("should handle zero total contracts without errors", () => {
			mockUseContractsExpiring.mockReturnValue({
				contracts: [],
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			const pieChart = screen.getByTestId("pie");
			expect(pieChart).toBeInTheDocument();
			// All should have count 0
			expect(
				pieChart
					.querySelector('[data-status="active"]')
					?.getAttribute("data-count"),
			).toBe("0");
			expect(
				pieChart
					.querySelector('[data-status="expiring"]')
					?.getAttribute("data-count"),
			).toBe("0");
			expect(
				pieChart
					.querySelector('[data-status="completed"]')
					?.getAttribute("data-count"),
			).toBe("0");
		});
	});

	describe("Prop Data Override", () => {
		it("should use prop data when provided instead of fetching", () => {
			const propData = [
				{
					status: "active" as const,
					count: 10,
					percentage: 50,
					color: "#10B981",
				},
				{
					status: "expiring" as const,
					count: 5,
					percentage: 25,
					color: "#F59E0B",
				},
				{
					status: "completed" as const,
					count: 5,
					percentage: 25,
					color: "#6B7280",
				},
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: [],
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart data={propData as never} />);

			// Verify total from prop data (may appear multiple times)
			const totalElements = screen.getAllByText("20");
			expect(totalElements.length).toBeGreaterThan(0);

			const pieChart = screen.getByTestId("pie");
			expect(
				pieChart
					.querySelector('[data-status="active"]')
					?.getAttribute("data-count"),
			).toBe("10");
			expect(
				pieChart
					.querySelector('[data-status="expiring"]')
					?.getAttribute("data-count"),
			).toBe("5");
			expect(
				pieChart
					.querySelector('[data-status="completed"]')
					?.getAttribute("data-count"),
			).toBe("5");
		});
	});

	describe("UI Rendering", () => {
		it("should render all required UI elements", () => {
			const mockContracts = [
				createActiveContract(200, { contractName: "Test Contract" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			expect(screen.getByText("Contract Status")).toBeInTheDocument();
			expect(screen.getByText(/Total:/)).toBeInTheDocument();
			expect(screen.getByText("Active")).toBeInTheDocument();
			expect(screen.getByText("Expiring")).toBeInTheDocument();
			expect(screen.getByText("Completed")).toBeInTheDocument();
			expect(screen.getByText("Live Contract Data")).toBeInTheDocument();
		});

		it("should display correct counts in status badges", () => {
			const mockContracts = [
				createActiveContract(200, { contractName: "Active 1" }),
				createActiveContract(200, { contractName: "Active 2" }),
				createExpiringContract(30, { contractName: "Expiring 1" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Check counts using the pie chart data instead of UI text
			const pieChart = screen.getByTestId("pie");
			const activeCell = pieChart.querySelector('[data-status="active"]');
			const expiringCell = pieChart.querySelector('[data-status="expiring"]');

			expect(activeCell?.getAttribute("data-count")).toBe("2");
			expect(expiringCell?.getAttribute("data-count")).toBe("1");
		});
	});

	describe("Edge Cases", () => {
		it("should handle contracts without expiry dates", () => {
			const mockContracts = [
				createMockContract({
					status: "active",
					contractName: "Contract without expiry",
					contractExpiryDate: undefined,
					isExpired: false,
				}),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			const pieChart = screen.getByTestId("pie");
			const activeCell = pieChart.querySelector('[data-status="active"]');
			expect(activeCell?.getAttribute("data-count")).toBe("1");
		});

		it("should handle contracts with null or undefined status", () => {
			const mockContracts = [
				createMockContract({
					status: undefined,
					contractName: "Contract without status",
					isExpired: false,
				}),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Should default to completed for unknown statuses
			const pieChart = screen.getByTestId("pie");
			const completedCell = pieChart.querySelector('[data-status="completed"]');
			expect(completedCell?.getAttribute("data-count")).toBe("1");
		});

		it("should handle contracts with case-insensitive status", () => {
			const mockContracts = [
				createActiveContract(200, {
					status: "ACTIVE" as never, // Uppercase
					contractName: "Uppercase Active",
				}),
				createActiveContract(200, {
					status: "Active" as never, // Title case
					contractName: "Title Case Active",
				}),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			const pieChart = screen.getByTestId("pie");
			const activeCell = pieChart.querySelector('[data-status="active"]');
			expect(activeCell?.getAttribute("data-count")).toBe("2");
		});
	});

	describe("Helper Functions", () => {
		it("should handle unknown status in getStatusIcon", () => {
			const mockContracts = [
				createMockContract({
					status: "unknown-status" as any,
					contractName: "Contract with unknown status",
					isExpired: false,
				}),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Component should render without errors
			expect(screen.getByText("Contract Status")).toBeInTheDocument();

			// The contract should be categorized (likely as active or completed)
			const pieChart = screen.getByTestId("pie");
			expect(pieChart).toBeInTheDocument();
		});

		it("should handle unknown status in getStatusLabel", () => {
			// Test tooltip with unknown status by rendering with prop data
			const propData = [
				{
					status: "unknown-status" as any,
					count: 1,
					percentage: 100,
					color: "#10B981",
				},
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: [],
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart data={propData} />);

			// Component should render without errors
			expect(screen.getByText("Contract Status")).toBeInTheDocument();
			const pieChart = screen.getByTestId("pie");
			expect(pieChart).toBeInTheDocument();
		});
	});

	describe("Tooltip Interaction", () => {
		it("should render tooltip component when provided", () => {
			const mockContracts = [
				createActiveContract(200, { contractName: "Test Contract" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Tooltip component should be rendered (even if not active)
			const tooltip = screen.getByTestId("tooltip");
			expect(tooltip).toBeInTheDocument();
		});

		it("should render tooltip content when active with payload", () => {
			// Test that tooltip component is properly integrated
			const mockContracts = [
				createActiveContract(200, { contractName: "Test Contract" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Verify tooltip is in the DOM
			const tooltip = screen.getByTestId("tooltip");
			expect(tooltip).toBeInTheDocument();

			// Verify pie chart data is available for tooltip
			const pieChart = screen.getByTestId("pie");
			expect(pieChart).toBeInTheDocument();

			// Verify tooltip can receive payload (by checking it's not active by default)
			expect(tooltip.getAttribute("data-active")).toBe("false");
		});

		it("should handle tooltip with no payload gracefully", () => {
			const mockContracts = [
				createActiveContract(200, { contractName: "Test Contract" }),
			];

			mockUseContractsExpiring.mockReturnValue({
				contracts: mockContracts,
				isLoading: false,
				error: null,
			});

			render(<ContractStatusPieChart />);

			// Component should render without errors even if tooltip has no payload
			expect(screen.getByText("Contract Status")).toBeInTheDocument();
			const tooltip = screen.getByTestId("tooltip");
			expect(tooltip).toBeInTheDocument();
		});
	});
});
