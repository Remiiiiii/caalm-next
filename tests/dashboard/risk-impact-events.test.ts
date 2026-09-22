import { describe, expect, it } from "vitest";
import {
	buildRiskAvertedPdfPayload,
	buildRiskImpactEvent,
	classifyImpactLog,
	formatRiskUsdExact,
	honestYoyLabel,
	hrefForEventKind,
	sumCountedEventDollars,
} from "@/lib/dashboard/risk-impact-events";
import type { RiskImpactSnapshot } from "@/lib/dashboard/risk-impact.types";

function emptyTrend() {
	return {
		direction: "flat" as const,
		percent: 0,
		vsLabel: "Q4",
		current: 0,
		prior: 0,
	};
}

function snapshotFixture(
	overrides: Partial<RiskImpactSnapshot> = {},
): RiskImpactSnapshot {
	return {
		period: "ytd",
		periodLabel: "Year to date",
		currency: "USD",
		primary: {
			label: "Contract & grant risk averted",
			amount: 2100000,
			amountFormatted: "$2.1M",
		},
		secondary: {
			label: "Portfolio protected",
			amount: 0,
			amountFormatted: "$0",
		},
		counts: {
			complianceFlagsCaught: 2,
			auditGapsClosed: 1,
			licensesRenewedOnTime: 1,
		},
		countTrends: {
			complianceFlagsCaught: emptyTrend(),
			auditGapsClosed: emptyTrend(),
			licensesRenewedOnTime: emptyTrend(),
		},
		yoyTrend: {
			direction: "new",
			percent: null,
			vsLabel: "2025 YTD",
			current: 2100000,
			prior: 0,
		},
		openRisk: { highRisk: 1, expiring90: 2, expired: 0 },
		monitoring: {
			contractsMonitored: 4,
			grantsMonitored: 1,
			clausesFlagged: 2,
		},
		sparkline: [],
		liveSparkline: [],
		trackingNote: "",
		narrative: "Flags, gaps, and renewals built $2.1M.",
		recentWins: [],
		events: [],
		computedAt: "2026-09-20T12:00:00.000Z",
		dataSources: { contracts: true, licenses: true, auditLogs: true },
		...overrides,
	};
}

describe("classifyImpactLog", () => {
	it("classifies a compliance flag from a contracts audit change", () => {
		expect(
			classifyImpactLog(
				{
					module: "contracts",
					changes: [{ field: "compliance", after: "action-required" }],
				},
				true,
			),
		).toBe("flag");
	});

	it("classifies a license renewal only when the caller can view licenses", () => {
		const log = {
			module: "licenses",
			event_id: "license_renew_1",
			event_title: "License renewed",
		};
		expect(classifyImpactLog(log, true)).toBe("renewal");
		expect(classifyImpactLog(log, false)).toBeNull();
	});
});

describe("buildRiskImpactEvent", () => {
	it("zeros dollars when the row is listed but not counted", () => {
		const event = buildRiskImpactEvent({
			id: "evt-1",
			date: "2026-06-01T00:00:00.000Z",
			kind: "flag",
			recordName: "City grant",
			dollars: 40000,
			source: "Contract audit",
			countedTowardTotal: false,
		});
		expect(event.dollars).toBe(0);
		expect(event.dollarsFormatted).toBe("$0");
		expect(event.href).toBe("/contracts");
	});
});

describe("honestYoyLabel", () => {
	it("does not invent a percent when the prior year is empty", () => {
		expect(
			honestYoyLabel({
				direction: "new",
				percent: null,
				vsLabel: "2025 YTD",
				current: 100,
				prior: 0,
			}),
		).toBe("No prior-year dollars versus 2025 YTD");
	});
});

describe("risk averted packet helpers", () => {
	it("sums only counted event dollars and keeps YoY honest in the PDF payload", () => {
		const events = [
			buildRiskImpactEvent({
				id: "a",
				date: "2026-03-01T00:00:00.000Z",
				kind: "flag",
				recordName: "Grant A",
				dollars: 100000,
				source: "Contract audit",
				countedTowardTotal: true,
			}),
			buildRiskImpactEvent({
				id: "b",
				date: "2026-04-01T00:00:00.000Z",
				kind: "flag",
				recordName: "Grant A duplicate",
				dollars: 100000,
				source: "Contract audit",
				countedTowardTotal: false,
			}),
		];
		expect(sumCountedEventDollars(events)).toBe(100000);
		expect(formatRiskUsdExact(100000)).toBe("$100,000");
		expect(hrefForEventKind("renewal")).toBe("/licenses");

		const payload = buildRiskAvertedPdfPayload({
			orgName: "Northside Clinic",
			generatedAt: "Sep 20, 2026, 8:00 PM",
			snapshot: snapshotFixture({ events }),
		});
		expect(payload.countedEventCount).toBe(1);
		expect(payload.eventCount).toBe(2);
		expect(payload.countedDollarsFormatted).toBe("$100,000");
		expect(payload.yoyLabel).toBe("No prior-year dollars versus 2025 YTD");
		expect(payload.primaryFormatted).toBe("$2.1M");
	});
});
