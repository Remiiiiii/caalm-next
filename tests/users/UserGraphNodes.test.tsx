import { render, screen } from "@testing-library/react";
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

	it("shows title, location, and cost center on the card", () => {
		render(
			<div style={{ width: 400, height: 360 }}>
				<ReactFlowProvider>
					<ReactFlow
						nodes={[
							{
								id: "cfo",
								type: "user",
								position: { x: 0, y: 0 },
								data: {
									user: cardUser,
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

		expect(screen.getByText("Chief Financial Officer")).toBeInTheDocument();
		expect(screen.getByText("Austin office")).toBeInTheDocument();
		expect(screen.getByText("FIN-100 Corporate")).toBeInTheDocument();
		expect(screen.getByText("Executive")).toBeInTheDocument();
		expect(screen.getByText("Victor Ramirez")).toBeInTheDocument();
	});
});
