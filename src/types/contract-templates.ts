export const TEMPLATE_STATUSES = ["draft", "active", "archived"] as const;

export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export type ClauseRef = {
	familyId: string;
	sortOrder: number;
};

export type ContractTemplate = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	title: string;
	description?: string;
	status: TemplateStatus;
	contractTypeId: string;
	clauseRefs: ClauseRef[];
	createdBy: string;
	updatedBy: string;
};

export type CreateTemplateInput = {
	title: string;
	description?: string;
	status?: TemplateStatus;
	contractTypeId: string;
	clauseRefs: ClauseRef[];
};

export type UpdateTemplateInput = {
	title?: string;
	description?: string;
	status?: TemplateStatus;
	contractTypeId?: string;
	clauseRefs?: ClauseRef[];
};

export type ListTemplatesFilters = {
	orgId: string;
	status?: TemplateStatus;
	search?: string;
	limit?: number;
};

export type ApplyTemplateInput = {
	contractName?: string;
};

export type ApplyTemplateResult = {
	contractId: string;
	templateId: string;
	fileId: string;
};

export type AssembledClauseSnapshot = {
	clauseId: string;
	familyId: string;
	version: number;
	title: string;
	category: string;
	body: string;
};
