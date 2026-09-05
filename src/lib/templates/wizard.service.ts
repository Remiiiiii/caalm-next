import { ID, Query } from "node-appwrite";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { ContractTypeMapper } from "@/lib/api/contracts/services/ContractTypeMapper";
import { FileService } from "@/lib/api/contracts/services/FileService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { initializeOnUpload } from "@/lib/approvals/ContractApprovalWorkflowService";
import { assertCanCreateContract } from "@/lib/billing/planLimits";
import { listClauses } from "@/lib/clauses/clause-library.service";
import { getContractTypeConfig } from "@/lib/contracts/contractTypeConfigs";
import { logAuditEvent } from "@/lib/services/audit-logger";
import {
	assembleContract,
	assertCreatesNewContract,
	emptyWizardPayload,
	validateIntake,
} from "@/lib/templates/assemble-contract";
import { getBlueprint, isBlueprintId } from "@/lib/templates/blueprint-catalog";
import {
	deleteWizardDraftArtifacts,
	loadBlueprintSource,
	uploadWizardDraftArtifact,
} from "@/lib/templates/blueprint-storage";
import {
	TEMPLATE_TABLE_IDS,
	WIZARD_STEP_COUNT,
} from "@/lib/templates/constants";
import { getTemplateById } from "@/lib/templates/contract-template.service";
import { convertDocxBufferToPdf } from "@/lib/templates/docx-to-pdf";
import {
	mergeBlueprintDocument,
	type InjectedClause,
} from "@/lib/templates/merge-docx";
import { getOrganization } from "@/lib/rbac/organizations";
import { orgLetterheadValues } from "@/lib/templates/org-letterhead";
import { isEmptyWizardDraftSummary } from "@/lib/templates/wizard-draft-meta";
import {
	buildMergeTokenValues,
	filledTokenPercent,
	validateBlueprintTokens,
} from "@/lib/templates/token-schema";
import type { Clause } from "@/types/clauses";
import type {
	AssemblyResult,
	BlueprintId,
	ClauseSnapshot,
	WizardCustomBlock,
	WizardDocumentSection,
	WizardPayload,
	WizardSession,
	WizardSessionStatus,
	WizardSessionSummary,
	WizardStartPath,
} from "@/types/contract-templates";
import {
	WIZARD_SESSION_STATUSES,
	WIZARD_START_PATHS,
} from "@/types/contract-templates";

