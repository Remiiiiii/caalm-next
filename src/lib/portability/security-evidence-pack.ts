import {
	getCatalogLinkedPrNumbers,
	ROADMAP_CATALOG,
} from "@/lib/roadmap/catalog";
import type { RoadmapCatalogSection } from "@/lib/roadmap/types";

export const EVIDENCE_PACK_SCHEMA_VERSION = 1;

export type EvidenceControl = {
	id: string;
	title: string;
	description: string;
	codeRefs: string[];
	roadmapTaskCodes: string[];
	testSuiteRefs: string[];
};

export type EvidencePackPayload = {
	schemaVersion: number;
	generatedAt: string;
	orgId: string;
	disclaimer: string;
	controls: EvidenceControl[];
	roadmapCrossReference: Array<{
		sectionNumber: number;
		title: string;
		taskCode: string;
		taskTitle: string;
		acceptanceCriteria: string[];
		testSuiteRef: string;
		linkedPrNumber?: number;
	}>;
};

/** Controls that exist in the CAALM codebase today (not aspirational). */
export const EXISTING_SECURITY_CONTROLS: EvidenceControl[] = [
	{
		id: "rbac-permission-gates",
		title: "Permission-based API and UI access",
		description:
			"Protected routes and UI gates check database-assigned permissions via requirePermission / PermissionGate; role-name bypasses are not used.",
		codeRefs: [
			"src/lib/rbac/middleware.ts",
			"src/lib/rbac/authorize.ts",
			"src/components/PermissionGate.tsx",
			".cursor/rules/security-rbac.mdc",
		],
		roadmapTaskCodes: ["1.1", "1.2", "1.3", "1.4"],
		testSuiteRefs: ["tests/rbac/api-authz-matrix.test.ts"],
	},
	{
		id: "step-up-sensitive-actions",
		title: "Step-up verification for sensitive org actions",
		description:
			"Org logo changes, tenant export, and tenant deletion require a recent step-up OTP grant.",
		codeRefs: [
			"src/lib/auth/step-up.ts",
			"src/app/api/organizations/logo/route.ts",
			"src/app/api/organizations/data-export/route.ts",
			"src/app/api/organizations/data-deletion/route.ts",
		],
		roadmapTaskCodes: ["13.1", "13.2"],
		testSuiteRefs: [],
	},
	{
		id: "tenant-data-export",
		title: "Tenant data export (machine-readable)",
		description:
			"Org admins can download org-scoped database rows as JSON with a count manifest; file blobs are excluded in v1.",
		codeRefs: [
			"src/lib/portability/tenant-export.service.ts",
			"src/app/api/organizations/data-export/route.ts",
			"src/components/settings/TenantDataExportCard.tsx",
		],
		roadmapTaskCodes: ["13.1"],
		testSuiteRefs: ["tests/roadmap/13-1.test.ts"],
	},
	{
		id: "tenant-deletion-grace",
		title: "Tenant deletion with grace period",
		description:
			"Deletion is scheduled with a 14-day grace period, cancellable before purge; cron removes org-scoped rows and writes a deletion audit.",
		codeRefs: [
			"src/lib/portability/tenant-deletion.service.ts",
			"src/app/api/organizations/data-deletion/route.ts",
			"src/app/api/cron/tenant-deletion/route.ts",
		],
		roadmapTaskCodes: ["13.2"],
		testSuiteRefs: ["tests/roadmap/13-2.test.ts"],
	},
	{
		id: "audit-logging",
		title: "Audit event logging",
		description:
			"Sensitive mutations and exports can write structured audit log rows for later review.",
		codeRefs: ["src/lib/services/audit-logger.ts"],
		roadmapTaskCodes: ["2.1", "2.2", "2.3"],
		testSuiteRefs: [],
	},
	{
		id: "api-authz-matrix",
		title: "API authorization matrix CI gate",
		description:
			"New App Router API routes must declare an approved auth gate; unguarded routes fail the matrix test.",
		codeRefs: [
			"src/lib/rbac/api-authz-matrix.ts",
			"scripts/new-api-route.ts",
			".cursor/rules/api-route-authz.mdc",
		],
		roadmapTaskCodes: ["1.1"],
		testSuiteRefs: ["tests/rbac/api-authz-matrix.test.ts"],
	},
];

function flattenCatalogTasks(section: RoadmapCatalogSection) {
	const rows: EvidencePackPayload["roadmapCrossReference"] = [];
	const walk = (tasks: RoadmapCatalogSection["tasks"]) => {
		for (const task of tasks) {
			rows.push({
				sectionNumber: section.sectionNumber,
				title: section.title,
				taskCode: task.taskCode,
				taskTitle: task.title,
				acceptanceCriteria: task.acceptanceCriteria,
				testSuiteRef: task.testSuiteRef,
				linkedPrNumber: task.linkedPrNumber,
			});
			if (task.children?.length) walk(task.children);
		}
	};
	walk(section.tasks);
	return rows;
}

export function buildSecurityEvidencePack(input: {
	orgId: string;
	now?: Date;
	controls?: EvidenceControl[];
}): EvidencePackPayload {
	const controls = input.controls ?? EXISTING_SECURITY_CONTROLS;
	const roadmapCrossReference = ROADMAP_CATALOG.flatMap(flattenCatalogTasks);

	return {
		schemaVersion: EVIDENCE_PACK_SCHEMA_VERSION,
		generatedAt: (input.now ?? new Date()).toISOString(),
		orgId: input.orgId,
		disclaimer:
			"This pack lists controls that exist in the CAALM codebase and links them to roadmap tasks/tests. It does not invent controls that are not implemented.",
		controls,
		roadmapCrossReference,
	};
}

export function evidencePackCrossReferencesCompletedTasks(
	pack: EvidencePackPayload,
): boolean {
	const taskCodes = new Set(
		pack.roadmapCrossReference.map((row) => row.taskCode),
	);
	return pack.controls.every((control) =>
		control.roadmapTaskCodes.every((code) => taskCodes.has(code)),
	);
}

export function evidencePackFilename(
	orgId: string,
	generatedAt: string,
): string {
	const stamp = generatedAt.replace(/[:.]/g, "-");
	return `caalm-security-evidence-${orgId}-${stamp}.json`;
}

/** Smoke helper: section 13 catalog PR list is non-empty when evidence pack ships with portability. */
export function section13CatalogPrs(): number[] {
	return getCatalogLinkedPrNumbers(13);
}
