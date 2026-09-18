import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserAssignmentGraph } from "@/components/users/UserAssignmentGraph";
import {
	UserManagementLineageToggle,
	type GraphLineage,
} from "@/components/users/UserManagementViewToggle";
import type { UserManagementUser } from "@/hooks/useUsers";
import { SPEC_SAMPLE_USERS } from "@/lib/users/assignment-graph";

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

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
		department: "IT",
		division: "Help Desk",
		status: "active",
	};
}

function GraphHarness() {
	const [lineage, setLineage] = useState<GraphLineage>("reporting");
	const users = SPEC_SAMPLE_USERS.map(toManagementUser);

	return (
		<div style={{ width: 800, height: 600 }}>
			<UserManagementLineageToggle
				lineage={lineage}
				onLineageChange={setLineage}
			/>
			<UserAssignmentGraph
				users={users}
				allUsers={users}
				lineage={lineage}
				canEditGraph
				canView
				canEdit
				canDeactivate
				onAction={() => undefined}
				onRefresh={() => undefined}
			/>
		</div>
	);
}

describe("UserAssignmentGraph", () => {
	it("defaults to the reporting tree and can switch to access grant", async () => {
		render(<GraphHarness />);

		expect(screen.getByRole("tab", { name: "Reporting" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByLabelText("Reporting color legend")).toBeInTheDocument();
		expect(screen.getAllByText("Reports to").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Matrix manager").length).toBeGreaterThan(0);
		expect(
			screen.queryByLabelText("Assignment color legend"),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Collapse sidebar" }),
		).toBeInTheDocument();
		expect(screen.getByText("All users")).toBeInTheDocument();
		const directions =
			"Drag a card to move it · drag a dot to a card to connect · hover a line and click the scissors to disconnect";
		expect(screen.getByText(directions)).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Close directions" }));
		expect(screen.queryByText(directions)).not.toBeInTheDocument();
		expect(screen.getByTestId("rf__wrapper")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Zoom In" })).toBeInTheDocument();
		expect(
			screen.getByText("Jimmy Hendricks", { hidden: true }),
		).toBeInTheDocument();

		await userEvent.click(screen.getByRole("tab", { name: "Access grant" }));
		expect(screen.getByLabelText("Assignment color legend")).toBeInTheDocument();
		expect(screen.getAllByText("System assigned").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Admin assigned").length).toBeGreaterThan(0);
		expect(screen.getByText("System", { hidden: true })).toBeInTheDocument();
	});
});
