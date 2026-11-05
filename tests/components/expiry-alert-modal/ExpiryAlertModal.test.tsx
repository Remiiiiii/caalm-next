/**
 * Wiring tests for the four-zone ExpiryAlertModal card.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpiryAlertModal, {
	type ExpiryAlertModalProps,
} from "@/components/expiry-alert-modal/ExpiryAlertModal";

vi.mock("@/components/SplineCanvas", () => ({
	default: () => <div data-testid="expiry-spline" />,
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
		onRenew: vi.fn(),
		onViewDetails: vi.fn(),
		onSnooze: vi.fn(),
		onDismiss: vi.fn(),
		onLetExpire: vi.fn(),
		onContactProvider: vi.fn(),
		contactEmail: "vendor@example.com",
		onClose: vi.fn(),
		...overrides,
	};

	const view = render(<ExpiryAlertModal {...props} />);
	return { ...view, props };
}

describe("ExpiryAlertModal card wiring", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("does not render when closed", () => {
		renderModal({ open: false });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("shows the urgency band copy from daysRemaining", () => {
		renderModal({ daysRemaining: 48, expiryDate: "2026-12-13" });
		expect(screen.getByText(/expires in 48 days/i)).toBeInTheDocument();
	});

	it("reads overdue copy when past due", () => {
		renderModal({ daysRemaining: -3 });
		expect(screen.getByText(/expired 3 days ago/i)).toBeInTheDocument();
		expect(screen.getByText("Days overdue")).toBeInTheDocument();
	});

	it("calls onClose from the dismiss (X) button", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();
		await user.click(
			screen.getByRole("button", { name: "Dismiss for this session" }),
		);
		expect(props.onClose).toHaveBeenCalledTimes(1);
	});

	it("does not close from the backdrop or Escape", async () => {
		const user = userEvent.setup();
		const { props, container } = renderModal();
		const backdrop = container.querySelector(
			'[aria-hidden="true"].absolute.inset-0',
		);
		expect(backdrop).toBeTruthy();
		await user.click(backdrop as Element);
		await user.keyboard("{Escape}");
		expect(props.onClose).not.toHaveBeenCalled();
	});

	it("calls onRenew and onViewDetails", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();
		await user.click(screen.getByRole("button", { name: /renew contract/i }));
		await user.click(screen.getByRole("button", { name: /view details/i }));
		expect(props.onRenew).toHaveBeenCalledTimes(1);
		expect(props.onViewDetails).toHaveBeenCalledTimes(1);
	});

	it("calls onSnooze once from the single 30-day snooze button", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();
		await user.click(screen.getByRole("button", { name: /snooze 30 days/i }));
		expect(props.onSnooze).toHaveBeenCalledTimes(1);
	});

	it("requires confirm before calling onLetExpire", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();
		await user.click(screen.getByRole("button", { name: /let expire/i }));
		expect(props.onLetExpire).not.toHaveBeenCalled();
		// Recoil delay (420ms) before the confirm strip appears.
		await user.click(
			await screen.findByRole("button", { name: /^confirm$/i }),
		);
		expect(props.onLetExpire).toHaveBeenCalledTimes(1);
	});

	it("overdue contract shows Mark Inactive instead of Snooze", () => {
		renderModal({ daysRemaining: -1 });
		expect(
			screen.getByRole("button", { name: /mark inactive/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /snooze/i }),
		).not.toBeInTheDocument();
	});

	it("license shows Dismiss for now and no snooze / let expire", () => {
		renderModal({ entityType: "license", onContactProvider: undefined });
		expect(
			screen.getByRole("button", { name: /renew license/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /dismiss for now/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /snooze/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /let expire/i }),
		).not.toBeInTheDocument();
		expect(
			within(screen.getByRole("dialog")).getByText(/can't be snoozed by date/i),
		).toBeInTheDocument();
	});

	it("shows muted copy instead of a contact button when no contact", () => {
		renderModal({ contactEmail: undefined, contactPhone: undefined });
		expect(
			screen.getByText("No provider contact on record"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /contact provider/i }),
		).not.toBeInTheDocument();
	});

	it("calls onContactProvider when a contact exists", async () => {
		const user = userEvent.setup();
		const { props } = renderModal();
		await user.click(screen.getByRole("button", { name: /contact provider/i }));
		expect(props.onContactProvider).toHaveBeenCalledTimes(1);
	});

	it("disables primary actions when isBusy", () => {
		renderModal({ isBusy: true });
		expect(
			screen.getByRole("button", { name: /renew contract/i }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /view details/i }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /snooze 30 days/i }),
		).toBeDisabled();
	});

	it("shows an inline laptop note under Renew when renewRequiresDesktop", () => {
		renderModal({ renewRequiresDesktop: true });
		expect(screen.getByText(/open on a laptop to renew/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /renew contract/i }),
		).toBeInTheDocument();
	});

	it("uses Renews copy when the licence auto-renews", () => {
		renderModal({
			entityType: "license",
			renewing: true,
			daysRemaining: 10,
			expiryDate: "2026-06-01",
		});
		expect(screen.getByText(/renews in 10 days/i)).toBeInTheDocument();
	});

	it("wires Stay here and mute from the narration bar", async () => {
		const user = userEvent.setup();
		const onStayHere = vi.fn();
		const onToggleMute = vi.fn();
		renderModal({
			narration: {
				muted: false,
				isPlaying: true,
				onToggleMute,
				onStayHere,
				countdownSeconds: 6,
				nextLabel: "Adobe Creative Cloud",
				paused: false,
			},
		});
		expect(screen.getByText(/reading this alert aloud/i)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /stay here/i }));
		expect(onStayHere).toHaveBeenCalledTimes(1);
		await user.click(screen.getByRole("button", { name: "Mute narration" }));
		expect(onToggleMute).toHaveBeenCalledTimes(1);
	});

	it("jumps the carousel from a queue row", async () => {
		const user = userEvent.setup();
		const onJump = vi.fn();
		renderModal({
			queue: {
				rows: [
					{
						id: "contract:a",
						kind: "contract",
						title: "NIH SBIR Phase I",
						days: 48,
						dateLabel: "Dec 13, 2026",
						amount: 175_000,
						done: false,
					},
					{
						id: "license:b",
						kind: "license",
						title: "Adobe Creative Cloud",
						days: 26,
						dateLabel: "Jul 1, 2026",
						amount: 8_640,
						done: false,
					},
				],
				currentIndex: 0,
				nextIndex: 1,
				overdue: 0,
				within30: 1,
				amountSum: 183_640,
				countdownSeconds: 6,
				countdownTotal: 6,
				paused: false,
				onJump,
				onPause: vi.fn(),
				onDismissAll: vi.fn(),
				defaultExpanded: true,
			},
		});
		await user.click(
			screen.getByRole("button", {
				name: /adobe creative cloud/i,
			}),
		);
		expect(onJump).toHaveBeenCalledWith(1);
	});
});
