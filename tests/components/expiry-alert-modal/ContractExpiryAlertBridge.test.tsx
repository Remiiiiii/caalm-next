/**
 * Wiring tests: ContractExpiryAlertBridge → ExpiryAlertModal actions.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContractExpiryAlertBridge from "@/components/expiry-alert-modal/ContractExpiryAlertBridge";
import type { UIFileDoc } from "@/types/files";

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

vi.mock("@/components/contract-expiry-modal/SplineExpiryScene", () => ({
	default: () => <div data-testid="spline-scene" />,
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

		await user.click(
			screen.getByRole("button", { name: /renew contract/i }),
		);

		expect(push).toHaveBeenCalledWith("/contracts");
		expect(onContractHandled).toHaveBeenCalledWith("contract-abc");
	});

	it("View Details navigates with highlight and marks handled", async () => {
		const user = userEvent.setup();
		renderBridge();

		await user.click(
			screen.getByRole("button", { name: /view details/i }),
		);

		expect(push).toHaveBeenCalledWith(
			"/contracts?highlight=contract-abc",
		);
		expect(onContractHandled).toHaveBeenCalledWith("contract-abc");
	});

	it("Snooze 3 days calls snoozeContract with mapped days", async () => {
		const user = userEvent.setup();
		renderBridge();

		await user.click(screen.getByRole("button", { name: /snooze/i }));
		await user.click(await screen.findByRole("menuitem", { name: "3 days" }));

		expect(snoozeContract).toHaveBeenCalledWith({
			contractId: "contract-abc",
			days: 3,
			expiryDate: "2026-08-12",
		});
		expect(onStatusChange).toHaveBeenCalled();
		expect(onContractHandled).toHaveBeenCalledWith("contract-abc");
	});

	it("Let Expire confirm marks contract inactive", async () => {
		const user = userEvent.setup();
		renderBridge();

		await user.click(screen.getByRole("button", { name: /let expire/i }));
		await user.click(screen.getByRole("button", { name: /^confirm$/i }));

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

	it("Contact Provider opens mailto when email exists", async () => {
		const user = userEvent.setup();
		const locationMock = { href: "http://localhost/" };
		vi.stubGlobal("location", locationMock);

		renderBridge(
			makeContract({
				counterpartyContactEmail: "vendor@example.com",
			}),
		);

		await user.click(
			screen.getByRole("button", { name: /contact provider/i }),
		);

		expect(locationMock.href).toBe("mailto:vendor@example.com");
		vi.unstubAllGlobals();
	});

	it("Contact Provider toasts when no email or phone", async () => {
		const user = userEvent.setup();
		renderBridge();

		await user.click(
			screen.getByRole("button", { name: /contact provider/i }),
		);

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Contact information not available",
				variant: "destructive",
			}),
		);
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
