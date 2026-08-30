/**
 * Contract templates are recipes: an ordered list of clause-library families
 * plus optional show/hide rules. A wizard run turns a recipe into a new draft.
 * Templates never overwrite an existing pending or active contract.
 */

export const TEMPLATE_STATUSES = ["draft", "published", "archived"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const WIZARD_SESSION_STATUSES = [
	"in_progress",
	"submitted",
	"abandoned",
] as const;
export type WizardSessionStatus = (typeof WIZARD_SESSION_STATUSES)[number];

export const WIZARD_START_PATHS = ["scratch", "template"] as const;
export type WizardStartPath = (typeof WIZARD_START_PATHS)[number];

export const BLUEPRINT_IDS = [
	"vendor",
	"grant",
	"government",
	"lease",
	"consulting",
	"mou",
	"donation",
	"independent_contractor",
	"fiscal_sponsorship",
	"employment",
] as const;
export type BlueprintId = (typeof BLUEPRINT_IDS)[number];

export type WizardDocumentSection = {
	id: string;
	title: string;
	enabled: boolean;
};

export type WizardCustomBlock = {
	id: string;
	body: string;
};

export const MERGE_FIELD_KEYS = [
	"contractName",
	"counterparty",
	"amount",
	"currency",
	"startDate",
	"expiryDate",
	"department",
	"governingLaw",
	"today",
] as const;
export type MergeFieldKey = (typeof MERGE_FIELD_KEYS)[number];

export const CONDITION_OPS = [
	"eq",
	"neq",
	"gt",
	"gte",
	"lt",
	"lte",
	"contains",
] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export type SlotCondition = {
	field: MergeFieldKey | "amountNumber";
	op: ConditionOp;
	value: string;
};

/** One row in a template recipe. familyId points at the clause library family. */
export type ClauseSlot = {
	familyId: string;
	required: boolean;
	condition?: SlotCondition;
};

export type ContractTemplate = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	name: string;
	description: string;
	contractType: string;
	status: TemplateStatus;
	clauseSlots: ClauseSlot[];
	createdBy: string;
	updatedBy: string;
};

export type CreateTemplateInput = {
	name: string;
	description?: string;
	contractType: string;
	status?: TemplateStatus;
	clauseSlots: ClauseSlot[];
};

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

export type ListTemplatesFilters = {
	orgId: string;
	status?: TemplateStatus;
	contractType?: string;
	search?: string;
	limit?: number;
};

export type WizardIntake = {
	contractName: string;
	contractType: string;
	department: string;
	counterparty: string;
	amount: string;
	currency: string;
	startDate: string;
	expiryDate: string;
	governingLaw: string;
	description: string;
};

export type WizardSection = {
	familyId: string;
	source: "template" | "injected";
	/** Template id this section was injected from, when source is injected from a recipe. */
	fromTemplateId?: string;
	required: boolean;
	enabled: boolean;
	condition?: SlotCondition;
};

export type WizardPayload = {
	startPath: WizardStartPath;
	templateId: string | null;
	blueprintId: BlueprintId | null;
	intake: WizardIntake;
	sections: WizardSection[];
	tokenValues: Record<string, string>;
	documentSections: WizardDocumentSection[];
	customBlocks: WizardCustomBlock[];
	draftDocxFileId: string | null;
	draftPdfFileId: string | null;
	lastSavedAt: string | null;
	/** Rejected on submit: templates never patch an existing contract. */
	existingContractId?: string;
};

export type WizardSession = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	userId: string;
	status: WizardSessionStatus;
	currentStep: number;
	payload: WizardPayload;
	templateId: string | null;
	contractId: string | null;
};

/** Lightweight row for draft lists — no full payload blob. */
export type WizardSessionSummary = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	currentStep: number;
	contractName: string;
	blueprintId: string | null;
	templateId: string | null;
	lastSavedAt: string | null;
	fillPercent: number;
};

export type ClauseSnapshot = {
	$id: string;
	familyId: string;
	title: string;
	category: string;
	body: string;
	version: number;
	status: string;
};

export type AssembledSection = {
	familyId: string;
	clauseId: string | null;
	version: number | null;
	title: string;
	category: string;
	body: string;
	source: "template" | "injected";
	fromTemplateId?: string;
	enabled: boolean;
	skipped: boolean;
	skipReason?: string;
};

export type AssemblyResult = {
	markdown: string;
	sections: AssembledSection[];
	mergeValues: Record<MergeFieldKey, string>;
	lineage: Array<{
		familyId: string;
		clauseId: string;
		version: number;
		title: string;
		source: "template" | "injected";
	}>;
};
