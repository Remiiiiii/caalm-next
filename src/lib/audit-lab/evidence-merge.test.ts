import { describe, expect, it } from "vitest";
import type { EvidenceRequest } from "./types";
import { canAcceptEvidence, mergeEvidenceSeeds } from "./evidence-merge";

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