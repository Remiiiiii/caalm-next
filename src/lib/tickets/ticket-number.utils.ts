/** Format: TKT-2026-0042 (pad to at least 4 digits). */
export function formatTicketNumber(year: number, sequence: number): string {
	const padded = String(sequence).padStart(4, "0");
	return `TKT-${year}-${padded}`;
}

/** Normalize user search input toward TKT-YYYY-#### when possible. */
export function normalizeTicketNumberQuery(raw: string): string {
	const trimmed = raw.trim().toUpperCase();
	if (!trimmed) return "";

	const full = trimmed.match(/^TKT-?(\d{4})-?(\d+)$/);
	if (full) {
		return formatTicketNumber(Number(full[1]), Number(full[2]));
	}

	const yearSeq = trimmed.match(/^(\d{4})-(\d+)$/);
	if (yearSeq) {
		return formatTicketNumber(Number(yearSeq[1]), Number(yearSeq[2]));
	}

	return trimmed;
}

export function parseTicketNumber(
	value: string,
): { year: number; sequence: number } | null {
	const match = value.trim().toUpperCase().match(/^TKT-(\d{4})-(\d+)$/);
	if (!match) return null;
	return { year: Number(match[1]), sequence: Number(match[2]) };
}

/** Display helper for UI — falls back when older rows lack a number. */
export function displayTicketNumber(
	ticket: { ticketNumber?: string | null; $id: string },
): string {
	return ticket.ticketNumber?.trim() || ticket.$id;
}
