import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserGraphCardMenu } from "@/components/users/UserGraphCardMenu";
import type { UserManagementUser } from "@/hooks/useUsers";

const user: UserManagementUser = {
	$id: "jimmy",
	fullName: "Jimmy Hendricks",
	email: "jimmy@caalm.test",
	avatar: "",
	accountId: "jimmy-account",
	role: "viewer",
	roleName: "Organization Admin",
	status: "active",
};

describe("UserGraphCardMenu", () => {
	it("shows view, update, and deactivate when those permissions are present", async () => {
		const actor = userEvent.setup();
		const onAction = vi.fn();
		render(
			<UserGraphCardMenu
				user={user}
				canView
				canEdit
				canDeactivate
				canAssignRoles={false}
				canImpersonate={false}
				onAction={onAction}
			/>,
		);

		await actor.click(
			screen.getByRole("button", { name: "Actions for Jimmy Hendricks" }),
		);
		expect(screen.getByText("View profile")).toBeInTheDocument();
		expect(screen.getByText("Update")).toBeInTheDocument();
		expect(screen.getByText("Deactivate")).toBeInTheDocument();
		expect(screen.queryByText("View as user")).not.toBeInTheDocument();
		expect(screen.queryByText("Assign roles")).not.toBeInTheDocument();

		await actor.click(screen.getByText("View profile"));
		expect(onAction).toHaveBeenCalledWith(user, "view");
	});

	it("shows assign roles and impersonate when permitted", async () => {
		const actor = userEvent.setup();
		const onAction = vi.fn();
		render(
			<UserGraphCardMenu
				user={user}
				actor={{ $id: "other", accountId: "other-account" }}
				canView
				canEdit={false}
				canDeactivate={false}
				canAssignRoles
				canImpersonate
				onAction={onAction}
			/>,
		);

		await actor.click(
			screen.getByRole("button", { name: "Actions for Jimmy Hendricks" }),
		);
		expect(screen.getByText("View as user")).toBeInTheDocument();
		expect(screen.getByText("Assign roles")).toBeInTheDocument();

		await actor.click(screen.getByText("Assign roles"));
		expect(onAction).toHaveBeenCalledWith(user, "role");
	});

	it("omits Update and Deactivate without those permissions", async () => {
		const actor = userEvent.setup();
		render(
			<UserGraphCardMenu
				user={user}
				canView
				canEdit={false}
				canDeactivate={false}
				canAssignRoles={false}
				canImpersonate={false}
				onAction={() => undefined}
			/>,
		);

		await actor.click(
			screen.getByRole("button", { name: "Actions for Jimmy Hendricks" }),
		);
		expect(screen.getByText("View profile")).toBeInTheDocument();
		expect(screen.queryByText("Update")).not.toBeInTheDocument();
		expect(screen.queryByText("Deactivate")).not.toBeInTheDocument();
	});

	it("hides the menu entirely without view, edit, or deactivate", () => {
		const { container } = render(
			<UserGraphCardMenu
				user={user}
				canView={false}
				canEdit={false}
				canDeactivate={false}
				canAssignRoles={false}
				canImpersonate={false}
				onAction={() => undefined}
			/>,
		);
		expect(container).toBeEmptyDOMElement();
	});
});
