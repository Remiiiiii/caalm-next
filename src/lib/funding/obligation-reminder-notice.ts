export type ObligationReminderMetadata = {
	obligationId: string;
	dueDate: string;
	reminderDaysBefore: number;
};

/** Calendar date only so sent keys stay stable across timestamps. */
export function normalizeObligationDueDate(dueDate: string): string {
	return dueDate.slice(0, 10);
}

export function obligationReminderSentKey(
	meta: ObligationReminderMetadata,
): string {
	return `${meta.obligationId}:${normalizeObligationDueDate(meta.dueDate)}:${meta.reminderDaysBefore}`;
}

export function buildObligationReminderMetadata(
	meta: ObligationReminderMetadata,
): string {
	const normalized: ObligationReminderMetadata = {
		obligationId: meta.obligationId,
		dueDate: normalizeObligationDueDate(meta.dueDate),
		reminderDaysBefore: meta.reminderDaysBefore,
	};
	return JSON.stringify(normalized);
}

function asMetadataFields(
	value: Record<string, unknown>,
): ObligationReminderMetadata | null {
	const obligationId =
		typeof value.obligationId === "string" ? value.obligationId.trim() : "";
	const dueRaw = typeof value.dueDate === "string" ? value.dueDate : "";
	const reminderDaysBefore =
		typeof value.reminderDaysBefore === "number"
			? value.reminderDaysBefore
			: Number(value.reminderDaysBefore);

	if (!obligationId || !dueRaw) return null;
	if (!Number.isInteger(reminderDaysBefore) || reminderDaysBefore < 0) {
		return null;
	}

	return {
		obligationId,
		dueDate: normalizeObligationDueDate(dueRaw),
		reminderDaysBefore,
	};
}

export function parseObligationReminderMetadata(
	raw?: string | Record<string, unknown> | null,
): ObligationReminderMetadata | null {
	if (!raw) return null;
	if (typeof raw === "object") {
		return asMetadataFields(raw);
	}
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}
		return asMetadataFields(parsed as Record<string, unknown>);
	} catch {
		return null;
	}
}
