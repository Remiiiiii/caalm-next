import { pickMappedValue } from "@/lib/import/mapping";
import type { UserImportFieldKey } from "./fields";

export const INVITABLE_ROLE_NAMES = [
	"Super Admin",
	"Organization Admin",
	"Executive",
	"Department Manager",
	"Viewer",
] as const;

const LEGACY_INVITE_ROLE_MAP: Record<string, string> = {
	executive: "Executive",
	admin: "Organization Admin",
	manager: "Department Manager",
	viewer: "Viewer",
	"super admin": "Super Admin",
	"organization admin": "Organization Admin",
	"department manager": "Department Manager",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type MappedUserImportRow = {
	rowNumber: number;
	name: string;
	email: string;
	role: string;
	department?: string;
	division?: string;
};

export type UserImportRowError = {
	rowNumber: number;
	message: string;
};

export function normalizeInviteRoleName(raw: string): string {
	const trimmed = raw.trim();
	return LEGACY_INVITE_ROLE_MAP[trimmed.toLowerCase()] ?? trimmed;
}

export function applyUserColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, UserImportFieldKey | "">,
): { valid: MappedUserImportRow[]; errors: UserImportRowError[] } {
	const valid: MappedUserImportRow[] = [];
	const errors: UserImportRowError[] = [];
	rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const pick = (field: UserImportFieldKey) =>
			pickMappedValue(row, mapping, field);
		const name = pick("name");
		const email = pick("email").toLowerCase();
		const role = normalizeInviteRoleName(pick("role"));
		if (!name || !email || !role) {
			errors.push({
				rowNumber,
				message: "Each row needs a name, email, and role.",
			});
			return;
		}
		if (!EMAIL_RE.test(email)) {
			errors.push({ rowNumber, message: "Email address is not valid." });
			return;
		}
		valid.push({
			rowNumber,
			name,
			email,
			role,
			department: pick("department") || undefined,
			division: pick("division") || undefined,
		});
	});
	return { valid, errors };
}
