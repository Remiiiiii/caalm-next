/**
 * Platform Readiness Roadmap catalog PR batches.
 * Up to five top-level task codes per batch PR — same rule as Nonprofit.
 */

export type PrdPrBatch = {
	sectionNumber: number;
	sectionTitle: string;
	batch: number;
	taskCodes: string[];
	taskTitles: string[];
	linkedPrNumber?: number;
};

export const PRD_PR_BATCHES: PrdPrBatch[] = [
	{
		sectionNumber: 0,
		sectionTitle: "Platform Readiness Roadmap Engine",
		batch: 1,
		taskCodes: ["0.1", "0.2", "0.3", "0.4"],
		taskTitles: [
			"Third catalog in the roadmap engine",
			"Sequential unlock for readiness work",
			"IT Development board page",
			"PRD branch and title matching",
		],
		linkedPrNumber: 179,
	},
	{
		sectionNumber: 1,
		sectionTitle: "Workspace data isolation",
		batch: 1,
		taskCodes: ["1.1", "1.2", "1.3", "1.4"],
		taskTitles: [
			"Org filter on view-all contract lists",
			"Org filter on licenses, files, and invites",
			"Automated two-org regression tests",
			"Sales and support isolation note",
		],
	},
	{
		sectionNumber: 2,
		sectionTitle: "API permission coverage",
		batch: 1,
		taskCodes: ["2.1", "2.2", "2.3", "2.4", "2.5"],
		taskTitles: [
			"Protect file upload and download",
			"Protect analytics and reporting APIs",
			"Protect assistant and legacy AI routes",
			"Retire duplicate contract pipeline routes",
			"CI ratchet on the unguarded list",
		],
	},
	{
		sectionNumber: 3,
		sectionTitle: "Trustworthy sign-in and two-factor",
		batch: 1,
		taskCodes: ["3.1", "3.2", "3.3", "3.4"],
		taskTitles: [
			"Session-bound two-factor setup",
			"Remove test-only 2FA from production",
			"Audit log on session revoke",
			"Audit log on password and 2FA reset",
		],
	},
	{
		sectionNumber: 4,
		sectionTitle: "Honest dashboards and compliance views",
		batch: 1,
		taskCodes: ["4.1", "4.2", "4.3", "4.4"],
		taskTitles: [
			"Real audit data by default in production",
			"Label or replace sample analytics widgets",
			"Fix or hide the unified analytics API for customers",
			"Compliance tab honesty",
		],
	},
	{
		sectionNumber: 5,
		sectionTitle: "IT portal credibility",
		batch: 1,
		taskCodes: ["5.1", "5.2", "5.3"],
		taskTitles: [
			"Replace or label the IT dashboard API",
			"Hide or badge placeholder IT pages",
			"Storage and monitoring truth",
		],
	},
	{
		sectionNumber: 6,
		sectionTitle: "Enterprise buyer honesty",
		batch: 1,
		taskCodes: ["6.1", "6.2", "6.3", "6.4"],
		taskTitles: [
			"Integrations panel matches reality",
			"Security questionnaire starter",
			"Handoff to CLM API and SSO sections",
			"Buyer demo script update",
		],
	},
];

export function prdBatchBranchName(batch: PrdPrBatch): string {
	const section = String(batch.sectionNumber).padStart(2, "0");
	return `cursor/platform-readiness/s${section}-b${batch.batch}-5329`;
}

/** File id under src/lib/roadmap/prd-batches/ (e.g. s01-b1). */
export function prdBatchFileId(batch: PrdPrBatch): string {
	const section = String(batch.sectionNumber).padStart(2, "0");
	return `s${section}-b${batch.batch}`;
}

export function linkedPrNumbersForPrdSection(sectionNumber: number): number[] {
	const numbers: number[] = [];
	for (const batch of PRD_PR_BATCHES) {
		if (batch.sectionNumber !== sectionNumber) continue;
		if (batch.linkedPrNumber != null) numbers.push(batch.linkedPrNumber);
	}
	return numbers;
}

export function prdBatchForPr(prNumber: number): PrdPrBatch | undefined {
	return PRD_PR_BATCHES.find((item) => item.linkedPrNumber === prNumber);
}

export function prdBatchOwnsTaskCode(batch: PrdPrBatch, taskCode: string): boolean {
	return batch.taskCodes.some(
		(code) => taskCode === code || taskCode.startsWith(`${code}.`),
	);
}

export function prdTaskCodesCompletedByPr(prNumber: number): string[] {
	const batch = prdBatchForPr(prNumber);
	if (!batch) return [];
	return batch.taskCodes;
}

export function prdBatchFromHeadRef(headRef: string): PrdPrBatch | undefined {
	const match = headRef.match(/(?:^|\/)s(\d+)-b(\d+)(?:-|$)/i);
	if (!match) return undefined;
	const sectionNumber = Number(match[1]);
	const batchNumber = Number(match[2]);
	return PRD_PR_BATCHES.find(
		(item) =>
			item.sectionNumber === sectionNumber && item.batch === batchNumber,
	);
}

export function prdCatalogDisplayTitleForPr(prNumber: number): string {
	const batch = PRD_PR_BATCHES.find((item) => item.linkedPrNumber === prNumber);
	if (!batch) return "";
	const last = batch.taskCodes[batch.taskCodes.length - 1];
	const range =
		batch.taskCodes.length === 1 || !last
			? batch.taskCodes[0]
			: `${batch.taskCodes[0]}–${last}`;
	return `PRD S${batch.sectionNumber} B${batch.batch} ${batch.sectionTitle} (${range})`;
}
