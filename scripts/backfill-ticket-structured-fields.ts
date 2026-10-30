/**
 * Backfill the structured bug-report columns on existing engineering tickets by
 * parsing their markdown `description` (inverse of composeEngineeringBugDescription).
 *
 * Prerequisites: the stepsToReproduce / expectedBehavior / actualBehavior / os /
 * environment / confirmedNoDuplicate / confirmedProductBug columns exist on the
 * tickets table.
 *
 * Dry run:  pnpm tsx scripts/backfill-ticket-structured-fields.ts
 * Write:    pnpm tsx scripts/backfill-ticket-structured-fields.ts --apply
 */

import { Query } from "node-appwrite";
import { createAdminClient } from "../src/lib/appwrite";
import { appwriteConfig } from "../src/lib/appwrite/config";
import {
	BUG_CONFIRM_IS_BUG,
	BUG_CONFIRM_SEARCHED,
	parseEngineeringBugDescription,
} from "../src/lib/tickets/bug-report-body";

const PAGE = 100;

async function main() {
	const apply = process.argv.includes("--apply");
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const tableId = appwriteConfig.ticketsCollectionId || "tickets";

	let offset = 0;
	let updated = 0;
	let skipped = 0;
	for (;;) {
		const page = await tablesDB.listRows({
			databaseId,
			tableId,
			queries: [Query.limit(PAGE), Query.offset(offset)],
		});
		for (const row of page.rows as unknown as Array<Record<string, unknown>>) {
			const id = String(row.$id);
			if (row.stepsToReproduce) {
				skipped += 1;
				continue;
			}
			const parsed = parseEngineeringBugDescription(String(row.description));
			if (!parsed) {
				skipped += 1;
				continue;
			}
			const checked = (label: string) =>
				parsed.confirmations.some((c) => c.label === label && c.checked);
			const data = {
				stepsToReproduce: parsed.steps.join("\n"),
				expectedBehavior: parsed.expected,
				actualBehavior: parsed.actual,
				os: parsed.os || null,
				environment: parsed.environment || null,
				confirmedNoDuplicate: checked(BUG_CONFIRM_SEARCHED),
				confirmedProductBug: checked(BUG_CONFIRM_IS_BUG),
			};
			console.log(apply ? "Updating" : "Would update", id, row.ticketNumber);
			if (apply) {
				await tablesDB.updateRow({ databaseId, tableId, rowId: id, data });
			}
			updated += 1;
		}
		if (page.rows.length < PAGE) break;
		offset += PAGE;
	}
	console.log(
		`${apply ? "Updated" : "Would update"} ${updated} tickets, skipped ${skipped}.`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
