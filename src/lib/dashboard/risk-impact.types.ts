export type RiskImpactPeriod = "ytd" | "last30" | "last90";

export interface RiskImpactWin {
	label: string;
	amount?: number;
	at: string;
}

export interface RiskImpactSparkPoint {
	label: string;
	value: number;
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
	monitoring: {
		contractsMonitored: number;
		grantsMonitored: number;
		clausesFlagged: number;
	};
	sparkline: RiskImpactSparkPoint[];
	trackingNote: string;
	narrative: string;
	recentWins: RiskImpactWin[];
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
