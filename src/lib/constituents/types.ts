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
};

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
>;