function sessionsTable(): string {
	return (
		appwriteConfig.contractWizardSessionsCollectionId ||
		TEMPLATE_TABLE_IDS.wizardSessions
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

/** Appwrite requires contractNumber; wizard intake does not collect one. */
function buildWizardContractNumber(sessionId: string): string {
	return `WIZ-${sessionId.slice(0, 8)}`.slice(0, 50);
}

export function isWizardStatus(value: unknown): value is WizardSessionStatus {
	return (
		typeof value === "string" &&
		(WIZARD_SESSION_STATUSES as readonly string[]).includes(value)
	);
}

export function isStartPath(value: unknown): value is WizardStartPath {
	return (
		typeof value === "string" &&
		(WIZARD_START_PATHS as readonly string[]).includes(value)
	);
}

export function parseWizardPayload(raw: unknown): WizardPayload {
	const base = emptyWizardPayload();
	let parsed: unknown = raw;
	if (typeof raw === "string") {
		if (!raw.trim()) return base;
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error("Wizard payload must be valid JSON");
		}
	}
	if (!parsed || typeof parsed !== "object") return base;
	const row = parsed as Record<string, unknown>;
	const intake = (
		row.intake && typeof row.intake === "object" ? row.intake : {}
	) as Record<string, unknown>;
	const sections = Array.isArray(row.sections) ? row.sections : [];
	const tokenValues =
		row.tokenValues && typeof row.tokenValues === "object"
			? Object.fromEntries(
					Object.entries(row.tokenValues as Record<string, unknown>).map(
						([key, value]) => [key, String(value ?? "")],
					),
				)
			: {};
	const documentSections = Array.isArray(row.documentSections)
		? (row.documentSections as unknown[])
				.filter((item) => item && typeof item === "object")
				.map((item) => {
					const section = item as Record<string, unknown>;
					return {
						id: String(section.id || ""),
						title: String(section.title || ""),
						enabled: section.enabled !== false,
					} satisfies WizardDocumentSection;
				})
				.filter((section) => section.id)
		: [];
	const customBlocks = Array.isArray(row.customBlocks)
		? (row.customBlocks as unknown[])
				.filter((item) => item && typeof item === "object")
				.map((item) => {
					const block = item as Record<string, unknown>;
					return {
						id: String(block.id || ""),
						body: String(block.body || ""),
					} satisfies WizardCustomBlock;
				})
				.filter((block) => block.id)
		: [];

	return {
		startPath: isStartPath(row.startPath) ? row.startPath : "scratch",
		templateId:
			typeof row.templateId === "string" && row.templateId.trim()
				? row.templateId
				: null,
		blueprintId: isBlueprintId(row.blueprintId)
			? (row.blueprintId as BlueprintId)
			: null,
		intake: {
			contractName: String(intake.contractName || ""),
			contractType: String(intake.contractType || "vendor"),
			department: String(intake.department || ""),
			counterparty: String(intake.counterparty || ""),
			amount: String(intake.amount || ""),
			currency: String(intake.currency || "USD"),
			startDate: String(intake.startDate || ""),
			expiryDate: String(intake.expiryDate || ""),
			governingLaw: String(intake.governingLaw || ""),
			description: String(intake.description || ""),
		},
		sections: sections
			.filter((item) => item && typeof item === "object")
			.map((item) => {
				const section = item as Record<string, unknown>;
				return {
					familyId: String(section.familyId || ""),
					source: section.source === "injected" ? "injected" : "template",
					fromTemplateId: section.fromTemplateId
						? String(section.fromTemplateId)
						: undefined,
					required: section.required === true,
					enabled: section.enabled !== false,
					condition:
						section.condition && typeof section.condition === "object"
							? (section.condition as WizardPayload["sections"][number]["condition"])
							: undefined,
				};
			})
			.filter((section) => section.familyId),
		tokenValues,
		documentSections,
		customBlocks,
		draftDocxFileId:
			typeof row.draftDocxFileId === "string" && row.draftDocxFileId.trim()
				? row.draftDocxFileId
				: null,
		draftPdfFileId:
			typeof row.draftPdfFileId === "string" && row.draftPdfFileId.trim()
				? row.draftPdfFileId
				: null,
		lastSavedAt:
			typeof row.lastSavedAt === "string" && row.lastSavedAt.trim()
				? row.lastSavedAt
				: null,
		existingContractId:
			typeof row.existingContractId === "string"
				? row.existingContractId
				: undefined,
	};
}

function mapSession(row: Record<string, unknown>): WizardSession {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		userId: String(row.userId || ""),
		status: isWizardStatus(row.status) ? row.status : "in_progress",
		currentStep: Number(row.currentStep) || 0,
		payload: parseWizardPayload(row.payload),
		templateId: row.templateId ? String(row.templateId) : null,
		contractId: row.contractId ? String(row.contractId) : null,
	};
}

function inProgressSessionQueries(
	orgId: string,
	userId: string,
	limit = 100,
	offset = 0,
) {
	return [
		Query.equal("orgId", orgId),
		Query.equal("userId", userId),
		Query.equal("status", "in_progress"),
		Query.orderDesc("$updatedAt"),
		Query.limit(limit),
		Query.offset(offset),
	];
}

async function listAllWizardSessionSummaries(input: {
	orgId: string;
	userId: string;
}): Promise<WizardSessionSummary[]> {
	const { tablesDB } = await createAdminClient();
	const pageSize = 100;
	const all: WizardSessionSummary[] = [];
	let offset = 0;

	while (true) {
		const result = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: sessionsTable(),
			queries: inProgressSessionQueries(
				input.orgId,
				input.userId,
				pageSize,
				offset,
			),
		});
		const batch = (result.rows as unknown as Record<string, unknown>[]).map(
			mapSessionSummary,
		);
		all.push(...batch);
		if (batch.length < pageSize) break;
		offset += pageSize;
	}

	return all;
}

