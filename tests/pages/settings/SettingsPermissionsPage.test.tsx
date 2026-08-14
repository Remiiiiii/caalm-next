/**
 * Simplified tests for Settings Permissions Page
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockRedirect = vi.fn();

// Mock dependencies
vi.mock("next/navigation", () => ({
	redirect: (path: string) => mockRedirect(path),
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/components/settings/MyAccessPanel", () => ({
	default: () => <div data-testid="my-access-panel">MyAccessPanel</div>,
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("SettingsPermissionsPage - Authentication", () => {
	it("redirects to sign-in when user is not authenticated", async () => {
		mockGetCurrentUser.mockResolvedValue(null);

		const SettingsPermissionsPage = (
			await import("@/app/(root)/settings/permissions/page")
		).default;

		try {
			await SettingsPermissionsPage();
		} catch (error) {
			// Redirect throws in test environment
		}

		expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
	});
});

describe("SettingsPermissionsPage - Content Display", () => {
	beforeEach(() => {
		mockGetCurrentUser.mockResolvedValue({
			$id: "user123",
			email: "test@example.com",
		});
	});

	it("renders page header with correct title", async () => {
		const SettingsPermissionsPage = (
			await import("@/app/(root)/settings/permissions/page")
		).default;
		const element = await SettingsPermissionsPage();
		render(element);

		expect(screen.getByText(/view my access/i)).toBeInTheDocument();
	});

	it("displays read-only description", async () => {
		const SettingsPermissionsPage = (
			await import("@/app/(root)/settings/permissions/page")
		).default;
		const element = await SettingsPermissionsPage();
		render(element);

		expect(
			screen.getByText(/read-only view of your roles and permissions/i),
		).toBeInTheDocument();
	});

	it("displays info banner about contacting administrator", async () => {
		const SettingsPermissionsPage = (
			await import("@/app/(root)/settings/permissions/page")
		).default;
		const element = await SettingsPermissionsPage();
		render(element);

		expect(
			screen.getByText(/contact your administrator if you need additional access/i),
		).toBeInTheDocument();
	});

	it("renders MyAccessPanel component", async () => {
		const SettingsPermissionsPage = (
			await import("@/app/(root)/settings/permissions/page")
		).default;
		const element = await SettingsPermissionsPage();
		render(element);

		expect(screen.getByTestId("my-access-panel")).toBeInTheDocument();
	});
});

describe("SettingsPermissionsPage - Layout Structure", () => {
	beforeEach(() => {
		mockGetCurrentUser.mockResolvedValue({
			$id: "user123",
			email: "test@example.com",
		});
	});

	it("uses correct page container classes", async () => {
		const SettingsPermissionsPage = (
			await import("@/app/(root)/settings/permissions/page")
		).default;
		const element = await SettingsPermissionsPage();
		const { container } = render(element);

		const pageContainer = container.querySelector(".w-full");
		expect(pageContainer).toBeInTheDocument();
		expect(pageContainer).toHaveClass("px-4");
	});

	it("uses h1 with sidebar-gradient-text class", async () => {
		const SettingsPermissionsPage = (
			await import("@/app/(root)/settings/permissions/page")
		).default;
		const element = await SettingsPermissionsPage();
		const { container } = render(element);

		const heading = container.querySelector("h1");
		expect(heading).toHaveClass("h1");
		expect(heading).toHaveClass("sidebar-gradient-text");
	});

	it("includes info box with blue styling", async () => {
		const SettingsPermissionsPage = (
			await import("@/app/(root)/settings/permissions/page")
		).default;
		const element = await SettingsPermissionsPage();
		const { container } = render(element);

		const infoBox = container.querySelector(".bg-blue\\/5");
		expect(infoBox).toBeInTheDocument();
	});
});
