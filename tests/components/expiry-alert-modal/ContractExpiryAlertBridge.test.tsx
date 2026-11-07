/**
 * Wiring tests: ContractExpiryAlertBridge (legacy single-item API) → modal.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContractExpiryAlertBridge from "@/components/expiry-alert-modal/ContractExpiryAlertBridge";
import type { UIFileDoc } from "@/types/files";

vi.mock("@/components/SplineCanvas", () => ({
	default: () => <div data-testid="expiry-spline" />,
}));

const push = vi.fn();
const toast = vi.fn();
const snoozeContract = vi.fn();
const updateStatus = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
	useToast: () => ({ toast }),
}));

vi.mock("@/hooks/useContractSnooze", () => ({
	useContractSnooze: () => ({ snoozeContract }),
}));

vi.mock("@/hooks/useUpdateContractStatus", () => ({
	useUpdateContractStatus: () => ({ updateStatus }),
}));

function makeContract(
	overrides: Partial<UIFileDoc> & {
		counterpartyContactEmail?: string;
		counterpartyContactPhone?: string;
	} = {},
): UIFileDoc {
	return {
		$id: "contract-abc",
		$createdAt: "2024-01-01T00:00:00.000Z",
		$updatedAt: "2024-01-01T00:00:00.000Z",
		type: "document",
		extension: "pdf",
		url: "/files/contract-abc",
		name: "file.pdf",
		size: 1024,
		owner: "user-1",
		users: [],
		contractName: "Community-Based Behavioral Health & Wellness Services",
		contractExpiryDate: "2026-08-12",
		status: "active",
		contractType: "government_contract",
		amount: 487_500,
		vendor: "Miami Community Wellness Alliance, Inc.",
		...overrides,
	} as UIFileDoc;
}

describe("ContractExpiryAlertBridge wiring", () => {
	const onClose = vi.fn();
	const onContractHandled = vi.fn();
	const onStatusChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		snoozeContract.mockResolvedValue(true);
		updateStatus.mockResolvedValue(true);
	});

	function renderBridge(contract = makeContract()) {
		return render(
			<ContractExpiryAlertBridge
				open
				contract={contract}
				daysRemaining={5}
				onClose={onClose}
				onContractHandled={onContractHandled}
				onStatusChange={onStatusChange}
			/>,
		);
	}

	it("Renew Contract navigates to /contracts and marks handled", async () => {
		const user = userEvent.setup();
		renderBridge();
		await user.click(screen.getByRole("button", { name: /renew contract/i }));
		expect(push).toHaveBeenCalledWith("/contracts");
		expect(onContractHandled).toHaveBeenCalledWith("contract-abc");
	});

	it("More details peeks in-modal; Open in Contracts leaves without marking handled", async () => {
		const user = userEvent.setup();
		renderBridge();
		await user.click(screen.getByRole("button", { name: /more details/i }));
		expect(onContractHandled).not.toHaveBeenCalled();
		await user.click(
			screen.getByRole("button", { name: /open in contracts/i }),
		);
		expect(push).toHaveBeenCalledWith(
			"/contracts/contract-abc/details?fromAlert=1",
		);
		expect(onContractHandled).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it("Snooze calls snoozeContract with days clamped to day-before-expiry", async () => {
		const user = userEvent.setup();
		renderBridge();
		// daysRemaining=5 → resolveContractSnoozeDays → 4
		await user.click(screen.getByRole("button", { name: /snooze 4 days/i }));
		expect(snoozeContract).toHaveBeenCalledWith({
			contractId: "contract-abc",
			days: 4,
			expiryDate: "2026-08-12",
		});
		expect(onStatusChange).toHaveBeenCalled();
		expect(onContractHandled).toHaveBeenCalledWith("contract-abc");
	});

	it("Let Expire confirm marks contract inactive", async () => {
		const user = userEvent.setup();
		renderBridge();
		await user.click(screen.getByRole("button", { name: /let expire/i }));
		// Recoil delay (420ms) before the confirm strip appears.
		await user.click(await screen.findByRole("button", { name: /^confirm$/i }));
		expect(updateStatus).toHaveBeenCalledWith({
			fileId: "contract-abc",
			status: "inactive",
			path: "/dashboard",
		});
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Contract marked inactive" }),
		);
		expect(onContractHandled).toHaveBeenCalledWith("contract-abc");
	});

	it("Contact provider opens mailto when email exists", async () => {
		const user = userEvent.setup();
		const locationMock = { href: "http://localhost/" };
		vi.stubGlobal("location", locationMock);
		renderBridge(
			makeContract({ counterpartyContactEmail: "vendor@example.com" }),
		);
		await user.click(screen.getByRole("button", { name: /contact provider/i }));
		expect(locationMock.href).toBe("mailto:vendor@example.com");
		vi.unstubAllGlobals();
	});

	it("shows muted copy when there is no contact on record", () => {
		renderBridge();
		expect(
			screen.getByText("No provider contact on record"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /contact provider/i }),
		).not.toBeInTheDocument();
	});

	it("dismiss X calls onClose only (no status / snooze)", async () => {
		const user = userEvent.setup();
		renderBridge();
		await user.click(
			screen.getByRole("button", { name: "Dismiss for this session" }),
		);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(updateStatus).not.toHaveBeenCalled();
		expect(snoozeContract).not.toHaveBeenCalled();
		expect(onContractHandled).not.toHaveBeenCalled();
	});
});
