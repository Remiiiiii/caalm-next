export const CONSTITUENT_TYPES = [
	"donor",
	"volunteer",
	"member",
	"other",
] as const;
export type ConstituentType = (typeof CONSTITUENT_TYPES)[number];

export function isConstituentType(value: unknown): value is ConstituentType {
	return (
		typeof value === "string" &&
		(CONSTITUENT_TYPES as readonly string[]).includes(value)
	);
}

export type Constituent = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	type: ConstituentType;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	addressLine1?: string;
	city?: string;
	region?: string;
	postalCode?: string;
	country?: string;
	doNotContact: boolean;
	piiAccessedAt?: string;
	normalizedEmail?: string;
	normalizedLastName?: string;
	/** Set when this row lost a merge; GET then returns 410. */
	mergedIntoId?: string;
};

export const RELATIONSHIP_TYPES = [
	"household",
	"spouse",
	"employer",
	"solicitor",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export function isRelationshipType(value: unknown): value is RelationshipType {
	return (
		typeof value === "string" &&
		(RELATIONSHIP_TYPES as readonly string[]).includes(value)
	);
}

export type ConstituentRelationship = {
	$id: string;
	$createdAt: string;
	orgId: string;
	fromId: string;
	toId: string;
	type: RelationshipType;
	softCredit: boolean;
};

export const NOTE_KINDS = ["note", "meeting"] as const;
export type ConstituentNoteKind = (typeof NOTE_KINDS)[number];

export function isConstituentNoteKind(
	value: unknown,
): value is ConstituentNoteKind {
	return (
		typeof value === "string" &&
		(NOTE_KINDS as readonly string[]).includes(value)
	);
}

export type ConstituentNote = {
	$id: string;
	$createdAt: string;
	orgId: string;
	constituentId: string;
	kind: ConstituentNoteKind;
	body: string;
	authorUserId: string;
	authorName?: string;
};

export type DerivedAgreement = {
	$id: string;
	name: string;
	kind: "contract" | "grant";
	href: string;
};

export type ContactChannel = "email" | "sms" | "phone" | "mail";

export type ConstituentListFilters = {
	orgId: string;
	search?: string;
	type?: ConstituentType;
	city?: string;
	doNotContact?: boolean;
	limit?: number;
	offset?: number;
};

export type ConstituentDuplicateCandidate = {
	$id: string;
	firstName: string;
	lastName: string;
	email?: string;
};

export type CreateConstituentInput = {
	orgId: string;
	type: ConstituentType;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	addressLine1?: string;
	city?: string;
	region?: string;
	postalCode?: string;
	country?: string;
	doNotContact?: boolean;
};

export type UpdateConstituentInput = Partial<
	Omit<CreateConstituentInput, "orgId">
> & {
	mergedIntoId?: string;
};
