import {
	matchesDuplicateSignals,
	normalizeEmail,
	normalizeFirstName,
	normalizeLastName,
} from "@/lib/constituents/duplicates";
import type { Constituent } from "@/lib/constituents/types";
import { isConstituentType } from "@/lib/constituents/types";
import type { ImportFieldKey } from "./fields";

export type MappedImportRow = {
	rowIndex: number;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	type: "donor" | "volunteer" | "member" | "other";
	giftAmount?: number;
	giftDate?: string;
	giftMethod?: string;
};

export type ImportRowPlan =
	| {
			rowIndex: number;
			action: "create";
			row: MappedImportRow;
	  }
	| {
			rowIndex: number;
			action: "update";
			row: MappedImportRow;
			existingConstituentId: string;
	  }
	| {
			rowIndex: number;
			action: "duplicate";
			row: MappedImportRow;
			reason: string;
			duplicateEmails?: string[];
	  }
	| {
			rowIndex: number;
			action: "error";
			row: MappedImportRow;
			errors: string[];
	  };

export type ImportDryRunCounts = {
	create: number;
	update: number;
	duplicate: number;
	error: number;
};

export type ImportDryRunResult = {
	plans: ImportRowPlan[];
	counts: ImportDryRunCounts;
};

export function applyColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, ImportFieldKey | "">,
): MappedImportRow[] {
	return rows.map((raw, index) => {
		const pick = (field: ImportFieldKey) => {
			const header = Object.entries(mapping).find(([, v]) => v === field)?.[0];
			return header ? String(raw[header] ?? "").trim() : "";
		};
		const typeRaw = pick("type").toLowerCase();
		const type = isConstituentType(typeRaw) ? typeRaw : "donor";
		const amountRaw = pick("giftAmount");
		const giftAmount =
			amountRaw && Number.isFinite(Number(amountRaw))
				? Number(amountRaw)
				: undefined;
		return {
			rowIndex: index + 1,
			firstName: pick("firstName"),
			lastName: pick("lastName"),
			email: pick("email") || undefined,
			phone: pick("phone") || undefined,
			type,
			giftAmount,
			giftDate: pick("giftDate") || undefined,
			giftMethod: pick("giftMethod") || undefined,
		};
	});
}

function validateRow(row: MappedImportRow): string[] {
	const errors: string[] = [];
	if (!row.firstName.trim()) errors.push("First name is required");
	if (!row.lastName.trim()) errors.push("Last name is required");
	if (row.giftAmount != null && row.giftAmount <= 0) {
		errors.push("Gift amount must be positive");
	}
	if (row.giftAmount != null && !row.giftDate) {
		errors.push("Gift date is required when amount is set");
	}
	return errors;
}

/** Pure classification; async wrapper loads duplicates per row from DB. */
export function classifyImportRow(input: {
	row: MappedImportRow;
	existingMatches: Constituent[];
	fileDuplicateEmails: Set<string>;
}): ImportRowPlan {
	const errors = validateRow(input.row);
	if (errors.length > 0) {
		return { rowIndex: input.row.rowIndex, action: "error", row: input.row, errors };
	}

	const normalizedEmail = normalizeEmail(input.row.email);
	if (normalizedEmail && input.fileDuplicateEmails.has(normalizedEmail)) {
		return {
			rowIndex: input.row.rowIndex,
			action: "duplicate",
			row: input.row,
			reason: "Duplicate email within this file",
			duplicateEmails: [normalizedEmail],
		};
	}

	const matches = input.existingMatches.filter((candidate) =>
		matchesDuplicateSignals(
			{
				normalizedEmail,
				normalizedFirstName: normalizeFirstName(input.row.firstName),
				normalizedLastName: normalizeLastName(input.row.lastName),
			},
			{
				normalizedEmail: candidate.normalizedEmail,
				firstName: candidate.firstName,
				normalizedLastName: candidate.normalizedLastName,
			},
		),
	);

	if (matches.length > 1) {
		return {
			rowIndex: input.row.rowIndex,
			action: "duplicate",
			row: input.row,
			reason: "Multiple existing constituents match this row",
		};
	}

	if (matches.length === 1) {
		return {
			rowIndex: input.row.rowIndex,
			action: "update",
			row: input.row,
			existingConstituentId: matches[0]!.$id,
		};
	}

	return { rowIndex: input.row.rowIndex, action: "create", row: input.row };
}

export function summarizeImportPlans(plans: ImportRowPlan[]): ImportDryRunCounts {
	return plans.reduce(
		(acc, plan) => {
			acc[plan.action] += 1;
			return acc;
		},
		{ create: 0, update: 0, duplicate: 0, error: 0 },
	);
}

export function importErrorsToCsv(plans: ImportRowPlan[]): string {
	const lines = ["row_index,action,reason,detail"];
	for (const plan of plans) {
		if (plan.action === "error") {
			lines.push(
				`${plan.rowIndex},error,validation,"${plan.errors.join("; ").replace(/"/g, '""')}"`,
			);
		} else if (plan.action === "duplicate") {
			lines.push(
				`${plan.rowIndex},duplicate,"${plan.reason.replace(/"/g, '""')}",${(plan.duplicateEmails ?? []).join("|")}`,
			);
		}
	}
	return `${lines.join("\n")}\n`;
}
