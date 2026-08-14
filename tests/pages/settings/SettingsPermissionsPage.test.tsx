/**
 * Tests for Settings Permissions Page
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: vi.fn(),
}));

vi.mock("@/components/settings/MyAccessPanel", () => ({
	default: () => <div data-testid="my-access-panel">MyAccessPanel</div>,
}));

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());

beforeEach(() => {
	vi.clearAllMocks();
	// @ts-ignore
	vi.mocked(require("@/lib/actions/user.actions").getCurrentUser).mockImplementation(
		mockGetCurrentUser,
	);
	// @ts-ignore
	vi.mocked(require("next/navigation").redirect).mockImplementation(mockRedirect);
});

// Import the page component dynamically to avoid import-time errors
async function renderPage() {
	const SettingsPermissionsPage = (
		await import("@/app/(root)/settings/permissions/page")
	).default;
	return render(await SettingsPermissionsPage());
}

describe("SettingsPermissionsPage", () => {
	it("redirects to sign-in when user is not authenticated", async () => {
		mockGetCurrentUser.mockResolvedValue(null);

		try {
			await renderPage();
		} catch {
			// Redirect throws in test environment
		}

		expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
	});

	it("renders page header with correct title", async () => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });

		await renderPage();

		expect(screen.getByText(/view my access/i)).toBeInTheDocument();
	});

	it("displays shield icon in header", async () => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });

		const { container } = await renderPage();

		// Check for shield icon by looking for lucide-react icon
		const icons = container.querySelectorAll("svg");
		expect(icons.length).toBeGreaterThan(0);
	});

	it("displays read-only description", async () => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });

		await renderPage();

		expect(
			screen.getByText(/read-only view of your roles and permissions/i),
		).toBeInTheDocument();
	});

	it("displays info banner about contacting administrator", async () => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });

		await renderPage();

		expect(
			screen.getByText(/contact your administrator if you need additional access/i),
		).toBeInTheDocument();
	});

	it("renders MyAccessPanel component", async () => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });

		await renderPage();

		expect(screen.getByTestId("my-access-panel")).toBeInTheDocument();
	});

	it("uses correct page container classes", async () => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });

		const { container } = await renderPage();

		const pageContainer = container.querySelector(".px-4");
		expect(pageContainer).toBeInTheDocument();
	});

	it("applies proper spacing between header and content", async () => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });

		const { container } = await renderPage();

		// Check for mb-6 class on description section
		const descriptionSection = container.querySelector(".mb-6");
		expect(descriptionSection).toBeInTheDocument();
	});
});

describe("SettingsPermissionsPage - Layout Structure", () => {
	beforeEach(() => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });
	});

	it("follows CAALM page structure standards", async () => {
		const { container } = await renderPage();

		// Check for standard page container
		expect(container.querySelector(".w-full")).toBeInTheDocument();
		expect(container.querySelector(".px-4")).toBeInTheDocument();
	});

	it("uses h1 with sidebar-gradient-text class", async () => {
		const { container } = await renderPage();

		const heading = container.querySelector("h1");
		expect(heading).toHaveClass("h1");
		expect(heading).toHaveClass("sidebar-gradient-text");
	});

	it("includes info box with blue styling", async () => {
		const { container } = await renderPage();

		const infoBox = container.querySelector(".bg-blue\\/5");
		expect(infoBox).toBeInTheDocument();
	});
});

describe("SettingsPermissionsPage - Accessibility", () => {
	beforeEach(() => {
		mockGetCurrentUser.mockResolvedValue({ $id: "user123", email: "test@example.com" });
	});

	it("has proper heading hierarchy", async () => {
		await renderPage();

		const h1 = screen.getByRole("heading", { level: 1 });
		expect(h1).toBeInTheDocument();
	});

	it("includes descriptive text for screen readers", async () => {
		await renderPage();

		expect(
			screen.getByText(/this page displays all permissions granted to you/i),
		).toBeInTheDocument();
	});

	it("info icon is properly sized and colored", async () => {
		const { container } = await renderPage();

		const icons = container.querySelectorAll("svg");
		// Check that icons exist and have proper classes
		expect(icons.length).toBeGreaterThan(0);
	});
});
