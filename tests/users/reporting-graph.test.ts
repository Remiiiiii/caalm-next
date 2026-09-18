import { describe, expect, it } from "vitest";
import {
	GRAPH_PAD_X,
	wouldCreateCycle,
} from "@/lib/users/assignment-graph";
import {
	buildReportingParentOf,
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
): ReportingGraphUser {
	return { $id: id, accountId: `${id}-account`, managerUserId, matrixManagerUserId };
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
});
