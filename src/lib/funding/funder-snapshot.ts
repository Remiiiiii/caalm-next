import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { getFundById } from "@/lib/funds/repository";
import { listPostedGiftsForContract } from "@/lib/gifts/contract-gifts";
import { listHoursForGrant } from "@/lib/volunteers/volunteer-hours.repository";
import {
	budgetVsActual,
	type BudgetVsActualResult,
} from "./budget-vs-actual";
import { getGrantFundIdForContract } from "./grant-fund.repository";
import type { GrantBudgetCategory } from "./grant-budget.types";
import { listBudgetLinesForGrant } from "./grant-budget.repository";
import { listObligations } from "./obligation.repository";
import { listRestrictionReleases } from "./restriction-release.repository";

export type FunderSnapshotFund = {
	fundId: string;
	code: string;
	name: string;
};

export type FunderSnapshotRestriction = {
	releasedAt: string;
	amount: number;
	fundFrom: string;
	fundTo: string;
	note?: string;
};

export type FunderSnapshotGift = {
	giftId: string;
	giftDate: string;
	amount: number;
	currency: string;
	receiptNumber?: number;
	constituentId: string;
};

export type FunderSnapshotVolunteerHour = {
	workedAt: string;
	minutesWorked: number;
	volunteerConstituentId: string;
	roleLabel?: string;
};

export type FunderSnapshotBudgetLine = {
	lineId: string;
	category: string;
	budgetAmount: number;
	actualAmount: number;
	overBudget: boolean;
};

export type FunderSnapshot = {
	orgId: string;
	contractId: string;
	contractName: string;
	generatedAt: string;
	fund: FunderSnapshotFund | null;
	restrictions: FunderSnapshotRestriction[];
	budgetVsActual: BudgetVsActualResult;
	budgetLines: FunderSnapshotBudgetLine[];
	gifts: FunderSnapshotGift[];
	giftsCashTotal: number;
	volunteerHours: FunderSnapshotVolunteerHour[];
	volunteerHoursTotalMinutes: number;
};

export type FunderSnapshotAssemblyInput = {
	orgId: string;
	contractId: string;
	contractName: string;
	fund: FunderSnapshotFund | null;
	restrictions: (FunderSnapshotRestriction & { orgId?: string })[];
	budgetLines: { $id: string; category: string; amount: number }[];
	obligations: {
		orgId: string;
		status: string;
		kind: string;
		actualAmount?: number | null;
		budgetCategory?: string | null;
	}[];
	gifts: {
		orgId: string;
		$id: string;
		giftDate: string;
		amount: number;
		currency: string;
		status: string;
		voidOfId?: string;
		receiptNumber?: number;
		constituentId: string;
	}[];
	volunteerHours: {
		orgId: string;
		approvalStatus: string;
		grantContractId?: string;
		workedAt: string;
		minutesWorked: number;
		volunteerConstituentId: string;
		roleLabel?: string;
	}[];
	generatedAt?: string;
};

function orgScoped<T extends { orgId: string }>(orgId: string, rows: T[]): T[] {
	return rows.filter((row) => row.orgId === orgId);
}

/**
 * Pure one-pager assembler — org-scoped rows only; approved volunteer hours
 * tagged to this grant contract.
 */
export function assembleFunderSnapshot(
	input: FunderSnapshotAssemblyInput,
): FunderSnapshot {
	const orgId = input.orgId;
	const restrictions = input.restrictions
		.filter((row) => !row.orgId || row.orgId === orgId)
		.map(({ releasedAt, amount, fundFrom, fundTo, note }) => ({
			releasedAt,
			amount,
			fundFrom,
			fundTo,
			note,
		}));

	const gifts = orgScoped(orgId, input.gifts).map((g) => ({
		giftId: g.$id,
		giftDate: g.giftDate,
		amount: g.amount,
		currency: g.currency,
		receiptNumber: g.receiptNumber,
		constituentId: g.constituentId,
	}));

	const vsActual = budgetVsActual({
		budgetLines: input.budgetLines.map((line) => ({
			$id: line.$id,
			category: line.category as GrantBudgetCategory,
			amount: line.amount,
		})),
		obligations: orgScoped(orgId, input.obligations),
		gifts: orgScoped(orgId, input.gifts).map((g) => ({
			amount: g.amount,
			status: g.status,
			voidOfId: g.voidOfId,
		})),
	});

	const budgetLines: FunderSnapshotBudgetLine[] = vsActual.lines.map((line) => ({
		lineId: line.lineId,
		category: line.category,
		budgetAmount: line.budgetAmount,
		actualAmount: line.actualAmount,
		overBudget: line.overBudget,
	}));

	const volunteerHours = orgScoped(orgId, input.volunteerHours)
		.filter(
			(row) =>
				row.approvalStatus === "approved" &&
				row.grantContractId === input.contractId,
		)
		.map((row) => ({
			workedAt: row.workedAt,
			minutesWorked: row.minutesWorked,
			volunteerConstituentId: row.volunteerConstituentId,
			roleLabel: row.roleLabel,
		}));

	const volunteerHoursTotalMinutes = volunteerHours.reduce(
		(sum, row) => sum + row.minutesWorked,
		0,
	);

	const giftsCashTotal = vsActual.giftActual;

	return {
		orgId,
		contractId: input.contractId,
		contractName: input.contractName,
		generatedAt: input.generatedAt ?? new Date(0).toISOString(),
		fund: input.fund,
		restrictions,
		budgetVsActual: vsActual,
		budgetLines,
		gifts,
		giftsCashTotal,
		volunteerHours,
		volunteerHoursTotalMinutes,
	};
}

