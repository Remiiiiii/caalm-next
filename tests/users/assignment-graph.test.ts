import { describe, expect, it } from "vitest";
import {
	type AssignmentGraphUser,
	collectGraphUsers,
	FLOW_LEAF_WRAP,
	FLOW_RANK_GAP,
	FLOW_ROW_EXTENT,
	GRAPH_NODE_SIZE,
	isDrawnAssignmentSource,
	layoutAssignmentGraph,
	nodesOverlap,
	resolveAssignerNodeId,
	seedFlowNodePositions,
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

	it("treats System and ghost assigners as a cut with no drawn line", () => {
		expect(isDrawnAssignmentSource(SYSTEM_NODE_ID)).toBe(false);
		expect(isDrawnAssignmentSource("ghost:retired-admin")).toBe(false);
		expect(isDrawnAssignmentSource("victor")).toBe(true);
	});

	it("does not invent a System edge when Assigned by is another person", () => {
		const layout = layoutAssignmentGraph(SPEC_SAMPLE_USERS);
		expect(
			layout.edges.some(
				(edge) => edge.fromId === SYSTEM_NODE_ID && edge.toId === "jimmy",
			),
		).toBe(false);
	});

	it("seeds flow positions from the tree and keeps saved coordinates", () => {
		const saved = new Map<string, { x: number; y: number }>([
			["victor", { x: 12, y: 34 }],
		]);
		const positions = seedFlowNodePositions(
			SPEC_SAMPLE_USERS,
			SPEC_SAMPLE_USERS,
			saved,
		);
		expect(positions.get("victor")).toEqual({ x: 12, y: 34 });
		expect(positions.get("jimmy")).toBeTruthy();
		expect(positions.get(SYSTEM_NODE_ID)).toBeTruthy();
	});

	it("places System on the left and assignees to the right", () => {
		const positions = seedFlowNodePositions(
			SPEC_SAMPLE_USERS,
			SPEC_SAMPLE_USERS,
			new Map(),
		);
		const system = positions.get(SYSTEM_NODE_ID);
		const victor = positions.get("victor");
		const jimmy = positions.get("jimmy");
		expect(system && victor && jimmy).toBeTruthy();
		expect(system!.x).toBeLessThan(victor!.x);
		expect(victor!.x).toBeLessThan(jimmy!.x);
	});

	it("packs the flow tree left-to-right by depth and top-to-bottom by siblings", () => {
		const positions = seedFlowNodePositions(
			SPEC_SAMPLE_USERS,
			SPEC_SAMPLE_USERS,
			new Map(),
		);
		const system = positions.get(SYSTEM_NODE_ID)!;
		const victor = positions.get("victor")!;
		const remy = positions.get("remy")!;
		const jimmy = positions.get("jimmy")!;
		const john = positions.get("john")!;
		const lylla = positions.get("lylla")!;

		expect(victor.x - system.x).toBe(FLOW_RANK_GAP);
		expect(jimmy.x - victor.x).toBe(FLOW_RANK_GAP);
		expect(remy.x).toBe(victor.x);
		expect(system.y).toBe(victor.y);
		expect(victor.y).toBe(jimmy.y);
		expect(remy.y).toBe(victor.y + FLOW_ROW_EXTENT);
		// Remy, John, and Lylla are leaves under System — one wrap row.
		expect(john.y).toBe(remy.y);
		expect(lylla.y).toBe(remy.y);
		expect(john.x - remy.x).toBe(FLOW_RANK_GAP);
		expect(lylla.x - john.x).toBe(FLOW_RANK_GAP);
	});

	it("wraps leaf reports left-to-right then top-to-bottom", () => {
		const users: AssignmentGraphUser[] = [
			{
				$id: "mgr",
				fullName: "Morgan Lee",
				roleName: "Department Manager",
				assignedById: "system",
				assignedByName: "System",
			},
			...["Alex", "Blair", "Cam", "Drew"].map((name, index) => ({
				$id: `staff-${index}`,
				fullName: `${name} Staff`,
				roleName: "Viewer",
				assignedById: "mgr",
				assignedByName: "Morgan Lee",
			})),
		];
		const positions = seedFlowNodePositions(users, users, new Map());
		const mgr = positions.get("mgr")!;
		const first = positions.get("staff-0")!;
		const second = positions.get("staff-1")!;
		const third = positions.get("staff-2")!;
		const fourth = positions.get("staff-3")!;

		expect(FLOW_LEAF_WRAP).toBe(3);
		expect(first.x - mgr.x).toBe(FLOW_RANK_GAP);
		expect(second.x - first.x).toBe(FLOW_RANK_GAP);
		expect(third.x - second.x).toBe(FLOW_RANK_GAP);
		expect(first.y).toBe(mgr.y);
		expect(second.y).toBe(mgr.y);
		expect(third.y).toBe(mgr.y);
		expect(fourth.x).toBe(first.x);
		expect(fourth.y).toBe(mgr.y + FLOW_ROW_EXTENT);
	});
});
