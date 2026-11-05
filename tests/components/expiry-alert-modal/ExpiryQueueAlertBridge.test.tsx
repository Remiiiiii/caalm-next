/**
 * Wiring tests: ExpiryQueueAlertBridge (carousel API) → modal action matrix.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpiryQueueAlertBridge from "@/components/expiry-alert-modal/ExpiryQueueAlertBridge";
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";

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

function contractItem(days = 5): ExpiryQueueItem {
	return {
		kind: "contract",
		id: "contract-abc",
		days,
		file: {
			$id: "contract-abc",
			contractName: "Government Services Agreement",
			contractExpiryDate: "2026-08-12",
			status: "active",
			amount: 175_000,
			name: "file.pdf",
		} as UIFileDoc,
	};
}

function licenseItem(days = 9): ExpiryQueueItem {
	return {
		kind: "license",
		id: "license-xyz",
		days,
		license: {
			$id: "license-xyz",
			licenseName: "Adobe Creative Cloud",
			licenseExpiryDate: "2026-07-01",
			status: "active",
			cost: 8_640,
		} as unknown as License,
	};
}

describe("ExpiryQueueAlertBridge — contract", () => {
	const onClose = vi.fn();
	const onItemHandled = vi.fn();
	const onStatusChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		snoozeContract.mockResolvedValue(true);
		updateStatus.mockResolvedValue(true);
	});

	function renderBridge(item = contractItem()) {
		return render(
			<ExpiryQueueAlertBridge
				item={item}
				onClose={onClose}
				onItemHandled={onItemHandled}
				onStatusChange={onStatusChange}
			/>,
		);
	}

	it("View Details navigates with highlight (works without desktop gate)", async () => {
		const user = userEvent.setup();
		renderBridge();
		await user.click(screen.getByRole("button", { name: /view details/i }));
		expect(push).toHaveBeenCalledWith("/contracts?highlight=contract-abc");
		expect(onItemHandled).toHaveBeenCalled();
	});

	it("Snooze 30 days snoozes the contract", async () => {
		const user = userEvent.setup();
		renderBridge();
		await user.click(screen.getByRole("button", { name: /snooze 30 days/i }));
		expect(snoozeContract).toHaveBeenCalledWith({
			contractId: "contract-abc",
			days: 30,
			expiryDate: "2026-08-12",
		});
	});

	it("overdue contract offers Mark Inactive, not Snooze", () => {
		renderBridge(contractItem(-4));
		expect(
			screen.getByRole("button", { name: /mark inactive/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /snooze/i }),
		).not.toBeInTheDocument();
	});
});

describe("ExpiryQueueAlertBridge — license", () => {
	const onClose = vi.fn();
	const onItemHandled = vi.fn();
	const onStatusChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	function renderBridge(item = licenseItem()) {
		return render(
			<ExpiryQueueAlertBridge
				item={item}
				onClose={onClose}
				onItemHandled={onItemHandled}
				onStatusChange={onStatusChange}
			/>,
		);
	}

	it("View Details navigates to the license without a laptop gate", async () => {
		const user = userEvent.setup();
		renderBridge();
		await user.click(screen.getByRole("button", { name: /view details/i }));
		expect(push).toHaveBeenCalledWith("/licenses?highlight=license-xyz");
		expect(onItemHandled).toHaveBeenCalled();
	});

	it("offers Dismiss for now and no snooze / let expire", async () => {
		const user = userEvent.setup();
		renderBridge();
		expect(
			screen.queryByRole("button", { name: /snooze/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /let expire/i }),
		).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /dismiss for now/i }));
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Reminder dismissed" }),
		);
		expect(onItemHandled).toHaveBeenCalled();
		// A license dismissal must never touch the contract status API.
		expect(updateStatus).not.toHaveBeenCalled();
	});
});
