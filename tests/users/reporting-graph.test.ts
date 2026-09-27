import { describe, expect, it } from "vitest";
import {
	GRAPH_PAD_X,
	GRAPH_PAD_Y,
	wouldCreateCycle,
	FLOW_TB_RANK_GAP,
} from "@/lib/users/assignment-graph";
import {
	buildReportingParentOf,
	hoistSuperAdminReportingRoots,
	collectReportingUsers,
	matrixReportingEdges,
	REPORTING_RANK_GAP,
	reportingWouldCycle,
	seedReportingNodePositions,
	skipLevelManagerId,
	type ReportingGraphUser,
} from "@/lib/users/reporting-graph";

function person(
	id: string,
	managerUserId?: string | null,
	matrixManagerUserId?: string | null,
	roleName?: string | null,
): ReportingGraphUser {
	return {
		$id: id,
		accountId: `${id}-account`,
		managerUserId,
		matrixManagerUserId,
		roleName,
	};
}

describe("reporting graph layout", () => {
	it("places forest roots at the left rank and reports one rank to the right", () => {
		const users = [
			person("ceo"),
			person("cfo", "ceo"),
			person("controller", "cfo"),
			person("orphan"),
		];
		const positions = seedReportingNodePositions(users, users, new Map());
		expect(positions.get("ceo")?.x).toBe(GRAPH_PAD_X);
		expect(positions.get("orphan")?.x).toBe(GRAPH_PAD_X);
		expect(positions.get("cfo")?.x).toBe(GRAPH_PAD_X + REPORTING_RANK_GAP);
		expect(positions.get("controller")?.x).toBe(
			GRAPH_PAD_X + REPORTING_RANK_GAP * 2,
		);
		expect(buildReportingParentOf(users).get("cfo")).toBe("ceo");
		expect(buildReportingParentOf(users).has("ceo")).toBe(false);
	});

	it("drops a reporting edge that would close a cycle", () => {
		const users = [person("a", "c"), person("b", "a"), person("c", "b")];
		const parentOf = buildReportingParentOf(users);
		expect(parentOf.size).toBeLessThan(3);
		const chain = new Map([
			["b", "a"],
			["c", "b"],
		]);
		expect(reportingWouldCycle("c", "a", chain)).toBe(true);
		expect(wouldCreateCycle("c", "a", chain)).toBe(true);
		expect(reportingWouldCycle("orphan", "a", chain)).toBe(false);
	});

	it("does not use matrix managers for rank", () => {
		const users = [
			person("ceo"),
			person("cfo", "ceo", "coo"),
			person("coo"),
		];
		const parentOf = buildReportingParentOf(users);
		expect(parentOf.get("cfo")).toBe("ceo");
		expect(parentOf.get("coo")).toBeUndefined();
		const positions = seedReportingNodePositions(users, users, new Map());
		expect(positions.get("cfo")?.x).toBe(GRAPH_PAD_X + REPORTING_RANK_GAP);
		expect(positions.get("coo")?.x).toBe(GRAPH_PAD_X);
		expect(matrixReportingEdges(users)).toEqual([
			{ fromId: "coo", toId: "cfo" },
		]);
	});

	it("walks two hops for skip-level", () => {
		const users = [
			person("ceo"),
			person("cfo", "ceo"),
			person("analyst", "cfo"),
		];
		expect(skipLevelManagerId("analyst", users)).toBe("ceo");
		expect(skipLevelManagerId("cfo", users)).toBeNull();
		expect(skipLevelManagerId("ceo", users)).toBeNull();
	});

	it("centers a manager beside its stack on first-time layout", () => {
		const users = [
			person("ceo"),
			person("cfo", "ceo"),
			person("cio", "ceo"),
		];
		const positions = seedReportingNodePositions(users, users, new Map());
		const ceoY = positions.get("ceo")?.y ?? 0;
		const cfoY = positions.get("cfo")?.y ?? 0;
		const cioY = positions.get("cio")?.y ?? 0;
		expect(cfoY).toBeLessThan(cioY);
		expect(ceoY).toBeGreaterThan(cfoY);
		expect(ceoY).toBeLessThan(cioY);
	});

	it("places ranks on Y in top-down layout", () => {
		const users = [
			person("ceo"),
			person("cfo", "ceo"),
			person("controller", "cfo"),
		];
		const positions = seedReportingNodePositions(users, users, new Map(), {
			orientation: "tb",
		});
		expect(positions.get("ceo")?.y).toBe(GRAPH_PAD_Y);
		expect(positions.get("cfo")?.y).toBe(GRAPH_PAD_Y + FLOW_TB_RANK_GAP);
		expect(positions.get("controller")?.y).toBe(
			GRAPH_PAD_Y + FLOW_TB_RANK_GAP * 2,
		);
		expect(positions.get("ceo")?.x).toBeDefined();
	});

	it("keeps saved coordinates in top-down layout", () => {
		const users = [person("ceo"), person("cfo", "ceo")];
		const saved = new Map([["ceo", { x: 9, y: 9 }]]);
		const positions = seedReportingNodePositions(users, users, saved, {
			orientation: "tb",
		});
		expect(positions.get("ceo")).toEqual({ x: 9, y: 9 });
	});

	it("pulls a matrix manager into the reporting set", () => {
		const visible = [person("cfo", "ceo", "coo")];
		const all = [person("ceo"), person("cfo", "ceo", "coo"), person("coo")];
		const collected = collectReportingUsers(visible, all).map(
			(user) => user.$id,
		);
		expect(collected.sort()).toEqual(["ceo", "cfo", "coo"]);
	});

	it("hoists Super Admin above other reporting roots in top-down", () => {
		const users = [
			person("sa", null, null, "Super Admin"),
			person("ceo"),
			person("cfo", "ceo"),
			person("orphan"),
		];
		const { parentOf, syntheticChildIds } = hoistSuperAdminReportingRoots(
			buildReportingParentOf(users),
			users,
			"sa",
		);
		expect(parentOf.get("ceo")).toBe("sa");
		expect(parentOf.get("orphan")).toBe("sa");
		expect(parentOf.get("cfo")).toBe("ceo");
		expect(parentOf.has("sa")).toBe(false);
		expect(syntheticChildIds.sort()).toEqual(["ceo", "orphan"]);

		const positions = seedReportingNodePositions(users, users, new Map(), {
			orientation: "tb",
			hoistSuperAdminId: "sa",
		});
		expect(positions.get("sa")?.y).toBe(GRAPH_PAD_Y);
		expect(positions.get("ceo")?.y).toBe(GRAPH_PAD_Y + FLOW_TB_RANK_GAP);
		expect(positions.get("orphan")?.y).toBe(GRAPH_PAD_Y + FLOW_TB_RANK_GAP);
		expect(positions.get("cfo")?.y).toBe(GRAPH_PAD_Y + FLOW_TB_RANK_GAP * 2);
	});

	it("does not duplicate a Super Admin edge that already exists", () => {
		const users = [
			person("sa", null, null, "Super Admin"),
			person("ceo", "sa"),
		];
		const { parentOf, syntheticChildIds } = hoistSuperAdminReportingRoots(
			buildReportingParentOf(users),
			users,
			"sa",
		);
		expect(parentOf.get("ceo")).toBe("sa");
		expect(syntheticChildIds).toEqual([]);
	});
});
