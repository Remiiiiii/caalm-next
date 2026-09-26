import { findDuplicateConstituents } from "@/lib/constituents/repository";
import { normalizeEmail } from "@/lib/constituents/duplicates";
import {
	applyColumnMapping,
	classifyImportRow,
	summarizeImportPlans,
	type ImportDryRunResult,
} from "./dry-run";
import type { ImportFieldKey } from "./fields";

export async function runConstituentImportDryRun(input: {
	orgId: string;
	rows: Record<string, string>[];
	mapping: Record<string, ImportFieldKey | "">;
}): Promise<ImportDryRunResult> {
	const mapped = applyColumnMapping(input.rows, input.mapping);
	const fileDuplicateEmails = new Set<string>();
	const seen = new Set<string>();
	for (const row of mapped) {
		const email = normalizeEmail(row.email);
		if (!email) continue;
		if (seen.has(email)) fileDuplicateEmails.add(email);
		seen.add(email);
	}

	const plans = [];
	for (const row of mapped) {
		const existingMatches = await findDuplicateConstituents({
			orgId: input.orgId,
			firstName: row.firstName,
			lastName: row.lastName,
			email: row.email,
		});
		plans.push(
			classifyImportRow({
				row,
				existingMatches,
				fileDuplicateEmails,
			}),
		);
	}

	return {
		plans,
		counts: summarizeImportPlans(plans),
	};
}
