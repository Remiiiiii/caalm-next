import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const endSession = vi.fn().mockResolvedValue(undefined);

vi.mock("@/contexts/ImpersonationContext", () => ({
	useImpersonation: () => ({
		status: {
			active: true,
			readOnly: true,
			expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
			target: {
				$id: "user-2",
				fullName: "Jane Viewer",
				email: "jane@example.com",
			},
		},
		loading: false,
		isImpersonating: true,
		readOnly: true,
		refreshStatus: vi.fn(),
		endSession,
	}),
}));

describe("ImpersonationBanner", () => {
	beforeEach(() => {
		endSession.mockClear();
	});

	it("shows the target name and End session control", async () => {
		const { ImpersonationBanner } = await import(
			"@/components/impersonation/ImpersonationBanner"
		);
		render(<ImpersonationBanner />);
		expect(screen.getByTestId("impersonation-banner")).toBeInTheDocument();
		expect(screen.getByTestId("impersonation-banner")).toHaveTextContent(
			"Jane Viewer",
		);
		expect(screen.getByText(/read-only/i)).toBeInTheDocument();
		const button = screen.getByRole("button", { name: /end session/i });
		await userEvent.click(button);
		expect(endSession).toHaveBeenCalled();
	});
});