function payloadFieldsForSummary(raw: unknown): {
	contractName: string;
	blueprintId: string | null;
	templateId: string | null;
	lastSavedAt: string | null;
	intake: WizardPayload["intake"];
	tokenValues: Record<string, string>;
} {
	const base = emptyWizardPayload();
	let parsed: unknown = raw;
	if (typeof raw === "string") {
		if (!raw.trim()) {
			return {
				contractName: "",
				blueprintId: null,
				templateId: null,
				lastSavedAt: null,
				intake: base.intake,
				tokenValues: {},
			};
		}
		try {
			parsed = JSON.parse(raw);
		} catch {
			parsed = {};
		}
	}
	if (!parsed || typeof parsed !== "object") {
		return {
			contractName: "",
			blueprintId: null,
			templateId: null,
			lastSavedAt: null,
			intake: base.intake,
			tokenValues: {},
		};
	}
	const row = parsed as Record<string, unknown>;
	const intakeRaw =
		row.intake && typeof row.intake === "object"
			? (row.intake as Record<string, unknown>)
			: {};
	const intake = { ...base.intake, ...intakeRaw } as WizardPayload["intake"];
	const contractName =
		typeof intake.contractName === "string" ? intake.contractName : "";
	const blueprintId =
		typeof row.blueprintId === "string" && row.blueprintId.trim()
			? row.blueprintId
			: null;
	const templateId =
		typeof row.templateId === "string" && row.templateId.trim()
			? row.templateId
			: null;
	const lastSavedAt =
		typeof row.lastSavedAt === "string" ? row.lastSavedAt : null;
	const tokenValues =
		row.tokenValues && typeof row.tokenValues === "object"
			? Object.fromEntries(
					Object.entries(row.tokenValues as Record<string, unknown>).map(
						([key, value]) => [key, String(value ?? "")],
					),
				)
			: {};
	return { contractName, blueprintId, templateId, lastSavedAt, intake, tokenValues };
}

function mapSessionSummary(row: Record<string, unknown>): WizardSessionSummary {
	const fields = payloadFieldsForSummary(row.payload);
	const rowTemplateId =
		typeof row.templateId === "string" && row.templateId.trim()
			? row.templateId
			: null;
	const fillPercent = fields.blueprintId
		? filledTokenPercent(
				fields.blueprintId,
				fields.intake,
				fields.tokenValues,
			)
		: 0;
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		currentStep: Number(row.currentStep) || 0,
		contractName: fields.contractName,
		blueprintId: fields.blueprintId,
		templateId: fields.templateId ?? rowTemplateId,
		lastSavedAt: fields.lastSavedAt,
		fillPercent,
	};
}

function toSnapshot(clause: Clause): ClauseSnapshot {
	return {
		$id: clause.$id,
		familyId: clause.familyId,
		title: clause.title,
		category: clause.category,
		body: clause.body,
		version: clause.version,
		status: clause.status,
	};
}

export async function clausesByFamilyForOrg(
	orgId: string,
	familyIds: string[],
): Promise<Map<string, ClauseSnapshot>> {
	const unique = [...new Set(familyIds.filter(Boolean))];
	const map = new Map<string, ClauseSnapshot>();
	if (unique.length === 0) return map;

	const clauses = await listClauses({
		orgId,
		status: "active",
		currentOnly: true,
		limit: 200,
	});
	for (const clause of clauses) {
		if (unique.includes(clause.familyId) && !map.has(clause.familyId)) {
			map.set(clause.familyId, toSnapshot(clause));
		}
	}
	return map;
}

export async function previewWizard(input: {
	orgId: string;
	payload: WizardPayload;
}): Promise<AssemblyResult> {
	assertCreatesNewContract(input.payload);
	const clausesByFamily = await clausesByFamilyForOrg(
		input.orgId,
		input.payload.sections.map((section) => section.familyId),
	);
	return assembleContract({
		payload: input.payload,
		clausesByFamily,
		blankMissingPlaceholders: true,
	});
}

export async function listWizardSessions(input: {
	orgId: string;
	userId: string;
}): Promise<WizardSession[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: sessionsTable(),
		queries: inProgressSessionQueries(input.orgId, input.userId),
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapSession);
}

export async function listWizardSessionSummaries(input: {
	orgId: string;
	userId: string;
}): Promise<WizardSessionSummary[]> {
	return listAllWizardSessionSummaries(input);
}

export async function countWizardSessions(input: {
	orgId: string;
	userId: string;
}): Promise<number> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: sessionsTable(),
		queries: [
			Query.equal("orgId", input.orgId),
			Query.equal("userId", input.userId),
			Query.equal("status", "in_progress"),
			Query.limit(1),
		],
		total: true,
	});
	return result.total ?? 0;
}

