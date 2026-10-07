import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LicenseExpiryAlertsWidget from "@/components/LicenseExpiryAlertsWidget";

const mockUseContractAlarm = vi.fn();
const mockUseSWR = vi.fn();

vi.mock("@/hooks/useContractAlarm", () => ({
	useContractAlarm: () => mockUseContractAlarm(),
}));

vi.mock("swr", () => ({
	default: (key: unknown, fetcher: unknown, config: unknown) =>
		mockUseSWR(key, fetcher, config),
}));

const mockLicenses = [
	{
		$id: "license-1",
		licenseName: "Test License 1",
		licenseNumber: "LIC-1",
		licenseType: "business",
		licenseExpiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		issuingAuthority: "State",
		issueDate: "2024-01-01",
		status: "active" as const,
		daysUntilExpiry: 5,
		$createdAt: "",
		$updatedAt: "",
	},
	{
		$id: "license-2",
		licenseName: "Test License 2",
		licenseNumber: "LIC-2",
		licenseType: "business",
		licenseExpiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		issuingAuthority: "State",
		issueDate: "2024-01-01",
		status: "active" as const,
		daysUntilExpiry: 15,
		$createdAt: "",
		$updatedAt: "",
	},
	{
		$id: "license-3",
		licenseName: "Expired License",
		licenseNumber: "LIC-3",
		licenseType: "business",
		licenseExpiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		issuingAuthority: "State",
		issueDate: "2024-01-01",
		status: "expired" as const,
		daysUntilExpiry: -10,
		$createdAt: "",
		$updatedAt: "",
	},
];

describe("LicenseExpiryAlertsWidget", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		HTMLElement.prototype.hasPointerCapture = () => false;
		HTMLElement.prototype.setPointerCapture = () => {};
		HTMLElement.prototype.releasePointerCapture = () => {};
		HTMLElement.prototype.scrollIntoView = () => {};

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true }),
			}),
		);

		mockUseContractAlarm.mockReturnValue({
			isPlaying: false,
			silenceAlarm: vi.fn(),
			dismissAlarm: vi.fn(),
			expiringContractsCount: 0,
			expiredContractsCount: 1,
		});

		mockUseSWR.mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: false,
			mutate: vi.fn(),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should render widget with licenses from props", () => {
		render(
			<LicenseExpiryAlertsWidget
				licenses={mockLicenses}
				maxVisible={3}
				showSettings={true}
			/>,
		);

		expect(screen.getByText("License Expiry Alerts")).toBeInTheDocument();
	});

	it("should display filter dropdown when showSettings is true", () => {
		render(
			<LicenseExpiryAlertsWidget
				licenses={mockLicenses}
				showSettings={true}
			/>,
		);

		expect(
			screen.getByRole("combobox", {
				name: /filter licenses by time period/i,
			}),
		).toBeInTheDocument();
	});

	it("should filter licenses by time period", async () => {
		const user = userEvent.setup();
		render(
			<LicenseExpiryAlertsWidget
				licenses={mockLicenses}
				showSettings={true}
			/>,
		);

		await user.click(
			screen.getByRole("combobox", {
				name: /filter licenses by time period/i,
			}),
		);
		await user.click(await screen.findByRole("option", { name: "30 days" }));

		expect(screen.getByText("Test License 1")).toBeInTheDocument();
		expect(screen.getByText("Test License 2")).toBeInTheDocument();
	});

	it("should show expired licenses when Expired filter is selected", async () => {
		const user = userEvent.setup();
		render(
			<LicenseExpiryAlertsWidget
				licenses={mockLicenses}
				showSettings={true}
			/>,
		);

		await user.click(
			screen.getByRole("combobox", {
				name: /filter licenses by time period/i,
			}),
		);
		await user.click(await screen.findByRole("option", { name: "Expired" }));

		expect(screen.getByText("Expired License")).toBeInTheDocument();
	});

	it("should show empty state when no licenses match filter", async () => {
		const user = userEvent.setup();
		render(
			<LicenseExpiryAlertsWidget
				licenses={mockLicenses}
				showSettings={true}
			/>,
		);

		await user.click(
			screen.getByRole("combobox", {
				name: /filter licenses by time period/i,
			}),
		);
		await user.click(await screen.findByRole("option", { name: "90 days" }));

		expect(screen.getByText(/no licenses/i)).toBeInTheDocument();
	});

	it("should display loading state", () => {
		mockUseSWR.mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: true,
		});

		render(<LicenseExpiryAlertsWidget />);

		expect(screen.getByText("License Expiry Alerts")).toBeInTheDocument();
		const skeletons = document.querySelectorAll(".animate-pulse");
		expect(skeletons.length).toBeGreaterThan(0);
		expect(skeletons[0].querySelector(".bg-gray-200")).toBeInTheDocument();
	});

	it("should display error state", () => {
		mockUseSWR.mockReturnValue({
			data: undefined,
			error: new Error("Failed to load"),
			isLoading: false,
		});

		render(<LicenseExpiryAlertsWidget />);

		expect(
			screen.getByText("Failed to load license data"),
		).toBeInTheDocument();
	});

	it("should not show filter when showSettings is false", () => {
		render(
			<LicenseExpiryAlertsWidget
				licenses={mockLicenses}
				showSettings={false}
			/>,
		);

		expect(
			screen.queryByRole("combobox", {
				name: /filter licenses by time period/i,
			}),
		).not.toBeInTheDocument();
	});

	it("should render compact version when compact prop is true", () => {
		render(
			<LicenseExpiryAlertsWidget
				licenses={mockLicenses}
				compact={true}
			/>,
		);

		expect(screen.getByText("License Expiry Alerts")).toBeInTheDocument();
		expect(
			screen.getByRole("region", { name: "Expiring licenses" }),
		).toBeInTheDocument();
	});
});
