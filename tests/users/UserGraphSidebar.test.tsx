import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserGraphSidebar } from "@/components/users/UserGraphSidebar";
import type { UserManagementUser } from "@/hooks/useUsers";
import { computeGraphSidebarStats } from "@/lib/users/graph-sidebar-stats";

function user(
	partial: Partial<UserManagementUser> & Pick<UserManagementUser, "$id" | "fullName">,
): UserManagementUser {
	return {
		email: `${partial.$id}@caalm.test`,
		avatar: "",
		accountId: `${partial.$id}-account`,
		role: "viewer",
		roleName: "Viewer",
		status: "active",
		...partial,
	};
}

const lastChangedAt = "2026-01-02T00:00:00.000Z";

const users: UserManagementUser[] = [
	user({
		$id: "v1",
		fullName: "Blair Montgomery",
		roleName: "Viewer",
		department: "IT",
	}),
	user({
		$id: "m1",
		fullName: "Avery Cole",
		roleName: "Department Manager",
		department: "Finance",
		status: "inactive",
		twoFactorEnabled: true,
		passwordUpdatedAt: lastChangedAt,
	}),
	user({
		$id: "sa",
		fullName: "Victor Ramirez",
		roleName: "Super Admin",
		assignedById: "system",
		assignedByName: "System",
		status: "suspended",
		twoFactorEnabled: false,
		passwordUpdatedAt: null,
	}),
];

const stats = computeGraphSidebarStats(users);

const sidebarProps = {
	users,
	stats,
	focusUserId: null as string | null,
	onFocusUser: () => undefined,
};

