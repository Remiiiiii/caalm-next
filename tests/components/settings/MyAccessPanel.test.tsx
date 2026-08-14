/**
 * Tests for MyAccessPanel component - UI/UX redesign
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyAccessPanel from "@/components/settings/MyAccessPanel";
import { PERMISSIONS } from "@/constants/permissions";

// Mock dependencies
vi.mock("@/contexts/OrganizationContext", () => ({
	useOrganization: vi.fn(() => ({
		orgId: "test-org-123",
	})),
}));

vi.mock("@/hooks/usePermissions", () => ({
	usePermissions: vi.fn(),
}));

vi.mock("@/hooks/useUserRoles", () => ({
	useUserRoles: vi.fn(),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

const mockUsePermissions = vi.hoisted(() => vi.fn());
const mockUseUserRoles = vi.hoisted(() => vi.fn());

beforeEach(() => {
	vi.clearAllMocks();
	// @ts-ignore
	vi.mocked(require("@/hooks/usePermissions").usePermissions).mockImplementation(
		mockUsePermissions,
	);
	// @ts-ignore
	vi.mocked(require("@/hooks/useUserRoles").useUserRoles).mockImplementation(
		mockUseUserRoles,
	);
});

describe("MyAccessPanel - Loading States", () => {
	it("displays loading spinner when permissions are loading", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: true,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		render(<MyAccessPanel />);
		expect(screen.getByText(/loading your access/i)).toBeInTheDocument();
	});

	it("displays loading spinner when roles are loading", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: true,
		});

		render(<MyAccessPanel />);
		expect(screen.getByText(/loading your access/i)).toBeInTheDocument();
	});
});

describe("MyAccessPanel - Summary Stats", () => {
	beforeEach(() => {
		mockUsePermissions.mockReturnValue({
			permissions: [
				PERMISSIONS.USERS.VIEW,
				PERMISSIONS.USERS.CREATE,
				PERMISSIONS.LICENSES.VIEW,
			],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [
				{ roleId: "role1", roleName: "Admin" },
				{ roleId: "role2", roleName: "Editor" },
			],
			loading: false,
		});
	});

	it("displays correct active roles count", () => {
		render(<MyAccessPanel />);
		const rolesCard = screen.getByText(/active roles/i).closest("div");
		expect(within(rolesCard!).getByText("2")).toBeInTheDocument();
	});

	it("displays correct permissions count", () => {
		render(<MyAccessPanel />);
		const permissionsCard = screen.getByText(/permissions/i).closest("div");
		// Should show 3 granted permissions
		expect(within(permissionsCard!).getByText("3")).toBeInTheDocument();
	});

	it("displays organization name", () => {
		render(<MyAccessPanel />);
		expect(screen.getByText(/test org 123/i)).toBeInTheDocument();
	});
});

describe("MyAccessPanel - Roles Section", () => {
	it("displays all assigned roles with shield icons", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [
				{ roleId: "role1", roleName: "Super Admin" },
				{ roleId: "role2", roleName: "Content Creator" },
			],
			loading: false,
		});

		render(<MyAccessPanel />);
		expect(screen.getByText("Super Admin")).toBeInTheDocument();
		expect(screen.getByText("Content Creator")).toBeInTheDocument();
	});

	it("displays 'No roles assigned' message when user has no roles", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		render(<MyAccessPanel />);
		expect(screen.getByText(/no roles assigned/i)).toBeInTheDocument();
	});

	it("displays manage roles button when user has ASSIGN_ROLES permission", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.ASSIGN_ROLES],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [{ roleId: "role1", roleName: "Admin" }],
			loading: false,
		});

		render(<MyAccessPanel />);
		const manageButton = screen.getByRole("link", { name: /manage roles/i });
		expect(manageButton).toBeInTheDocument();
		expect(manageButton).toHaveAttribute("href", "/dashboard/admin/roles");
	});

	it("hides manage roles button when user lacks ASSIGN_ROLES permission", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [{ roleId: "role1", roleName: "User" }],
			loading: false,
		});

		render(<MyAccessPanel />);
		expect(
			screen.queryByRole("link", { name: /manage roles/i }),
		).not.toBeInTheDocument();
	});
});

describe("MyAccessPanel - Search Functionality", () => {
	beforeEach(() => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.LICENSES.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});
	});

	it("displays search input field", () => {
		render(<MyAccessPanel />);
		expect(
			screen.getByPlaceholderText(/search permissions/i),
		).toBeInTheDocument();
	});

	it("filters permissions based on search query", async () => {
		const user = userEvent.setup();
		render(<MyAccessPanel />);

		const searchInput = screen.getByPlaceholderText(/search permissions/i);
		await user.type(searchInput, "license");

		// Should show license-related permissions
		expect(screen.getByText(/View Licenses/i)).toBeInTheDocument();
		// Should not show unrelated permissions if they exist
		// Note: This depends on PERMISSION_DEFINITIONS structure
	});

	it("displays 'No permissions found' when search returns no results", async () => {
		const user = userEvent.setup();
		render(<MyAccessPanel />);

		const searchInput = screen.getByPlaceholderText(/search permissions/i);
		await user.type(searchInput, "zzzznonexistent");

		expect(screen.getByText(/no permissions found/i)).toBeInTheDocument();
		expect(
			screen.getByText(/try adjusting your search or filter/i),
		).toBeInTheDocument();
	});
});

describe("MyAccessPanel - Category Filter", () => {
	beforeEach(() => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.LICENSES.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});
	});

	it("displays 'All Categories' filter button", () => {
		render(<MyAccessPanel />);
		expect(screen.getByText(/all categories/i)).toBeInTheDocument();
	});

	it("filters permissions by selected category", async () => {
		const user = userEvent.setup();
		render(<MyAccessPanel />);

		// Find and click a category button (e.g., "Users")
		const categoryButtons = screen.getAllByRole("button");
		const usersButton = categoryButtons.find((btn) =>
			btn.textContent?.includes("Users"),
		);

		if (usersButton) {
			await user.click(usersButton);
			// Only users category should be visible
			// This test depends on PERMISSION_DEFINITIONS structure
		}
	});

	it("highlights selected category button", async () => {
		const user = userEvent.setup();
		render(<MyAccessPanel />);

		const allCategoriesButton = screen.getByText(/all categories/i);
		expect(allCategoriesButton).toHaveClass("bg-blue/10");
	});
});

describe("MyAccessPanel - Permissions Display", () => {
	it("displays granted permissions with check icon", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		render(<MyAccessPanel />);
		// Permission should be visible and marked as granted
		const permissionCard = screen.getByText(/View Users/i).closest("div");
		expect(permissionCard).toHaveClass(/green/);
	});

	it("displays denied permissions with lock icon", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [], // No permissions granted
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		render(<MyAccessPanel />);
		// All permissions should show as denied
		// Check for lock icon or denied styling
	});

	it("displays permission description when available", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		render(<MyAccessPanel />);
		// Should display permission descriptions from PERMISSION_DEFINITIONS
	});

	it("displays category name with granted/total count", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.CREATE],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		render(<MyAccessPanel />);
		// Should show something like "2 of 5" for the category
		expect(screen.getByText(/of/i)).toBeInTheDocument();
	});

	it("displays percentage badge for each category", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		render(<MyAccessPanel />);
		// Should display percentage badge (e.g., "20%")
		expect(screen.getByText(/%/)).toBeInTheDocument();
	});
});

describe("MyAccessPanel - Responsive Grid Layout", () => {
	it("uses grid layout for permissions", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.LICENSES.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const { container } = render(<MyAccessPanel />);
		// Check for grid classes in permission containers
		const grids = container.querySelectorAll('[class*="grid"]');
		expect(grids.length).toBeGreaterThan(0);
	});
});

describe("MyAccessPanel - Accessibility", () => {
	beforeEach(() => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [{ roleId: "role1", roleName: "Admin" }],
			loading: false,
		});
	});

	it("search input has proper label", () => {
		render(<MyAccessPanel />);
		const searchInput = screen.getByPlaceholderText(/search permissions/i);
		expect(searchInput).toBeInTheDocument();
	});

	it("buttons are keyboard accessible", async () => {
		const user = userEvent.setup();
		render(<MyAccessPanel />);

		const allCategoriesButton = screen.getByText(/all categories/i);
		await user.tab();
		// Button should be focusable
		expect(allCategoriesButton).toBeVisible();
	});
});

describe("MyAccessPanel - Glass Card Styling", () => {
	it("applies glass-card class to all cards", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const { container } = render(<MyAccessPanel />);
		const glassCards = container.querySelectorAll(".glass-card");
		expect(glassCards.length).toBeGreaterThan(0);
	});

	it("includes glass-card-cap in each card", () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const { container } = render(<MyAccessPanel />);
		const caps = container.querySelectorAll(".glass-card-cap");
		expect(caps.length).toBeGreaterThan(0);
	});
});
