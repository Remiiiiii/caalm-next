export const PROPOSAL_STATUSES = ["draft", "in_review", "final"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const REQUIREMENT_SECTIONS = [
	"L",
	"M",
	"C",
	"attachment",
	"other",
] as const;
export type RequirementSection = (typeof REQUIREMENT_SECTIONS)[number];

export const RESPONSE_TYPES = [
	"compliant",
	"partial",
	"exception",
	"clarification",
	"no_bid",
] as const;
export type ResponseType = (typeof RESPONSE_TYPES)[number];

export const REQUIREMENT_STATUSES = ["pending", "certified"] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const LIBRARY_KINDS = [
	"past_performance",
	"capability",
	"bio",
	"boilerplate",
] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

export function isProposalStatus(value: unknown): value is ProposalStatus {
	return (
		typeof value === "string" &&
		(PROPOSAL_STATUSES as readonly string[]).includes(value)
	);
}

export function isRequirementSection(
	value: unknown,
): value is RequirementSection {
	return (
		typeof value === "string" &&
		(REQUIREMENT_SECTIONS as readonly string[]).includes(value)
	);
}

export function isResponseType(value: unknown): value is ResponseType {
	return (
		typeof value === "string" &&
		(RESPONSE_TYPES as readonly string[]).includes(value)
	);
}

export function isRequirementStatus(
	value: unknown,
): value is RequirementStatus {
	return (
		typeof value === "string" &&
		(REQUIREMENT_STATUSES as readonly string[]).includes(value)
	);
}

export function isLibraryKind(value: unknown): value is LibraryKind {
	return (
		typeof value === "string" &&
		(LIBRARY_KINDS as readonly string[]).includes(value)
	);
}

export type Proposal = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	title: string;
	solicitationRef?: string;
	status: ProposalStatus;
	linkedContractId?: string;
	linkedFundingPursuitId?: string;
	createdByUserId: string;
	createdByName?: string;
	corpus?: string;
	certifiedAt?: string;
	certifiedByUserId?: string;
};

export type ProposalRequirement = {
	$id: string;
	orgId: string;
	proposalId: string;
	requirementText: string;
	sourceSection: RequirementSection;
	sourcePage?: number;
	responseType: ResponseType;
	owner?: string;
	status: RequirementStatus;
	mappedSectionId?: string;
	order: number;
};

export type ProposalSection = {
	$id: string;
	orgId: string;
	proposalId: string;
	heading: string;
	order: number;
	bodyMarkdown: string;
	sourceRequirementIds: string[];
	lastEditedByUserId?: string;
	lastEditedByName?: string;
};

export type ProposalLibraryEntry = {
	$id: string;
	orgId: string;
	kind: LibraryKind;
	title: string;
	bodyMarkdown: string;
	tags: string[];
	ownerUserId?: string;
	ownerName?: string;
	approvedAt?: string;
	expiresAt?: string;
};
