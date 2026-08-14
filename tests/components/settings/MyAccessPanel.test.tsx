/**
 * Simplified tests for MyAccessPanel component - UI/UX redesign
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const mockUsePermissions = vi.fn();
const mockUseUserRoles = vi.fn();
const mockUseOrganization = vi.fn();

// Mock dependencies
vi.mock("@/contexts/OrganizationContext", () => ({
	useOrganization: () => mockUseOrganization(),
}));

vi.mock("@/hooks/usePermissions", () => ({
	usePermissions: () => mockUsePermissions(),
}));

vi.mock("@/hooks/useUserRoles", () => ({
	useUserRoles: () => mockUseUserRoles(),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

beforeEach(() => {
	vi.clearAllMocks();
	mockUseOrganization.mockReturnValue({
		orgId: "test-org-123",
	});
});

describe("MyAccessPanel - Core Rendering", () => {
	it("displays loading spinner when loading", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: true,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);
		expect(screen.getByText(/loading your access/i)).toBeInTheDocument();
	});

	it("renders stat cards when loaded", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [{ roleId: "role1", roleName: "Admin" }],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		const { container } = render(<MyAccessPanel />);

		expect(screen.getByText(/active roles/i)).toBeInTheDocument();
		expect(screen.getByText("Permissions")).toBeInTheDocument();
		// Check for Organization card title specifically
		const orgCard = container.querySelector(".sidebar-gradient-text");
		expect(orgCard).toBeInTheDocument();
	});

	it("displays search input", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);

		expect(
			screen.getByPlaceholderText(/search permissions/i),
		).toBeInTheDocument();
	});

	it("displays category filter buttons", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);

		expect(screen.getByText(/all categories/i)).toBeInTheDocument();
	});
});

describe("MyAccessPanel - Roles Display", () => {
	it("shows assigned roles", async () => {
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

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);

		expect(screen.getByText("Super Admin")).toBeInTheDocument();
		expect(screen.getByText("Content Creator")).toBeInTheDocument();
	});

	it("shows 'No roles assigned' when user has no roles", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);

		expect(screen.getByText(/no roles assigned/i)).toBeInTheDocument();
	});

	it("shows manage roles button when user has permission", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.ASSIGN_ROLES],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [{ roleId: "role1", roleName: "Admin" }],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);

		const manageButton = screen.getByRole("link", { name: /manage roles/i });
		expect(manageButton).toBeInTheDocument();
		expect(manageButton).toHaveAttribute("href", "/dashboard/admin/roles");
	});
});

describe("MyAccessPanel - Search Functionality", () => {
	it("allows searching permissions", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [PERMISSIONS.USERS.VIEW],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const user = userEvent.setup();
		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);

		const searchInput = screen.getByPlaceholderText(/search permissions/i);
		await user.type(searchInput, "user");

		expect(searchInput).toHaveValue("user");
	});

	it("shows no results message when search returns nothing", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const user = userEvent.setup();
		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);

		const searchInput = screen.getByPlaceholderText(/search permissions/i);
		await user.type(searchInput, "nonexistent");

		expect(screen.getByText(/no permissions found/i)).toBeInTheDocument();
	});
});

describe("MyAccessPanel - Visual Structure", () => {
	it("uses glass card styling", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		const { container } = render(<MyAccessPanel />);

		const glassCards = container.querySelectorAll(".glass-card");
		expect(glassCards.length).toBeGreaterThan(0);
	});

	it("includes glass card caps", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		const { container } = render(<MyAccessPanel />);

		const caps = container.querySelectorAll(".glass-card-cap");
		expect(caps.length).toBeGreaterThan(0);
	});

	it("displays organization info", async () => {
		mockUsePermissions.mockReturnValue({
			permissions: [],
			loading: false,
		});
		mockUseUserRoles.mockReturnValue({
			roles: [],
			loading: false,
		});

		const MyAccessPanel = (
			await import("@/components/settings/MyAccessPanel")
		).default;
		render(<MyAccessPanel />);

		expect(screen.getByText(/test org 123/i)).toBeInTheDocument();
	});
});
