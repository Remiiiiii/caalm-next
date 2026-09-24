/** Count KPIs from live contract rows (the same fields stored in Appwrite). */

export interface ContractKpiRow {
	contractExpiryDate?: unknown;
	compliance?: unknown;
	status?: unknown;
	isExpired?: unknown;
}

export interface ContractKpis {
	totalContracts: number;
	expiringContracts: number;
	complianceRate: number;
}

function expiryDay(raw: unknown): Date | null {
	if (typeof raw !== "string" || !raw) return null;
	const parsed = new Date(raw);
	if (Number.isNaN(parsed.getTime())) return null;
	parsed.setHours(0, 0, 0, 0);
	return parsed;
}

function asRow(raw: ContractKpiRow | Record<string, unknown>): ContractKpiRow {
	const rec = raw as Record<string, unknown>;
	const nested =
		rec.data && typeof rec.data === "object"
			? (rec.data as Record<string, unknown>)
			: rec;
	return {
		contractExpiryDate: nested.contractExpiryDate ?? rec.contractExpiryDate,
		compliance: nested.compliance ?? rec.compliance,
		status: nested.status ?? rec.status,
		isExpired: nested.isExpired ?? rec.isExpired,
	};
}

export function computeContractKpis(
	rows: Array<ContractKpiRow | Record<string, unknown>>,
	total: number,
): ContractKpis {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const horizon = new Date(now);
	horizon.setDate(now.getDate() + 30);

	let expiringContracts = 0;
	let compliantContracts = 0;

	for (const raw of rows) {
		const row = asRow(raw);
		if (row.compliance === "up-to-date" || row.compliance === "compliant") {
			compliantContracts += 1;
		}

		const status = String(row.status || "").toLowerCase();
		if (status === "expired" || row.isExpired === true) continue;

		const day = expiryDay(row.contractExpiryDate);
		if (!day) continue;
		if (day >= now && day <= horizon) expiringContracts += 1;
	}

	return {
		totalContracts: total,
		expiringContracts,
		complianceRate:
			total > 0 ? Math.round((compliantContracts / total) * 100) : 0,
	};
}
