/**
 * Encode / decode directory people for Ask CAALM `directory_multi` form fields.
 * Stored value: "Name (email), …". Still parses legacy "Name <email>" values.
 */

export type InvitePeopleOption = {
	fullName: string;
	email: string;
};

const PERSON_PAREN_RE = /^(.+?)\s*\(([^)]+)\)$/;
const PERSON_ANGLE_RE = /^(.+?)\s*<([^>]+)>$/;

export function encodeInvitePersonOption(person: InvitePeopleOption): string {
	return `${person.fullName.trim()} (${person.email.trim().toLowerCase()})`;
}

export function parseInvitePersonOption(
	raw: string,
): InvitePeopleOption | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const match =
		trimmed.match(PERSON_PAREN_RE) ?? trimmed.match(PERSON_ANGLE_RE);
	if (match?.[1] && match[2]) {
		return {
			fullName: match[1].trim(),
			email: match[2].trim().toLowerCase(),
		};
	}
	if (trimmed.includes("@")) {
		return { fullName: trimmed, email: trimmed.toLowerCase() };
	}
	return null;
}

export function parseInvitePeopleValue(value: string): InvitePeopleOption[] {
	const parts = value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	const out: InvitePeopleOption[] = [];
	const seen = new Set<string>();
	for (const part of parts) {
		const person = parseInvitePersonOption(part);
		if (!person) continue;
		const key = person.email.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(person);
	}
	return out;
}

export function formatInvitePeopleValue(people: InvitePeopleOption[]): string {
	return people.map(encodeInvitePersonOption).join(", ");
}

export function formatInviteNamesForAnswer(
	people: Array<{ fullName: string }>,
): string {
	if (people.length === 0) return "those people";
	if (people.length === 1) return `**${people[0]!.fullName}**`;
	if (people.length === 2) {
		return `**${people[0]!.fullName}** and **${people[1]!.fullName}**`;
	}
	const head = people
		.slice(0, -1)
		.map((p) => `**${p.fullName}**`)
		.join(", ");
	const last = people[people.length - 1]!.fullName;
	return `${head}, and **${last}**`;
}
