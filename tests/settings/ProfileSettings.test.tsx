import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.fn();
const mockSetUser = vi.fn();
const mockRefreshUser = vi.fn();
const mockMutate = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
	useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/contexts/AuthContext", () => ({
	useAuth: () => ({
		user: {
			$id: "user-1",
			accountId: "acct-1",
			name: "Alex Rivera",
			email: "alex@example.com",
			division: "Operations",
			department: "Administration",
			role: "Manager",
		},
		setUser: mockSetUser,
		refreshUser: mockRefreshUser,
		loading: false,
	}),
}));

vi.mock("swr", () => ({
	default: () => ({
		data: undefined,
		error: undefined,
		isLoading: false,
		mutate: mockMutate,
	}),
}));

import ProfileSettings from "@/components/settings/ProfileSettings";

describe("ProfileSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshUser.mockResolvedValue(undefined);
		mockMutate.mockResolvedValue(undefined);
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ user: { fullName: "Alex Rivera" } }),
		}) as unknown as typeof fetch;
	});

	it("loads the signed-in user's profile and keeps email read-only", () => {
		render(<ProfileSettings />);

		expect(screen.getByLabelText("Full Name")).toHaveValue("Alex Rivera");
		expect(screen.getByLabelText("Email Address")).toHaveValue(
			"alex@example.com",
		);
		expect(screen.getByLabelText("Email Address")).toBeDisabled();
		expect(screen.getByLabelText("Department")).toHaveValue("Administration");
		expect(screen.getByLabelText("Division")).toHaveValue("Operations");
		expect(screen.getByLabelText("Role")).toHaveValue("Manager");
		expect(
			screen.getByText(/email cannot be changed here/i),
		).toBeInTheDocument();
	});

	it("saves the display name through the self-service profile route", async () => {
		render(<ProfileSettings />);

		fireEvent.change(screen.getByLabelText("Full Name"), {
			target: { value: "Alex Rivera-Smith" },
		});
		fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/user/profile",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ fullName: "Alex Rivera-Smith" }),
				}),
			);
		});
		expect(global.fetch).not.toHaveBeenCalledWith(
			"/api/user/update",
			expect.anything(),
		);
		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: "Profile Updated" }),
			);
		});
	});
});
