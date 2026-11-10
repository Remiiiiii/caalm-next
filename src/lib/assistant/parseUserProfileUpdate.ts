/**
 * Parse "change name X to Y" style asks so Ask CAALM can open a confirm card
 * without relying on the model to call update_user_profile after list_users.
 */

export type UserProfileRenameDraft = {
	/** Current person lookup (name or email). */
	lookup: string;
	/** New full name. */
	fullName: string;
};

function cleanName(raw: string): string {
	return raw
		.trim()
		.replace(/^["'`]+|["'`]+$/g, "")
		.replace(/[.,!?]+$/g, "")
		.trim();
}

export function parseUserProfileRename(
	message: string,
): UserProfileRenameDraft | null {
	const text = message.trim().replace(/\s+/g, " ");
	if (!text) return null;

	const patterns: RegExp[] = [
		// Change username|name|full name Blair Montgomery to Blair Rodriguez
		/\b(?:change|update|set)\s+(?:the\s+)?(?:user\s*)?(?:full\s*)?name\s+(.+?)\s+to\s+(.+)$/i,
		/\b(?:change|update|set)\s+username\s+(.+?)\s+to\s+(.+)$/i,
		// rename Blair Montgomery to Blair Rodriguez
		/\brename\s+(.+?)\s+to\s+(.+)$/i,
		// change Blair Montgomery's name to Blair Rodriguez
		/\b(?:change|update)\s+(.+?)(?:'s)?\s+(?:full\s*)?name\s+to\s+(.+)$/i,
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (!match?.[1] || !match[2]) continue;
		const lookup = cleanName(match[1]);
		const fullName = cleanName(match[2]);
		if (!lookup || !fullName) continue;
		if (lookup.toLowerCase() === fullName.toLowerCase()) continue;
		return { lookup, fullName };
	}

	return null;
}