describe("UserGraphSidebar", () => {
	afterEach(() => {
		window.localStorage.removeItem("user-graph-sidebar:collapsed");
	});

	it("collapses to a rail and expands again", async () => {
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={null}
				onSelectHighlight={() => undefined}
			/>,
		);

		expect(screen.getByText("All users")).toBeInTheDocument();
		expect(
			screen.queryByLabelText("Search users on the diagram"),
		).not.toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Collapse sidebar" }),
		);
		expect(screen.queryByText("All users")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Expand sidebar" }),
		).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole("button", { name: "Expand sidebar" }),
		);
		expect(screen.getByText("All users")).toBeInTheDocument();
	});

	it("clears a role highlight when the same role is clicked again", async () => {
		const onSelectHighlight = vi.fn();
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={{ kind: "role", value: "Viewer" }}
				onSelectHighlight={onSelectHighlight}
			/>,
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Clear Viewer highlight" }),
		);
		expect(onSelectHighlight).toHaveBeenCalledWith(null);
	});

	it("shows Show all on All users and clears highlight plus focus", async () => {
		const onSelectHighlight = vi.fn();
		const onFocusUser = vi.fn();
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={{ kind: "role", value: "Viewer" }}
				onSelectHighlight={onSelectHighlight}
				onFocusUser={onFocusUser}
			/>,
		);

		expect(screen.getByText("Show all")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Show all users" }));
		expect(onSelectHighlight).toHaveBeenCalledWith(null);
		expect(onFocusUser).toHaveBeenCalledWith(null);
	});

	it("splits status into active, inactive, and suspended", () => {
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={null}
				onSelectHighlight={() => undefined}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Highlight Active users" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Highlight Inactive users" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Highlight Suspended users" }),
		).toBeInTheDocument();
	});

	it("highlights a department row", async () => {
		const onSelectHighlight = vi.fn();
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={null}
				onSelectHighlight={onSelectHighlight}
			/>,
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Distribution" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Highlight IT users" }),
		);
		expect(onSelectHighlight).toHaveBeenCalledWith({
			kind: "department",
			value: "IT",
		});
	});

	it("omits users with a department and division from Unassigned users", () => {
		const placed = user({
			$id: "john",
			fullName: "John Doe",
			assignedById: "system",
			assignedByName: "System",
			department: "Executive",
			division: "c-suite",
		});
		const missingDivision = user({
			$id: "sam",
			fullName: "Sam Rivera",
			department: "Finance",
		});
		const localUsers = [placed, missingDivision];
		render(
			<UserGraphSidebar
				users={localUsers}
				stats={computeGraphSidebarStats(localUsers)}
				focusUserId={null}
				onFocusUser={() => undefined}
				highlight={null}
				onSelectHighlight={() => undefined}
			/>,
		);

		expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
		expect(screen.getByText("Sam Rivera")).toBeInTheDocument();
	});

	it("shows a green up trend when more users were added this week than last", () => {
		const now = Date.now();
		const thisWeek = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
		const lastWeek = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
		const localUsers = [
			user({ $id: "n1", fullName: "New One", $createdAt: thisWeek }),
			user({ $id: "n2", fullName: "New Two", $createdAt: thisWeek }),
			user({ $id: "o1", fullName: "Old One", $createdAt: lastWeek }),
		];
		render(
			<UserGraphSidebar
				users={localUsers}
				stats={computeGraphSidebarStats(localUsers, now)}
				focusUserId={null}
				onFocusUser={() => undefined}
				highlight={null}
				onSelectHighlight={() => undefined}
			/>,
		);

		expect(screen.getByLabelText("Users added up this week")).toBeInTheDocument();
		expect(screen.getByText("+2 this week")).toHaveClass("text-green");
		expect(screen.getByLabelText("Users added up this month")).toBeInTheDocument();
		expect(screen.getByText("+3 this month")).toHaveClass("text-green");
	});

	it("shows a red down trend when fewer users were added this week than last", () => {
		const now = Date.now();
		const thisWeek = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
		const lastWeek = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
		const localUsers = [
			user({ $id: "n1", fullName: "New One", $createdAt: thisWeek }),
			user({ $id: "o1", fullName: "Old One", $createdAt: lastWeek }),
			user({ $id: "o2", fullName: "Old Two", $createdAt: lastWeek }),
		];
		render(
			<UserGraphSidebar
				users={localUsers}
				stats={computeGraphSidebarStats(localUsers, now)}
				focusUserId={null}
				onFocusUser={() => undefined}
				highlight={null}
				onSelectHighlight={() => undefined}
			/>,
		);

		expect(screen.getByLabelText("Users added down this week")).toBeInTheDocument();
		expect(screen.getByText("+1 this week")).toHaveClass("text-red");
	});

	it("shows a red down trend when fewer users were added this month than last", () => {
		const now = Date.now();
		const date = new Date(now);
		const thisMonth = new Date(date.getFullYear(), date.getMonth(), 2).toISOString();
		const lastMonth = new Date(
			date.getFullYear(),
			date.getMonth() - 1,
			10,
		).toISOString();
		const localUsers = [
			user({ $id: "n1", fullName: "New One", $createdAt: thisMonth }),
			user({ $id: "o1", fullName: "Old One", $createdAt: lastMonth }),
			user({ $id: "o2", fullName: "Old Two", $createdAt: lastMonth }),
		];
		render(
			<UserGraphSidebar
				users={localUsers}
				stats={computeGraphSidebarStats(localUsers, now)}
				focusUserId={null}
				onFocusUser={() => undefined}
				highlight={null}
				onSelectHighlight={() => undefined}
			/>,
		);

		expect(screen.getByLabelText("Users added down this month")).toBeInTheDocument();
		expect(screen.getByText("+1 this month")).toHaveClass("text-red");
	});

	it("offers Assign on unassigned users when allowed", async () => {
		const onAssignUser = vi.fn();
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={null}
				onSelectHighlight={() => undefined}
				canAssign
				onAssignUser={onAssignUser}
			/>,
		);

		const assignButtons = screen.getAllByRole("button", { name: "+ Assign" });
		expect(assignButtons.length).toBeGreaterThan(0);
		await userEvent.click(assignButtons[0]);
		expect(onAssignUser).toHaveBeenCalled();
	});

	it("groups hygiene and security under Needs attention", () => {
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={null}
				onSelectHighlight={() => undefined}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /Needs attention/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Highlight No 2FA enabled" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Highlight No division assigned" }),
		).toBeInTheDocument();
	});

	it("renders the selected panel with 2FA and password", () => {
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={null}
				onSelectHighlight={() => undefined}
				focusUserId="m1"
			/>,
		);

		expect(screen.getByText("Selected")).toBeInTheDocument();
		expect(screen.getAllByText("Avery Cole").length).toBeGreaterThan(0);
		expect(screen.getByText("On")).toBeInTheDocument();
		expect(screen.getByText("Last password change")).toBeInTheDocument();
	});

	it("renders seats and pending invite names", async () => {
		render(
			<UserGraphSidebar
				{...sidebarProps}
				highlight={null}
				onSelectHighlight={() => undefined}
				planUsage={{ tier: "growth", users: { used: 8, limit: 20 } }}
				pendingInvites={[
					{
						$id: "inv-1",
						name: "Pat Lee",
						email: "pat@caalm.test",
						role: "Viewer",
					},
				]}
			/>,
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Activity & Plan" }),
		);
		expect(screen.getByText("Plan seats")).toBeInTheDocument();
		expect(screen.getByText("8 / 20")).toBeInTheDocument();
		expect(screen.getByText("Pending invites")).toBeInTheDocument();
		expect(screen.getByText("Pat Lee")).toBeInTheDocument();
	});

	it("shows skip-level for the focused person", () => {
		const chain = [
			user({ $id: "ceo", fullName: "Ada Admin" }),
			user({ $id: "cfo", fullName: "John Doe", managerUserId: "ceo" }),
			user({
				$id: "leaf",
				fullName: "Riley Chen",
				managerUserId: "cfo",
				workLocation: "Austin office",
			}),
		];
		render(
			<UserGraphSidebar
				users={chain}
				stats={computeGraphSidebarStats(chain)}
				highlight={null}
				onSelectHighlight={() => undefined}
				focusUserId="leaf"
				onFocusUser={() => undefined}
			/>,
		);

		expect(screen.getByText("Skip-level")).toBeInTheDocument();
		expect(screen.getByText("Skip-level").closest("div")).toHaveTextContent(
			"Ada Admin",
		);
		expect(screen.getByText("Austin office")).toBeInTheDocument();
	});
});