export async function deleteWizardSession(input: {
	sessionId: string;
	orgId: string;
	userId: string;
}): Promise<void> {
	const session = await getWizardSession(input.sessionId);
	if (
		!session ||
		session.orgId !== input.orgId ||
		session.userId !== input.userId
	) {
		throw new Error("Wizard not found");
	}
	if (session.status !== "in_progress") {
		throw new Error("Only in-progress drafts can be deleted");
	}

	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: sessionsTable(),
		rowId: input.sessionId,
	});

	// Storage cleanup is best-effort; the DB row is the source of truth.
	void deleteWizardDraftArtifacts(input.sessionId).catch(() => {});
}

export async function deleteWizardSessions(input: {
	sessionIds: string[];
	orgId: string;
	userId: string;
}): Promise<{ deleted: string[]; failed: string[] }> {
	const results = await Promise.all(
		input.sessionIds.map(async (sessionId) => {
			try {
				await deleteWizardSession({
					sessionId,
					orgId: input.orgId,
					userId: input.userId,
				});
				return { sessionId, ok: true as const };
			} catch {
				return { sessionId, ok: false as const };
			}
		}),
	);
	return {
		deleted: results.filter((row) => row.ok).map((row) => row.sessionId),
		failed: results.filter((row) => !row.ok).map((row) => row.sessionId),
	};
}

export async function deleteEmptyWizardSessions(input: {
	orgId: string;
	userId: string;
}): Promise<{ deleted: string[]; failed: string[] }> {
	const summaries = await listAllWizardSessionSummaries(input);
	const emptyIds = summaries
		.filter(isEmptyWizardDraftSummary)
		.map((row) => row.$id);
	// #region agent log
	void appendFile(
		join(process.cwd(), "debug-cb2714.log"),
		`${JSON.stringify({
			sessionId: "cb2714",
			hypothesisId: "H6",
			location: "wizard.service.ts:deleteEmptyWizardSessions",
			message: "empty draft scan",
			data: {
				totalSummaries: summaries.length,
				emptyIdsCount: emptyIds.length,
				skippedVisuallyEmpty: summaries
					.filter(
						(s) =>
							!s.contractName.trim() &&
							!s.blueprintId &&
							!isEmptyWizardDraftSummary(s),
					)
					.map((s) => ({
						id: s.$id,
						currentStep: s.currentStep,
						templateId: s.templateId,
						fillPercent: s.fillPercent,
					})),
			},
			timestamp: Date.now(),
			runId: "post-fix-2",
		})}\n`,
	).catch(() => {});
	// #endregion
	if (emptyIds.length === 0) {
		return { deleted: [], failed: [] };
	}
	return deleteWizardSessions({
		sessionIds: emptyIds,
		orgId: input.orgId,
		userId: input.userId,
	});
}

export async function getWizardSession(
	id: string,
): Promise<WizardSession | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: sessionsTable(),
			rowId: id,
		});
		return mapSession(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function createWizardSession(input: {
	orgId: string;
	userId: string;
	startPath?: WizardStartPath;
	templateId?: string | null;
	blueprintId?: string | null;
}): Promise<WizardSession> {
	const payload = emptyWizardPayload();
	payload.startPath = input.startPath || "scratch";
	if (input.blueprintId && isBlueprintId(input.blueprintId)) {
		const blueprint = getBlueprint(input.blueprintId);
		if (blueprint) {
			payload.blueprintId = blueprint.id;
			payload.startPath = "template";
			payload.intake.contractType = blueprint.contractTypeId;
		}
	}
	if (input.templateId) {
		const template = await getTemplateById(input.templateId);
		if (!template || template.orgId !== input.orgId) {
			throw new Error("Template not found");
		}
		if (template.status !== "published") {
			throw new Error("Only published templates can start a wizard");
		}
		payload.templateId = template.$id;
		payload.startPath = "template";
		payload.intake.contractType = template.contractType;
		payload.sections = template.clauseSlots.map((slot) => ({
			familyId: slot.familyId,
			source: "template" as const,
			fromTemplateId: template.$id,
			required: slot.required,
			enabled: true,
			condition: slot.condition,
		}));
	}

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: sessionsTable(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			userId: input.userId,
			status: "in_progress",
			currentStep: payload.templateId || payload.blueprintId ? 1 : 0,
			payload: JSON.stringify(payload),
			templateId: payload.templateId,
			contractId: null,
		},
	});
	return mapSession(row as unknown as Record<string, unknown>);
}

