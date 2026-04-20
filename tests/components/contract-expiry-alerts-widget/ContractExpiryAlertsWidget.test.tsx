import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContractExpiryAlertsWidget from "@/components/ContractExpiryAlertsWidget";

// Mock hooks
const mockUseManagerContracts = vi.fn();
const mockUseContractAlarm = vi.fn();
const mockUseSWR = vi.fn();

vi.mock("@/hooks/useManagerContracts", () => ({
	useManagerContracts: () => mockUseManagerContracts(),
}));

vi.mock("@/hooks/useContractAlarm", () => ({
	useContractAlarm: () => mockUseContractAlarm(),
}));

vi.mock("swr", () => ({
	default: (key: any, fetcher: any, config: any) =>
		mockUseSWR(key, fetcher, config),
}));

const mockContracts = [
	{
		$id: "contract-1",
		contractName: "Test Contract 1",
		contractExpiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		isExpired: false,
		daysUntilExpiry: 5,
		status: "active",
	},
	{
		$id: "contract-2",
		contractName: "Test Contract 2",
		contractExpiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		isExpired: false,
		daysUntilExpiry: 15,
		status: "active",
	},
	{
		$id: "contract-3",
		contractName: "Expired Contract",
		contractExpiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		isExpired: true,
		daysUntilExpiry: -10,
		status: "expired",
	},
];

describe("ContractExpiryAlertsWidget", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset fetch mock
		if (global.fetch) {
			(global.fetch as any).mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			});
		}

		// Default mock implementations
		mockUseManagerContracts.mockReturnValue({
			contracts: [],
			isLoading: false,
			error: null,
		});

		mockUseContractAlarm.mockReturnValue({
			isPlaying: false,
			silenceAlarm: vi.fn(),
			dismissAlarm: vi.fn(),
		});

		mockUseSWR.mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: false,
		});
	});

	it("should render widget with contracts from props", () => {
		render(
			<ContractExpiryAlertsWidget
				contracts={mockContracts as any}
				maxVisible={3}
				showSettings={true}
			/>,
		);

		expect(screen.getByText("Contract Expiry Alerts")).toBeInTheDocument();
	});

	it("should display filter dropdown when showSettings is true", async () => {
		render(
			<ContractExpiryAlertsWidget
				contracts={mockContracts as any}
				showSettings={true}
			/>,
		);

		const filter = screen.getByLabelText(/filter contracts by time period/i);
		expect(filter).toBeInTheDocument();
	});

	it("should filter contracts by time period", async () => {
		const user = userEvent.setup();
		render(
			<ContractExpiryAlertsWidget
				contracts={mockContracts as any}
				showSettings={true}
			/>,
		);

		const filter = screen.getByLabelText(/filter contracts by time period/i);
		await user.selectOptions(filter, "30");

		// Contract 1 (5 days) and Contract 2 (15 days) should be visible
		expect(screen.getByText("Test Contract 1")).toBeInTheDocument();
		expect(screen.getByText("Test Contract 2")).toBeInTheDocument();
	});

	it("should show expired contracts when Expired filter is selected", async () => {
		const user = userEvent.setup();
		render(
			<ContractExpiryAlertsWidget
				contracts={mockContracts as any}
				showSettings={true}
			/>,
		);

		const filter = screen.getByLabelText(/filter contracts by time period/i);
		await user.selectOptions(filter, "-1");

		expect(screen.getByText("Expired Contract")).toBeInTheDocument();
	});

	it("should show empty state when no contracts match filter", async () => {
		const user = userEvent.setup();
		render(
			<ContractExpiryAlertsWidget
				contracts={mockContracts as any}
				showSettings={true}
			/>,
		);

		const filter = screen.getByLabelText(/filter contracts by time period/i);
		await user.selectOptions(filter, "90");

		// Should show empty state message
		expect(screen.getByText(/no contracts/i)).toBeInTheDocument();
	});

	it("should display loading state", () => {
		mockUseSWR.mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: true,
		});

		render(<ContractExpiryAlertsWidget />);

		expect(screen.getByText("Contract Expiry Alerts")).toBeInTheDocument();
		// Loading skeletons should be present (check for skeleton elements with animate-pulse)
		const skeletons = document.querySelectorAll(".animate-pulse");
		expect(skeletons.length).toBeGreaterThan(0);
		// Verify skeleton structure
		expect(skeletons[0].querySelector(".bg-gray-200")).toBeInTheDocument();
	});

	it("should display error state", () => {
		mockUseSWR.mockReturnValue({
			data: undefined,
			error: new Error("Failed to load"),
			isLoading: false,
		});

		render(<ContractExpiryAlertsWidget />);

		expect(
			screen.getByText("Failed to load contract data"),
		).toBeInTheDocument();
	});

	it("should not show filter when showSettings is false", () => {
		render(
			<ContractExpiryAlertsWidget
				contracts={mockContracts as any}
				showSettings={false}
			/>,
		);

		const filter = screen.queryByLabelText(/filter contracts by time period/i);
		expect(filter).not.toBeInTheDocument();
	});

	it("should render compact version when compact prop is true", () => {
		render(
			<ContractExpiryAlertsWidget
				contracts={mockContracts as any}
				compact={true}
			/>,
		);

		expect(screen.getByText("Contract Expiry Alerts")).toBeInTheDocument();
	});
});
