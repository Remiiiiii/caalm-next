import { describe, expect, it } from "vitest";
import {
	type AssignmentGraphUser,
	collectGraphUsers,
	GRAPH_NODE_SIZE,
	layoutAssignmentGraph,
	nodesOverlap,
	resolveAssignerNodeId,
	SPEC_SAMPLE_USERS,
	SYSTEM_NODE_ID,
	segmentIntersectsNodeBox,
} from "@/lib/users/assignment-graph";

function edgeKey(fromId: string, toId: string) {
	return `${fromId}->${toId}`;
}

function largerOrgUsers(): AssignmentGraphUser[] {
	const systemAssigned: AssignmentGraphUser[] = [
		{
			$id: "ada",
			fullName: "Ada Admin",
			roleName: "Super Admin",
			assignedById: "system",
			assignedByName: "System",
		},
		{
			$id: "vic",
			fullName: "Victor Ramirez",
			roleName: "Super Admin",
			assignedById: "system",
			assignedByName: "System",
		},
		{
			$id: "john",
			fullName: "John Doe",
			roleName: "Department Manager",
			assignedById: "system",
			assignedByName: "System",
		},
	];

	const vicReports: AssignmentGraphUser[] = [
		"Jimmy Hendricks",
		"Priya Shah",
		"Noah Klein",
	].map((fullName, index) => ({
		$id: `vic-report-${index}`,
		fullName,
		roleName: "Organization Admin",
		assignedById: "vic",
		assignedByName: "Victor Ramirez",
	}));

	const chain: AssignmentGraphUser[] = [
		{
			$id: "mgr-1",
			fullName: "Morgan Lee",
			roleName: "Organization Admin",
			assignedById: "ada",
			assignedByName: "Ada Admin",
		},
		{
			$id: "mgr-2",
			fullName: "Sam Ortiz",
			roleName: "Department Manager",
			assignedById: "mgr-1",
			assignedByName: "Morgan Lee",
		},
		{
			$id: "mgr-3",
			fullName: "Riley Chen",
			roleName: "Department Manager",
			assignedById: "mgr-2",
			assignedByName: "Sam Ortiz",
		},
	];

	const johnReports: AssignmentGraphUser[] = ["Chris Park", "Eden Cole"].map(
		(fullName, index) => ({
			$id: `john-report-${index}`,
			fullName,
			roleName: "User",
			assignedById: "john",
			assignedByName: "John Doe",
		}),
	);

	return [...systemAssigned, ...vicReports, ...chain, ...johnReports];
}

