import { describe, expect, it } from "vitest";
import {
	FALLBACK_RAG_THRESHOLDS,
	formatDay,
	plural,
	REQUIREMENT_LABELS,
	ragFor,
} from "@/components/audits/readiness/readiness-ui";
import { computeRag, RAG_THRESHOLDS } from "@/lib/audits/readiness/score";

describe("readiness RAG bands", () => {
	it("uses the same thresholds on the server and in the UI fallback", () => {
		expect(FALLBACK_RAG_THRESHOLDS).toEqual(RAG_THRESHOLDS);
	});

	it("classifies the band edges the same way on both sides", () => {
		for (const score of [0, 69, 70, 84, 85, 100]) {
			expect(ragFor(score, RAG_THRESHOLDS)).toBe(computeRag(score));
		}
		expect(computeRag(69)).toBe("red");
		expect(computeRag(70)).toBe("amber");
		expect(computeRag(85)).toBe("green");
	});

	it("returns no band when there is no score", () => {
		expect(ragFor(null, RAG_THRESHOLDS)).toBeNull();
		expect(ragFor(undefined, RAG_THRESHOLDS)).toBeNull();
		expect(computeRag(null)).toBeNull();
	});
});

describe("readiness display helpers", () => {
	it("formats ISO due dates as readable days, never raw strings", () => {
		expect(formatDay("2027-09-30T12:00:00.000+00:00")).toBe("Sep 30, 2027");
		expect(formatDay("not a date")).toBe("—");
		expect(formatDay(undefined)).toBe("—");
	});

	it("maps machine requirement tags to readable labels", () => {
		expect(REQUIREMENT_LABELS.hrsa_osv).toBe("HRSA OSV");
		expect(REQUIREMENT_LABELS.cw_monitoring).toBe("CW monitoring");
		expect(REQUIREMENT_LABELS.financial_pbc).toBe("Financial PBC");
	});

	it("pluralises counts", () => {
		expect(plural(1, "item")).toBe("1 item");
		expect(plural(0, "item")).toBe("0 items");
	});
});
