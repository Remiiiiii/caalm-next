/**
 * Wiring tests for full-screen ExpiryAlertModal action controls.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpiryAlertModal, {
	type ExpiryAlertModalProps,
	snoozeDurationToDays,
} from "@/components/expiry-alert-modal/ExpiryAlertModal";

vi.mock("@/components/contract-expiry-modal/SplineExpiryScene", () => ({
	default: () => <div data-testid="spline-scene" />,
}));

function renderModal(overrides: Partial<ExpiryAlertModalProps> = {}) {
	const props: ExpiryAlertModalProps = {
		open: true,
		entityType: "contract",
		title: "Community-Based Behavioral Health & Wellness Services",
		expiryDate: "2026-08-12",
		daysRemaining: 5,
		amount: 487_500,
		status: "active",
		typeLabel: "Government Contract",
		vendor: "Miami Community Wellness Alliance, Inc.",
		onRenew: vi.fn(),
		onViewDetails: vi.fn(),
		onSnooze: vi.fn(),
		onLetExpire: vi.fn(),
		onContactProvider: vi.fn(),
		onClose: vi.fn(),
		...overrides,
	};

	const view = render(<ExpiryAlertModal {...props} />);
	return { ...view, props };
}

describe("ExpiryAlertModal button wiring", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("does not render when closed", () => {
		renderModal({ open: false });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("calls onClose from the dismiss (X) button", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.click(
			screen.getByRole("button", { name: "Dismiss for this session" }),
		);
		expect(props.onClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose from the backdrop", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.click(
			screen.getByRole("button", {
				name: "Dismiss expiry alert for this session",
			}),
		);
		expect(props.onClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose on Escape", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.keyboard("{Escape}");
		expect(props.onClose).toHaveBeenCalledTimes(1);
	});

	it("calls onRenew from Renew Contract", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.click(
			screen.getByRole("button", { name: /renew contract/i }),
		);
		expect(props.onRenew).toHaveBeenCalledTimes(1);
	});

	it("calls onViewDetails from View Details", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.click(
			screen.getByRole("button", { name: /view details/i }),
		);
		expect(props.onViewDetails).toHaveBeenCalledTimes(1);
	});

	it("calls onSnooze with each duration from the Snooze menu", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.click(screen.getByRole("button", { name: /snooze/i }));
		await user.click(await screen.findByRole("menuitem", { name: "24 hours" }));
		expect(props.onSnooze).toHaveBeenCalledWith("24h");

		await user.click(screen.getByRole("button", { name: /snooze/i }));
		await user.click(await screen.findByRole("menuitem", { name: "3 days" }));
		expect(props.onSnooze).toHaveBeenCalledWith("3d");

		await user.click(screen.getByRole("button", { name: /snooze/i }));
		await user.click(
			await screen.findByRole("menuitem", { name: "Next week" }),
		);
		expect(props.onSnooze).toHaveBeenCalledWith("1w");
		expect(props.onSnooze).toHaveBeenCalledTimes(3);
	});

	it("calls onContactProvider from Contact Provider", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.click(
			screen.getByRole("button", { name: /contact provider/i }),
		);
		expect(props.onContactProvider).toHaveBeenCalledTimes(1);
	});

	it("hides Contact Provider when onContactProvider is omitted", () => {
		renderModal({ onContactProvider: undefined });
		expect(
			screen.queryByRole("button", { name: /contact provider/i }),
		).not.toBeInTheDocument();
	});

	it("requires confirm before calling onLetExpire", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.click(screen.getByRole("button", { name: /let expire/i }));
		expect(props.onLetExpire).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: /^confirm$/i }));
		expect(props.onLetExpire).toHaveBeenCalledTimes(1);
	});

	it("cancels let-expire confirm without calling onLetExpire", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();

		await user.click(screen.getByRole("button", { name: /let expire/i }));
		await user.click(screen.getByRole("button", { name: /^cancel$/i }));
		expect(props.onLetExpire).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: /let expire/i }),
		).toBeInTheDocument();
	});

	it("disables primary actions when isBusy", () => {
		renderModal({ isBusy: true });

		expect(
			screen.getByRole("button", { name: /renew contract/i }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /view details/i }),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: /snooze/i })).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /contact provider/i }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /let expire/i }),
		).toBeDisabled();
	});

	it("shows Renew License label for license entity type", () => {
		renderModal({ entityType: "license" });
		expect(
			screen.getByRole("button", { name: /renew license/i }),
		).toBeInTheDocument();
		expect(within(screen.getByRole("dialog")).getByText("Issuer")).toBeInTheDocument();
	});
});

describe("snoozeDurationToDays", () => {
	it("maps snooze options to day counts used by the bridge", () => {
		expect(snoozeDurationToDays("24h")).toBe(1);
		expect(snoozeDurationToDays("3d")).toBe(3);
		expect(snoozeDurationToDays("1w")).toBe(7);
	});
});
