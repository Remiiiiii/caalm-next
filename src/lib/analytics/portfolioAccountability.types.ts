export type PortfolioPeriod = "30d" | "90d" | "1y";

export interface StatusCounts {
	active: number;
	expired: number;
	pendingReview: number;
	inactive: number;
	other: number;
	total: number;
}

export interface PortfolioAccountabilityMetrics {
	period: PortfolioPeriod;
	periodStart: string;
	periodEnd: string;
	portfolio: {
		contracts: StatusCounts;
		licenses: StatusCounts;
		totalDocuments: number;
		totalValue: number;
	};
	velocity: {
		avgDaysSubmitToActive: number | null;
		medianDaysSubmitToActive: number | null;
		avgStepHoursByKind: Array<{
			stepKind: string;
			avgHours: number;
			count: number;
		}>;
		sla: {
			openItems: number;
			atRisk: number;
			breached: number;
			avgStepHours: number | null;
			breachRate: number;
		};
	};
	expiration: {
		expiredInPeriod: number;
		eligible: number;
		expirationRate: number;
		intentional: number;
		unintentional: number;
		unintentionalRate: number;
		avgDaysOverdueBeforeAttest: number | null;
	};
	accountability: {
		pending: number;
		submitted: number;
		reviewed: number;
		overduePending: number;
		avgHoursToAttest: number | null;
		unattestedExpirations: number;
	};
	renewal: {
		renewedTotal: number;
		within30: number;
		within60: number;
		within90: number;
		recoveryRate30: number;
	};
	rootCause: Array<{ category: string; label: string; count: number }>;
	departments: Array<{
		department: string;
		documents: number;
		expired: number;
		pendingAttestations: number;
		value: number;
	}>;
	trends: Array<{
		label: string;
		expired: number;
		attested: number;
		avgDaysToActive: number | null;
	}>;
}