export async function saveWizardSession(input: {
	session: WizardSession;
	orgId: string;
	userId: string;
	payload: WizardPayload;
	currentStep?: number;
}): Promise<WizardSession> {
	if (
		input.session.orgId !== input.orgId ||
		input.session.userId !== input.userId
	) {
		throw new Error("Wizard session does not belong to this user");
	}
	if (input.session.status !== "in_progress") {
		throw new Error("This wizard is already finished");
	}
	assertCreatesNewContract(input.payload);
	input.payload.lastSavedAt = new Date().toISOString();

	const step = Math.min(
		WIZARD_STEP_COUNT - 1,
		Math.max(0, input.currentStep ?? input.session.currentStep),
	);
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: sessionsTable(),
		rowId: input.session.$id,
		data: {
			payload: JSON.stringify(input.payload),
			currentStep: step,
			templateId: input.payload.templateId,
		},
	});
	return mapSession(row as unknown as Record<string, unknown>);
}

function mappedContractType(typeId: string): string {
	const config = getContractTypeConfig(typeId);
	return ContractTypeMapper.map(config?.label || typeId);
}

export async function buildWizardDocx(
	payload: WizardPayload,
	injectedClauses: InjectedClause[] = [],
	orgId?: string,
	opts?: { forPreview?: boolean },
): Promise<Buffer> {
	if (!payload.blueprintId) {
		throw new Error("Choose an agreement blueprint first");
	}
	const blueprint = getBlueprint(payload.blueprintId);
	if (!blueprint) throw new Error("Unknown agreement blueprint");
	const template = await loadBlueprintSource({
		sourceFileId: blueprint.sourceFileId,
		fileName: blueprint.fileName,
	});
	const org = orgId ? await getOrganization(orgId) : null;
	const tokenValues = buildMergeTokenValues(
		payload.blueprintId,
		payload.intake,
		payload.tokenValues,
		orgLetterheadValues(org),
	);
	return mergeBlueprintDocument({
		template,
		tokenValues,
		customBlocks: payload.customBlocks,
		injectedClauses,
		forPreview: opts?.forPreview,
		blueprintId: payload.blueprintId,
	});
}

export async function buildWizardPdf(
	payload: WizardPayload,
	injectedClauses: InjectedClause[] = [],
	orgId?: string,
	opts?: { forPreview?: boolean },
): Promise<Buffer> {
	const docx = await buildWizardDocx(payload, injectedClauses, orgId, opts);
	return convertDocxBufferToPdf(docx);
}