export function funderSnapshotToCsv(snapshot: FunderSnapshot): string {
	const escape = (value: string | number | undefined) => {
		const raw = value == null ? "" : String(value);
		if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
		return raw;
	};
	const lines: string[] = [
		"section,field,value,amount,date,category,detail",
		`grant,contract_id,${escape(snapshot.contractId)},,,,`,
		`grant,contract_name,${escape(snapshot.contractName)},,,,`,
		`grant,generated_at,${escape(snapshot.generatedAt)},,,,`,
	];

	if (snapshot.fund) {
		lines.push(
			`fund,code,${escape(snapshot.fund.code)},,,,`,
			`fund,name,${escape(snapshot.fund.name)},,,,`,
			`fund,fund_id,${escape(snapshot.fund.fundId)},,,,`,
		);
	}

	lines.push(
		`summary,total_budget,,${snapshot.budgetVsActual.totalBudget},,,`,
		`summary,total_actual,,${snapshot.budgetVsActual.totalActual},,,`,
		`summary,gifts_cash_total,,${snapshot.giftsCashTotal},,,`,
		`summary,volunteer_minutes,,${snapshot.volunteerHoursTotalMinutes},,,`,
	);

	for (const row of snapshot.restrictions) {
		lines.push(
			`restriction,release,,${row.amount},${escape(row.releasedAt)},,${escape(row.note ?? `${row.fundFrom}→${row.fundTo}`)}`,
		);
	}

	for (const row of snapshot.budgetLines) {
		lines.push(
			`budget,line,,${row.budgetAmount},,${escape(row.category)},actual=${row.actualAmount};over=${row.overBudget}`,
		);
	}

	for (const gift of snapshot.gifts) {
		lines.push(
			`gift,${escape(gift.giftId)},${escape(gift.constituentId)},${gift.amount},${escape(gift.giftDate)},,${escape(String(gift.receiptNumber ?? ""))}`,
		);
	}

	for (const hour of snapshot.volunteerHours) {
		lines.push(
			`volunteer,${escape(hour.volunteerConstituentId)},${escape(hour.roleLabel ?? "")},${hour.minutesWorked},${escape(hour.workedAt)},,`,
		);
	}

	return `${lines.join("\n")}\n`;
}

/** Load live org-scoped funder snapshot for a grant contract. */
export async function loadFunderSnapshot(
	orgId: string,
	contractId: string,
): Promise<FunderSnapshot> {
	const contract = await loadContractForOrg(contractId, orgId);
	const contractName = String(
		contract.contractName || contract.name || "Untitled contract",
	);

	const [
		fundId,
		restrictions,
		budgetLines,
		obligations,
		giftsResult,
		volunteerRaw,
	] = await Promise.all([
		getGrantFundIdForContract(orgId, contractId),
		listRestrictionReleases(orgId, contractId),
		listBudgetLinesForGrant(orgId, contractId),
		listObligations({ orgId, contractId }),
		listPostedGiftsForContract(orgId, contractId),
		listHoursForGrant(orgId, contractId),
	]);

	let fund: FunderSnapshotFund | null = null;
	if (fundId) {
		const record = await getFundById(orgId, fundId);
		if (record) {
			fund = { fundId: record.$id, code: record.code, name: record.name };
		}
	}

	return assembleFunderSnapshot({
		orgId,
		contractId,
		contractName,
		fund,
		restrictions: restrictions.map((r) => ({
			orgId: r.orgId,
			releasedAt: r.releasedAt,
			amount: r.amount,
			fundFrom: r.fundFrom,
			fundTo: r.fundTo,
			note: r.note,
		})),
		budgetLines,
		obligations: obligations.map((o) => ({
			orgId: o.orgId,
			status: o.status,
			kind: o.kind,
			actualAmount: o.actualAmount,
			budgetCategory: o.budgetCategory,
		})),
		gifts: giftsResult.items.map((g) => ({
			orgId: g.orgId,
			$id: g.$id,
			giftDate: g.giftDate,
			amount: g.amount,
			currency: g.currency,
			status: g.status,
			voidOfId: g.voidOfId,
			receiptNumber: g.receiptNumber,
			constituentId: g.constituentId,
		})),
		volunteerHours: volunteerRaw.map((h) => ({
			orgId: h.orgId,
			approvalStatus: h.approvalStatus,
			grantContractId: h.grantContractId,
			workedAt: h.workedAt,
			minutesWorked: h.minutesWorked,
			volunteerConstituentId: h.volunteerConstituentId,
			roleLabel: h.roleLabel,
		})),
		generatedAt: new Date().toISOString(),
	});
}

/** Approved minutes tagged to the grant (convenience for tests). */
export function approvedGrantVolunteerMinutes(
	input: FunderSnapshotAssemblyInput,
): number {
	return assembleFunderSnapshot(input).volunteerHoursTotalMinutes;
}
