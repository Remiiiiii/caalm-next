import { isObligationKind, isObligationStatus } from "@/lib/funding/constants";
import type { ObligationKind, ObligationStatus } from "@/lib/funding/types";
import { pickMappedValue } from "@/lib/import/mapping";
import type { ObligationImportFieldKey } from "./fields";

export type MappedObligationImportRow = {
	rowNumber: number;
	contractNumber: string;
	contractId: string;
	title: string;
	dueDate?: string;
	kind: ObligationKind;
	status: ObligationStatus;
	reminderDaysBefore?: number;
	linkUrl?: string;
	description?: string;
};

export type ObligationImportRowError = {
	rowNumber: number;
	message: string;
};

export function applyObligationColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, ObligationImportFieldKey | "">,
): { valid: MappedObligationImportRow[]; errors: ObligationImportRowError[] } {
	const valid: MappedObligationImportRow[] = [];
	const errors: ObligationImportRowError[] = [];
	rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const pick = (field: ObligationImportFieldKey) =>
			pickMappedValue(row, mapping, field);
		const title = pick("title");
		const contractNumber = pick("contractNumber");
		const contractId = pick("contractId");
		if (!title || (!contractNumber && !contractId)) {
			errors.push({
				rowNumber,
				message: "Each row needs a title and a contract number or contract ID.",
			});
			return;
		}
		const kindRaw = pick("kind");
		const statusRaw = pick("status");
		if (kindRaw && !isObligationKind(kindRaw.toLowerCase())) {
			errors.push({
				rowNumber,
				message:
					"Kind must be renewal, reporting, deliverable, compliance, payment, or other.",
			});
			return;
		}
		if (statusRaw && !isObligationStatus(statusRaw.toLowerCase())) {
			errors.push({
				rowNumber,
				message:
					"Status must be open, in_progress, done, waived, or overdue.",
			});
			return;
		}
		const reminderRaw = pick("reminderDaysBefore");
		const reminderDaysBefore = reminderRaw
			? Number(reminderRaw)
			: undefined;
		if (
			reminderRaw &&
			(!Number.isFinite(reminderDaysBefore) || (reminderDaysBefore ?? 0) < 0)
		) {
			errors.push({
				rowNumber,
				message: "Reminder days before must be a non-negative number.",
			});
			return;
		}
		valid.push({
			rowNumber,
			contractNumber,
			contractId,
			title,
			dueDate: pick("dueDate") || undefined,
			kind: kindRaw
				? (kindRaw.toLowerCase() as ObligationKind)
				: "other",
			status: statusRaw
				? (statusRaw.toLowerCase() as ObligationStatus)
				: "open",
			reminderDaysBefore,
			linkUrl: pick("linkUrl") || undefined,
			description: pick("description") || undefined,
		});
	});
	return { valid, errors };
}
