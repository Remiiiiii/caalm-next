export type RiskImpactPeriod = "ytd" | "last30" | "last90";

export type RiskTrendDirection = "up" | "down" | "flat" | "new";

export interface RiskImpactTrend {
	direction: RiskTrendDirection;
	/** Absolute percent vs the compare window. Null when the prior window is 0. */
	percent: number | null;
	/** e.g. "2025 YTD" or "Q2" */
	vsLabel: string;
	current: number;
	prior: number;
}

export interface RiskImpactWin {
	label: string;
	amount?: number;
	at: string;
}

export type RiskImpactEventKind = "flag" | "gap" | "renewal";

/** One live flag, gap, or renewal that built (or was considered for) risk-averted dollars. */
export interface RiskImpactEvent {
	id: string;
	date: string;
	kind: RiskImpactEventKind;
	recordName: string;
	recordId?: string;
	href?: string;
	dollars: number;
	dollarsFormatted: string;
	source: string;
	countedTowardTotal: boolean;
}

export interface RiskImpactSparkPoint {
	label: string;
	value: number;
	/** Bucket start date (YYYY-MM-DD), used for week/month grain and tooltips. */
	date?: string;
	/** New events in this bucket (not cumulative). */
	increment?: number;
	/** Calendar month label (JAN) for month ticks and rollup. */
	month?: string;
}

export interface RiskImpactSnapshot {
	period: RiskImpactPeriod;
	periodLabel: string;
	currency: "USD";
	primary: {
		label: "Contract & grant risk averted";
		amount: number;
		amountFormatted: string;
	};
	secondary: {
		label: "Portfolio protected";
		amount: number;
		amountFormatted: string;
	};
	counts: {
		complianceFlagsCaught: number;
		auditGapsClosed: number;
		licensesRenewedOnTime: number;
	};
	/** Quarter-over-quarter change for each count (this quarter vs last). */
	countTrends: {
		complianceFlagsCaught: RiskImpactTrend;
		auditGapsClosed: RiskImpactTrend;
		licensesRenewedOnTime: RiskImpactTrend;
	};
	/** Year-over-year change in risk-averted dollars for the same window. */
	yoyTrend: RiskImpactTrend | null;
	/** Still-open exposure — not the events that already built the dollar figure. */
	openRisk: {
		highRisk: number;
		expiring90: number;
		expired: number;
	};
	monitoring: {
		contractsMonitored: number;
		grantsMonitored: number;
		clausesFlagged: number;
	};
	sparkline: RiskImpactSparkPoint[];
	/** Same buckets as sparkline, live flags/gaps/renewals only (no demo dates). */
	liveSparkline: RiskImpactSparkPoint[];
	trackingNote: string;
	narrative: string;
	recentWins: RiskImpactWin[];
	/** Every counted-period event that built the dollar figure. Not capped. */
	events: RiskImpactEvent[];
	computedAt: string;
	dataSources: {
		contracts: boolean;
		licenses: boolean;
		auditLogs: boolean;
	};
}

export interface ComputeRiskImpactOptions {
	userId: string;
	orgId: string;
	period?: RiskImpactPeriod;
	division?: string;
}
