/**
 * Pull invitees / role / department out of natural-language or form replies
 * so Ask CAALM can open a Confirm card instead of inventing a successful invite.
 */

import {
	CONTRACT_DEPARTMENTS,
	USER_DIVISIONS,
	formatDivisionName,
} from "../../../constants";

export const INVITE_ROLES = [
	"Super Admin",
	"Organization Admin",
	"Executive",
	"Department Manager",
	"Viewer",
] as const;

export type InviteDraft = {
	/** Display names or free text hints from the user message */
	nameHints: string[];
	/** Explicit emails found in the message */
	emails: string[];
	role?: string;
	department?: string;
	division?: string;
};

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const ROLE_ALIASES: Record<string, (typeof INVITE_ROLES)[number]> = {
	"super admin": "Super Admin",
	admin: "Organization Admin",
	"organization admin": "Organization Admin",
	"org admin": "Organization Admin",
	executive: "Executive",
	manager: "Department Manager",
	"department manager": "Department Manager",
	viewer: "Viewer",
};

function normalizeRole(raw: string | undefined): string | undefined {
	if (!raw?.trim()) return undefined;
	const key = raw.trim().toLowerCase();
	if (ROLE_ALIASES[key]) return ROLE_ALIASES[key];
	const exact = INVITE_ROLES.find((r) => r.toLowerCase() === key);
	return exact ?? raw.trim();
}

function normalizeDepartment(raw: string | undefined): string | undefined {
	if (!raw?.trim()) return undefined;
	const key = raw.trim().toLowerCase();
	const known = CONTRACT_DEPARTMENTS.find((d) => d.toLowerCase() === key);
	return known ?? raw.trim();
}

function normalizeDivision(raw: string | undefined): string | undefined {
	if (!raw?.trim()) return undefined;
	const key = raw.trim().toLowerCase().replace(/\s+/g, "-");
	const known = USER_DIVISIONS.find(
		(d) => d === key || formatDivisionName(d).toLowerCase() === raw.trim().toLowerCase(),
	);
	return known ?? raw.trim();
}

function fieldValue(message: string, label: string): string | undefined {
	const re = new RegExp(`^${label}\\s*:\\s*(.+)$`, "im");
	const m = message.match(re);
	const value = m?.[1]?.trim();
	return value || undefined;
}

function splitPeopleChunk(chunk: string): string[] {
	return chunk
		.split(/\s*(?:,|;|\band\b)\s*/i)
		.map((part) =>
			part
				.replace(/<[^>]+>/g, " ")
				.replace(/\([^)]*@[^)]*\)/g, " ")
				.replace(EMAIL_RE, " ")
				.replace(/\s+/g, " ")
				.trim()
				// Drop trailing sentence punctuation ("Chris Vale." → "Chris Vale").
				.replace(/[.,;:!?…]+$/g, "")
				.trim(),
		)
		.filter((part) => part.length >= 2);
}

/**
 * Natural language: "invite Nora and Robin from the directory"
 * Form reply: "People: Nora (a@b)\nRole: Viewer\nDepartment: IT"
 */
export function parseInviteDraft(message: string): InviteDraft {
	const emails = [...message.matchAll(EMAIL_RE)].map((m) => m[0].toLowerCase());
	const uniqueEmails = [...new Set(emails)];

	const peopleLine =
		fieldValue(message, "People") || fieldValue(message, "Person");
	const role =
		normalizeRole(fieldValue(message, "Role")) ||
		normalizeRole(
			message.match(/\bas\s+(?:a\s+|an\s+)?([A-Za-z][A-Za-z ]{1,40}?)(?:\s+in\b|\s+to\b|\s+for\b|$)/i)?.[1],
		);
	const department =
		normalizeDepartment(fieldValue(message, "Department")) ||
		normalizeDepartment(
			message.match(
				/\b(?:in|to)\s+(?:the\s+)?([A-Za-z][A-Za-z &-]{1,40}?)\s+department\b/i,
			)?.[1],
		);
	const division =
		normalizeDivision(fieldValue(message, "Division")) || undefined;

	if (peopleLine) {
		return {
			nameHints: splitPeopleChunk(peopleLine),
			emails: uniqueEmails,
			role,
			department,
			division,
		};
	}

	const stripped = message
		.replace(EMAIL_RE, " ")
		.replace(/\bfrom\s+the\s+(?:connected\s+)?directory\b/gi, " ")
		.replace(/\bas\s+(?:a\s+|an\s+)?[A-Za-z][A-Za-z ]{1,40}?(?=\s+in\b|\s+to\b|\s+for\b|$)/gi, " ")
		.replace(/\b(?:in|to)\s+(?:the\s+)?[A-Za-z][A-Za-z &-]{1,40}?\s+department\b/gi, " ")
		.replace(/\s+/g, " ")
		.trim();

	const inviteChunk =
		stripped.match(
			/\b(?:send\s+(?:an?\s+|and\s+)?invite(?:\s+link)?(?:\s+to)?|invite(?:\s+link)?(?:\s+to)?)\s+(.+)$/i,
		)?.[1] ?? "";

	const nameHints = splitPeopleChunk(inviteChunk).filter(
		(hint) =>
			!/^(new|user|users|people|person|someone|them|him|her)$/i.test(hint),
	);

	return {
		nameHints,
		emails: uniqueEmails,
		role,
		department,
		division,
	};
}

export function formatInvitePeopleLine(
	people: Array<{ fullName: string; email: string }>,
): string {
	return people
		.map((p) => `${p.fullName} (${p.email})`)
		.join(", ");
}

export function inviteDraftIsReady(draft: InviteDraft): boolean {
	return Boolean(
		draft.role &&
			draft.department &&
			(draft.nameHints.length > 0 || draft.emails.length > 0),
	);
}
