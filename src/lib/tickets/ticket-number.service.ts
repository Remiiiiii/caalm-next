import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getTicketByNumber } from "./ticket.repository";
import { formatTicketNumber } from "./ticket-number.utils";

export type TicketSequenceRow = {
	$id: string;
	orgId: string;
	year: number;
	lastSequence: number;
};

export {
	displayTicketNumber,
	formatTicketNumber,
	normalizeTicketNumberQuery,
	parseTicketNumber,
} from "./ticket-number.utils";

function dbId(): string {
	return appwriteConfig.databaseId || "default-db";
}

function sequencesTable(): string {
	return (
		appwriteConfig.ticketSequencesCollectionId || "69b8a209009b2a6e0c09"
	);
}

/**
 * Stable Appwrite row id for org+year (alphanumeric, ≤36 chars).
 * Why hash: org ids vary in length; Appwrite custom ids must stay short and clean.
 */
export function buildSequenceRowId(orgId: string, year: number): string {
	const digest = createHash("sha256")
		.update(`${orgId}:${year}`)
		.digest("hex")
		.slice(0, 28);
	return `ts${digest}`;
}

async function getSequenceRow(
	rowId: string,
): Promise<TicketSequenceRow | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: sequencesTable(),
			rowId,
		});
		return row as unknown as TicketSequenceRow;
	} catch {
		return null;
	}
}

/**
 * Next per-org ticket number for the current UTC year.
 * Retries on races (two submits at once) so numbers stay unique within an org.
 */
export async function allocateTicketNumber(orgId: string): Promise<string> {
	const year = new Date().getUTCFullYear();
	const rowId = buildSequenceRowId(orgId, year);
	const { tablesDB } = await createAdminClient();

	for (let attempt = 0; attempt < 8; attempt += 1) {
		const existing = await getSequenceRow(rowId);

		if (!existing) {
			try {
				await tablesDB.createRow({
					databaseId: dbId(),
					tableId: sequencesTable(),
					rowId,
					data: {
						orgId,
						year,
						lastSequence: 1,
					},
				});
				const candidate = formatTicketNumber(year, 1);
				const taken = await getTicketByNumber({
					orgId,
					ticketNumber: candidate,
				});
				if (!taken) return candidate;
				continue;
			} catch {
				// Another request created the row first — read and increment next loop.
				continue;
			}
		}

		const next = Number(existing.lastSequence) + 1;
		if (!Number.isFinite(next) || next < 1) {
			throw new Error("Invalid ticket sequence state");
		}

		try {
			await tablesDB.updateRow({
				databaseId: dbId(),
				tableId: sequencesTable(),
				rowId,
				data: { lastSequence: next },
			});
			const candidate = formatTicketNumber(year, next);
			// Guard against lost-update races: skip numbers already on a ticket.
			const taken = await getTicketByNumber({
				orgId,
				ticketNumber: candidate,
			});
			if (!taken) return candidate;
		} catch {
			continue;
		}
	}

	throw new Error("Failed to allocate ticket number");
}
