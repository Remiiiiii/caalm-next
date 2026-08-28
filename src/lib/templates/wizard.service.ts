import { ID, Query } from "node-appwrite";
import { ContractTypeMapper } from "@/lib/api/contracts/services/ContractTypeMapper";
import { FileService } from "@/lib/api/contracts/services/FileService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
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
import {
	TEMPLATE_TABLE_IDS,
	WIZARD_STEP_COUNT,
} from "@/lib/templates/constants";
import { getTemplateById } from "@/lib/templates/contract-template.service";
import type { Clause } from "@/types/clauses";
import type {
	AssemblyResult,
	ClauseSnapshot,
	WizardPayload,
	WizardSession,
	WizardSessionStatus,
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

	return {
		startPath: isStartPath(row.startPath) ? row.startPath : "scratch",
		templateId:
			typeof row.templateId === "string" && row.templateId.trim()
				? row.templateId
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
		queries: [
			Query.equal("orgId", input.orgId),
			Query.equal("userId", input.userId),
			Query.equal("status", "in_progress"),
			Query.orderDesc("$updatedAt"),
			Query.limit(20),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapSession);
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
}): Promise<WizardSession> {
	const payload = emptyWizardPayload();
	payload.startPath = input.startPath || "scratch";
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
			currentStep: payload.templateId ? 1 : 0,
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
	const intakeErrors = validateIntake(payload.intake);
	if (intakeErrors.length > 0) {
		throw new Error(intakeErrors[0]);
	}

	await assertCanCreateContract(input.orgId);
	const assembly = await previewWizard({ orgId: input.orgId, payload });
	const included = assembly.sections.filter((section) => !section.skipped);
	if (included.length === 0) {
		throw new Error("Add at least one published clause before submitting");
	}

	const safeName = payload.intake.contractName
		.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 60);
	const fileName = `${safeName || "contract"}-${input.session.$id.slice(0, 8)}.md`;
	const markdownBuffer = Buffer.from(assembly.markdown, "utf8");

	let fileId: string | null = null;
	try {
		const bucketFileId = await FileService.uploadFileToStorage(
			markdownBuffer,
			fileName,
		);
		const fileRow = await FileService.createOrUpdateFileRow(
			input.userId,
			input.userId,
			{
				name: fileName,
				size: markdownBuffer.length,
				bucketFileId,
				contractName: payload.intake.contractName,
			},
		);
		fileId = String((fileRow as { $id?: string }).$id || "");
	} catch (error) {
		console.warn("[wizard submit] markdown snapshot upload failed", error);
	}

	const { tablesDB } = await createAdminClient();
	const contractsTable =
		appwriteConfig.contractsCollectionId || "test-contracts";
	const contractId = ID.unique();
	// Demo Contracts columns are tighter than prod (name 128, vendor 50, description 250).
	const description = [
		payload.intake.description.trim(),
		`Assembled from ${payload.startPath === "template" ? "template" : "scratch"} wizard.`,
	]
		.filter(Boolean)
		.join(" ")
		.slice(0, 250);

	await tablesDB.createRow({
		databaseId: dbId(),
		tableId: contractsTable,
		rowId: contractId,
		data: {
			contractName: payload.intake.contractName.slice(0, 128),
			orgId: input.orgId,
			amount: Number(payload.intake.amount) || undefined,
			currencyCode: payload.intake.currency || "USD",
			lifecycleStatus: "draft",
			status: "pending-review",
			description,
			contractOwnerId: input.userId,
			department: payload.intake.department || undefined,
			vendor: payload.intake.counterparty.slice(0, 50),
			contractType: mappedContractType(payload.intake.contractType),
			startDate: payload.intake.startDate || undefined,
			contractExpiryDate: payload.intake.expiryDate || undefined,
			templateUsed: (payload.templateId || "guided-wizard").slice(0, 255),
			...(fileId ? { fileId, fileRef: fileId } : {}),
		},
	});

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
