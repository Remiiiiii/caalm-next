import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";
import {
	graphUserCardTitle,
	graphUserJobLabel,
	isCurrentGraphUser,
	UserGraphUserNode,
} from "@/components/users/UserGraphNodes";
import type { UserManagementUser } from "@/hooks/useUsers";

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const user = {
	$id: "victor-profile",
	accountId: "victor-account",
	fullName: "Victor Ramirez",
};

const cardUser: UserManagementUser = {
	$id: "cfo",
	fullName: "John Doe",
	email: "john@caalm.test",
	avatar: "",
	accountId: "john-account",
	role: "user",
	roleName: "Executive",
	jobTitle: "Chief Financial Officer",
	workLocation: "Austin office",
	costCenterName: "FIN-100 Corporate",
	costCenterCode: "FIN-100",
	department: "Finance",
	division: "accounting",
	status: "active",
};

function renderUserCard(userOverride: UserManagementUser = cardUser) {
	return render(
		<div style={{ width: 400, height: 360 }}>
			<ReactFlowProvider>
				<ReactFlow
					nodes={[
						{
							id: "cfo",
							type: "user",
							position: { x: 0, y: 0 },
							data: {
								user: userOverride,
								assignerKind: "admin",
								lineage: "reporting",
								skipLevelName: "Victor Ramirez",
								canEditGraph: false,
								canView: true,
								canEdit: false,
								canDeactivate: false,
								canAssignRoles: false,
								canImpersonate: false,
								actor: null,
								emphasis: "normal",
								onAction: () => undefined,
							},
						},
					]}
					nodeTypes={{ user: UserGraphUserNode }}
					fitView
				/>
			</ReactFlowProvider>
		</div>,
	);
}

describe("UserGraphNodes current-user card", () => {
	it("labels the signed-in user as You", () => {
		expect(
			graphUserCardTitle(user, {
				$id: "victor-account",
				accountId: "victor-account",
			}),
		).toBe("You");
		expect(isCurrentGraphUser({ $id: "victor-profile" }, user)).toBe(true);
	});

	it("keeps other people's full names", () => {
		expect(
			graphUserCardTitle(user, {
				$id: "other",
				accountId: "other-account",
			}),
		).toBe("Victor Ramirez");
		expect(graphUserCardTitle(user, null)).toBe("Victor Ramirez");
	});

	it("prefers job title over role name", () => {
		expect(
			graphUserJobLabel({
				jobTitle: "Controller",
				roleName: "Department Manager",
			}),
		).toBe("Controller");
		expect(graphUserJobLabel({ jobTitle: null, roleName: "Viewer" })).toBe(
			"Viewer",
		);
	});

	it("shows department and division with extra details collapsed", () => {
		renderUserCard();

		expect(screen.getByText("Chief Financial Officer")).toBeInTheDocument();
		expect(screen.getByText("Department").closest("div")).toHaveTextContent(
			"Finance",
		);
		expect(screen.getByText("Division").closest("div")).toHaveTextContent(
			"accounting",
		);
		expect(screen.getByText("Executive")).toBeInTheDocument();
		expect(screen.queryByText("Location")).not.toBeInTheDocument();
		expect(screen.queryByText("Cost center")).not.toBeInTheDocument();
		expect(screen.queryByText("Skip-level")).not.toBeInTheDocument();
		expect(screen.queryByText("Austin office")).not.toBeInTheDocument();
	});

	it("reveals location, cost center, and skip-level when expanded", async () => {
		renderUserCard();

		await userEvent.click(screen.getByTestId("graph-node-extra-details"));

		expect(screen.getByText("Austin office")).toBeInTheDocument();
		expect(screen.getByText("FIN-100 Corporate")).toBeInTheDocument();
		expect(screen.getByText("Skip-level").closest("div")).toHaveTextContent(
			"Victor Ramirez",
		);
	});
});
