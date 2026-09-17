import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { UserAssignmentGraph } from "@/components/users/UserAssignmentGraph";
import type { UserManagementUser } from "@/hooks/useUsers";
import { SPEC_SAMPLE_USERS } from "@/lib/users/assignment-graph";

function toManagementUser(
	user: (typeof SPEC_SAMPLE_USERS)[number],
): UserManagementUser {
	return {
		$id: user.$id,
		fullName: user.fullName,
		email: `${user.$id}@caalm.test`,
		avatar: "",
		accountId: `${user.$id}-account`,
		role: "user",
		roleName: user.roleName,
		assignedById: user.assignedById,
		assignedByName: user.assignedByName,
		department: "",
		division: "",
		status: "active",
	};
}

function GraphHarness({ users }: { users: UserManagementUser[] }) {
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	return (
		<UserAssignmentGraph
			users={users}
			allUsers={users}
			selectedUserId={selectedUserId}
			onSelectUser={(user) => setSelectedUserId(user.$id)}
			onCloseCard={() => setSelectedUserId(null)}
			renderCard={(user) => (
				<div>
					<p>{`Card for ${user.fullName}`}</p>
					<p>{user.email}</p>
				</div>
			)}
		/>
	);
}

describe("UserAssignmentGraph", () => {
	const users = SPEC_SAMPLE_USERS.map(toManagementUser);

	it("renders the spec assignment tree, legend, and a single node card", async () => {
		const user = userEvent.setup();
		render(<GraphHarness users={users} />);

		expect(screen.getByText("System assigned")).toBeInTheDocument();
		expect(screen.getByText("Admin assigned")).toBeInTheDocument();
		expect(screen.getByText("System")).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Jimmy Hendricks, Organization Admin",
			}),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", {
				name: "Jimmy Hendricks, Organization Admin",
			}),
		);
		expect(screen.getByText("Card for Jimmy Hendricks")).toBeInTheDocument();
		expect(screen.getByText("jimmy@caalm.test")).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", {
				name: "Victor Ramirez, Super Admin",
			}),
		);
		expect(screen.getByText("Card for Victor Ramirez")).toBeInTheDocument();
		expect(
			screen.queryByText("Card for Jimmy Hendricks"),
		).not.toBeInTheDocument();
	});
});
