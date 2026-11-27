import { describe, expect, it } from "vitest";
import {
	canAcceptEvidence,
	mergeEvidenceSeeds,
	parseStoredEvidenceStatus,
} from "./evidence-merge";
import type { EvidenceRequest } from "./types";

describe("mergeEvidenceSeeds", () => {
	it("skips titles already in the matrix", () => {
		const existing = [
			{
				$id: "1",
				orgId: "o",
				sessionId: "s",
				title: "Access review evidence",
				status: "accepted",
			},
		] as EvidenceRequest[];
		const seeds = [
			{ title: "Access review evidence" },
			{ title: "New item" },
		];
		const merged = mergeEvidenceSeeds(existing, seeds);
		expect(merged).toHaveLength(1);
		expect(merged[0]?.title).toBe("New item");
	});
});

describe("canAcceptEvidence", () => {
	it("blocks single-person dependency without manager", () => {
		const item = {
			$id: "1",
			orgId: "o",
			sessionId: "s",
			title: "Policy",
			ownerUserId: "u1",
			assigneeUserId: "u1",
			status: "submitted",
		} as EvidenceRequest;
		expect(canAcceptEvidence(item).ok).toBe(false);
	});
});

describe("parseStoredEvidenceStatus", () => {
	it("maps legacy Appwrite enum values to current app statuses", () => {
		expect(parseStoredEvidenceStatus("follow_up")).toBe("follow_up_requested");
		expect(parseStoredEvidenceStatus("rejected")).toBe("rejected_resubmit");
		expect(parseStoredEvidenceStatus("follow_up_requested")).toBe(
			"follow_up_requested",
		);
	});
});