export async function submitWizard(input: {
	session: WizardSession;
	orgId: string;
	userId: string;
	userName?: string;
	userEmail?: string;
	payload?: WizardPayload;
}): Promise<{
	session: WizardSession;
	contractId: string;
	assembly: AssemblyResult;
}> {
	if (
		input.session.orgId !== input.orgId ||
		input.session.userId !== input.userId
	) {
		throw new Error("Wizard session does not belong to this user");
	}
	if (input.session.status === "submitted" && input.session.contractId) {
		const assembly = await previewWizard({
			orgId: input.orgId,
			payload: input.session.payload,
		});
		return {
			session: input.session,
			contractId: input.session.contractId,
			assembly,
		};
	}
	if (input.session.status !== "in_progress") {
		throw new Error("This wizard is already finished");
	}

	const payload = input.payload || input.session.payload;
	assertCreatesNewContract(payload);
	const tokenErrors = payload.blueprintId
		? validateBlueprintTokens(
				payload.blueprintId,
				payload.intake,
				payload.tokenValues,
			)
		: validateIntake(payload.intake);
	if (tokenErrors.length > 0) {
		throw new Error(tokenErrors.join("; "));
	}

	await assertCanCreateContract(input.orgId);
	const assembly = await previewWizard({ orgId: input.orgId, payload });
	const included = assembly.sections.filter((section) => !section.skipped);
	if (!payload.blueprintId && included.length === 0) {
		throw new Error("Add at least one published clause before submitting");
	}

	const safeName = payload.intake.contractName
		.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 60);
	let fileId: string | null = null;
	try {
		const pdfBuffer = await buildWizardPdf(
			payload,
			included.map((section) => ({
				title: section.title,
				body: section.body,
			})),
			input.orgId,
		);
		const fileName = `${safeName || "contract"}-${input.session.$id.slice(0, 8)}.pdf`;
		const bucketFileId = await FileService.uploadFileToStorage(
			pdfBuffer,
			fileName,
		);
		if (payload.blueprintId) {
			await uploadWizardDraftArtifact({
				sessionId: input.session.$id,
				kind: "final",
				fileName,
				buffer: pdfBuffer,
			});
		}
		const fileRow = await FileService.createOrUpdateFileRow(
			input.userId,
			input.userId,
			{
				name: fileName,
				size: pdfBuffer.length,
				bucketFileId,
				contractName: payload.intake.contractName,
			},
		);
		fileId = String((fileRow as { $id?: string }).$id || "");
	} catch (error) {
		console.warn("[wizard submit] document upload failed", error);
		if (payload.blueprintId) {
			throw error instanceof Error
				? error
				: new Error("Could not generate the contract PDF");
		}
	}

	const { tablesDB } = await createAdminClient();
	const contractsTable =
		appwriteConfig.contractsCollectionId || "test-contracts";
	const contractId = ID.unique();
	// Demo Contracts columns are tighter than prod (name 128, vendor 50, description 250).
	const description = [
		payload.intake.description.trim(),
		`Assembled from ${payload.blueprintId || payload.startPath} wizard.`,
	]
		.filter(Boolean)
		.join(" ")
		.slice(0, 250);

	const contractData: Record<string, unknown> = {
		contractName: payload.intake.contractName.slice(0, 128),
		contractNumber: buildWizardContractNumber(input.session.$id),
		orgId: input.orgId,
		amount:
			Number(String(payload.intake.amount).replace(/[$,]/g, "")) || 0,
		currencyCode: payload.intake.currency || "USD",
		lifecycleStatus: "draft",
		status: "pending-review",
		description,
		contractOwnerId: input.userId,
		// Required on Contracts; wizard intake allows "Not set".
		department: payload.intake.department || "Administration",
		vendor: payload.intake.counterparty.slice(0, 50),
		contractType: mappedContractType(payload.intake.contractType),
		startDate: payload.intake.startDate || undefined,
		contractExpiryDate: payload.intake.expiryDate || undefined,
		templateUsed: (payload.blueprintId || payload.templateId || "guided-wizard").slice(
			0,
			255,
		),
		priority: "Medium",
	};
	// fileId is a string column; fileRef is a relationship — only set fileId on create.
	if (fileId) {
		contractData.fileId = fileId;
	}

	await tablesDB.createRow({
		databaseId: dbId(),
		tableId: contractsTable,
		rowId: contractId,
		data: contractData,
	});

	if (fileId) {
		try {
			await tablesDB.updateRow({
				databaseId: dbId(),
				tableId: appwriteConfig.filesCollectionId || "",
				rowId: fileId,
				data: { contractId },
			});
		} catch {
			// Contract row is canonical; file link is best-effort.
		}
	}

	try {
		await initializeOnUpload({ contractId });
	} catch (error) {
		console.error("[wizard submit] approval workflow init failed", error);
	}

	const updated = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: sessionsTable(),
		rowId: input.session.$id,
		data: {
			status: "submitted",
			contractId,
			payload: JSON.stringify(payload),
			currentStep: WIZARD_STEP_COUNT - 1,
		},
	});

	await logAuditEvent({
		event_id: `contract_wizard_${contractId}`,
		event_title: `Guided contract created: ${payload.intake.contractName}`,
		action: "create",
		source: "caalm",
		user_id: input.userId,
		user_name: input.userName || input.userId,
		user_email: input.userEmail || "",
		orgId: input.orgId,
		status: "success",
		module: "contracts",
		target_type: "contract",
		target_id: contractId,
		target_label: payload.intake.contractName,
		summary:
			"Created a new pending-review contract from the guided template wizard",
		metadata: {
			sessionId: input.session.$id,
			templateId: payload.templateId,
			clauseCount: assembly.lineage.length,
			patchedExisting: false,
		},
	});

	return {
		session: mapSession(updated as unknown as Record<string, unknown>),
		contractId,
		assembly,
	};
}
