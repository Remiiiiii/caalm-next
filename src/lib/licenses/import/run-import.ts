import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import type { MappedLicenseImportRow } from "./parse";

export type LicenseImportPlanRow =
	| { rowNumber: number; action: "create"; licenseName: string }
	| { rowNumber: number; action: "skip"; reason: string };

export async function dryRunLicenseImport(
	orgId: string,
	rows: MappedLicenseImportRow[],
): Promise<{
	rows: LicenseImportPlanRow[];
	counts: { create: number; skip: number };
}> {
	const existing = await LicenseService.listLicenses(orgId, undefined, {
		limit: 1000,
		offset: 0,
	});
	const numbers = new Set(
		existing.licenses
			.map((row: { licenseNumber?: string }) =>
				String(row.licenseNumber || "")
					.trim()
					.toLowerCase(),
			)
			.filter(Boolean),
	);
	const seen = new Set<string>();
	const plans: LicenseImportPlanRow[] = [];
	let create = 0;
	let skip = 0;
	for (const row of rows) {
		const key = row.licenseNumber.toLowerCase();
		if (key && (seen.has(key) || numbers.has(key))) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "skip",
				reason: "License number already exists",
			});
			skip += 1;
			continue;
		}
		if (key) seen.add(key);
		plans.push({
			rowNumber: row.rowNumber,
			action: "create",
			licenseName: String(row.payload.licenseName || "Untitled"),
		});
		create += 1;
	}
	return { rows: plans, counts: { create, skip } };
}

export async function commitLicenseImport(
	orgId: string,
	ownerId: string,
	rows: MappedLicenseImportRow[],
): Promise<{ createdCount: number; skippedCount: number; failedCount: number }> {
	const dry = await dryRunLicenseImport(orgId, rows);
	const toCreate = new Set(
		dry.rows.filter((r) => r.action === "create").map((r) => r.rowNumber),
	);
	let createdCount = 0;
	let failedCount = 0;
	for (const row of rows) {
		if (!toCreate.has(row.rowNumber)) continue;
		try {
			await LicenseService.createLicense(ownerId, row.payload);
			createdCount += 1;
		} catch (error) {
			failedCount += 1;
			console.error("[licenses import commit]", error);
		}
	}
	return {
		createdCount,
		skippedCount: dry.counts.skip,
		failedCount,
	};
}