describe("assignment graph", () => {
	it("builds edges only from Assigned by values in the spec sample", () => {
		const layout = layoutAssignmentGraph(SPEC_SAMPLE_USERS);
		const keys = layout.edges.map((edge) => edgeKey(edge.fromId, edge.toId));

		expect(keys.sort()).toEqual(
			[
				"system->victor",
				"system->john",
				"system->lylla",
				"system->remy",
				"victor->jimmy",
			].sort(),
		);
		expect(layout.nodes.some((node) => node.id === SYSTEM_NODE_ID)).toBe(true);
		expect(layout.edges.find((edge) => edge.toId === "jimmy")?.kind).toBe(
			"admin",
		);
		expect(layout.edges.find((edge) => edge.toId === "victor")?.kind).toBe(
			"system",
		);
	});

	it("adds a branch when a new user is assigned by an existing admin", () => {
		const before = layoutAssignmentGraph(SPEC_SAMPLE_USERS);
		const nextUsers = [
			...SPEC_SAMPLE_USERS,
			{
				$id: "alex",
				fullName: "Alex Kim",
				roleName: "User",
				assignedById: "victor",
				assignedByName: "Victor Ramirez",
			},
		];
		const after = layoutAssignmentGraph(nextUsers);

		expect(after.edges).toHaveLength(before.edges.length + 1);
		expect(
			after.edges.some(
				(edge) => edge.fromId === "victor" && edge.toId === "alex",
			),
		).toBe(true);
		expect(after.nodes.some((node) => node.id === "alex")).toBe(true);
	});

	it("lays out multiple secondary branches and chains deeper than 2 levels", () => {
		const users = largerOrgUsers();
		const layout = layoutAssignmentGraph(users);

		expect(users.length).toBeGreaterThanOrEqual(10);
		expect(layout.edges).toHaveLength(users.length);

		const byId = new Map(layout.nodes.map((node) => [node.id, node]));
		expect(byId.get("vic-report-1")?.y).toBeGreaterThan(
			byId.get("vic")?.y || 0,
		);
		expect(byId.get("mgr-3")?.y).toBeGreaterThan(byId.get("mgr-2")?.y || 0);
		expect(byId.get("mgr-2")?.y).toBeGreaterThan(byId.get("mgr-1")?.y || 0);
		expect(byId.get("mgr-1")?.y).toBeGreaterThan(byId.get("ada")?.y || 0);

		const vicChildren = layout.edges.filter((edge) => edge.fromId === "vic");
		expect(vicChildren).toHaveLength(3);
		const childXs = vicChildren.map((edge) => byId.get(edge.toId)?.x || 0);
		expect(new Set(childXs).size).toBe(3);
	});

	it("keeps node squares from overlapping at 10+ users", () => {
		const layout = layoutAssignmentGraph(largerOrgUsers());
		const placed = layout.nodes;
		for (let i = 0; i < placed.length; i += 1) {
			for (let j = i + 1; j < placed.length; j += 1) {
				expect(
					nodesOverlap(placed[i], placed[j]),
					`${placed[i].label} overlaps ${placed[j].label}`,
				).toBe(false);
			}
		}
	});

	it("routes connectors on orthogonal buses that miss other node squares", () => {
		const layout = layoutAssignmentGraph(largerOrgUsers());
		const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));

		for (const edge of layout.edges) {
			for (let i = 0; i < edge.points.length - 1; i += 1) {
				const a = edge.points[i];
				const b = edge.points[i + 1];
				const isHorizontal = a.y === b.y;
				const isVertical = a.x === b.x;
				expect(isHorizontal || isVertical).toBe(true);

				for (const node of layout.nodes) {
					if (node.id === edge.fromId || node.id === edge.toId) continue;
					expect(
						segmentIntersectsNodeBox(a, b, node, GRAPH_NODE_SIZE),
						`${edge.fromId}->${edge.toId} crosses ${node.label}`,
					).toBe(false);
				}
			}
			expect(edge.junctions.length).toBeGreaterThan(0);
			expect(nodeById.has(edge.fromId)).toBe(true);
			expect(nodeById.has(edge.toId)).toBe(true);
		}
	});

	it("resolves assigners by id first, then unique name", () => {
		const users = SPEC_SAMPLE_USERS;
		expect(
			resolveAssignerNodeId(
				{
					$id: "x",
					fullName: "X",
					assignedById: "victor",
					assignedByName: "Nope",
				},
				users,
			),
		).toBe("victor");
		expect(
			resolveAssignerNodeId(
				{
					$id: "x",
					fullName: "X",
					assignedByName: "Victor Ramirez",
				},
				users,
			),
		).toBe("victor");
		expect(
			resolveAssignerNodeId(
				{ $id: "x", fullName: "X", assignedByName: "System" },
				users,
			),
		).toBe(SYSTEM_NODE_ID);
	});

	it("includes an assigner who is filtered out so the edge stays real", () => {
		const jimmy = SPEC_SAMPLE_USERS.find((user) => user.$id === "jimmy");
		expect(jimmy).toBeTruthy();
		const included = collectGraphUsers(
			[jimmy as AssignmentGraphUser],
			SPEC_SAMPLE_USERS,
		);
		expect(included.map((user) => user.$id).sort()).toEqual([
			"jimmy",
			"victor",
		]);

		const layout = layoutAssignmentGraph(
			[jimmy as AssignmentGraphUser],
			SPEC_SAMPLE_USERS,
		);
		expect(
			layout.edges.some(
				(edge) => edge.fromId === "victor" && edge.toId === "jimmy",
			),
		).toBe(true);
	});

	it("does not invent a System edge when Assigned by is another person", () => {
		const layout = layoutAssignmentGraph(SPEC_SAMPLE_USERS);
		expect(
			layout.edges.some(
				(edge) => edge.fromId === SYSTEM_NODE_ID && edge.toId === "jimmy",
			),
		).toBe(false);
	});
});
