import type { ConstituentDuplicateCandidate } from "./types";

/** Trim, lowercase, and collapse inner spaces so "Doe " matches "doe". */
export function normalizeLastName(value: string | null | undefined): string {
	return String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

/** Trim and lowercase so "Pat@Org.org" matches "pat@org.org". */
export function normalizeEmail(value: string | null | undefined): string {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

export function normalizeFirstName(value: string | null | undefined): string {
	return String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

/**
 * Email match is enough. Without an email, first + last name must both match
 * so every "Smith" in the org is not treated as a duplicate.
 */
export function matchesDuplicateSignals(
	input: {
		normalizedEmail: string;
		normalizedFirstName: string;
		normalizedLastName: string;
	},
	candidate: {
		normalizedEmail?: string;
		firstName?: string;
		normalizedLastName?: string;
	},
): boolean {
	if (
		input.normalizedEmail.length > 0 &&
		input.normalizedEmail === (candidate.normalizedEmail ?? "")
	) {
		return true;
	}
	if (input.normalizedEmail.length > 0) return false;
	return (
		input.normalizedLastName.length > 0 &&
		input.normalizedFirstName.length > 0 &&
		input.normalizedLastName === (candidate.normalizedLastName ?? "") &&
		input.normalizedFirstName === normalizeFirstName(candidate.firstName)
	);
}

export function toDuplicateCandidates(
	rows: Array<{
		$id: string;
		firstName: string;
		lastName: string;
		email?: string;
	}>,
): ConstituentDuplicateCandidate[] {
	return rows.map((row) => ({
		$id: row.$id,
		firstName: row.firstName,
		lastName: row.lastName,
		email: row.email,
	}));
}
