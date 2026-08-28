export const CLAUSE_CATEGORIES = [
	"confidentiality",
	"payment",
	"termination",
	"liability",
	"indemnification",
	"intellectual_property",
	"data_protection",
	"governing_law",
	"other",
] as const;

export const CLAUSE_STATUSES = ["draft", "active", "archived"] as const;

export type ClauseCategory = (typeof CLAUSE_CATEGORIES)[number];
export type ClauseStatus = (typeof CLAUSE_STATUSES)[number];

export type Clause = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	familyId: string;
	version: number;
	isCurrent: boolean;
	title: string;
	category: ClauseCategory;
	body: string;
	status: ClauseStatus;
	changeNote?: string;
	createdBy: string;
	updatedBy: string;
};

export type CreateClauseInput = {
	title: string;
	category: ClauseCategory;
	body: string;
	status?: ClauseStatus;
	changeNote?: string;
};

export type UpdateClauseInput = {
	title?: string;
	category?: ClauseCategory;
	body?: string;
	status?: ClauseStatus;
	changeNote?: string;
};

export type ListClausesFilters = {
	orgId: string;
	familyId?: string;
	category?: ClauseCategory;
	status?: ClauseStatus;
	search?: string;
	/** When true (default unless familyId is set), only current rows. */
	currentOnly?: boolean;
	limit?: number;
};
