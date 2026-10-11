import { guessMappedField } from "@/lib/import/mapping";

export const USER_IMPORT_FIELD_KEYS = [
	"name",
	"email",
	"role",
	"department",
	"division",
] as const;

export type UserImportFieldKey = (typeof USER_IMPORT_FIELD_KEYS)[number];

export const USER_IMPORT_FIELD_LABELS: Record<UserImportFieldKey, string> = {
	name: "Name",
	email: "Email",
	role: "Role",
	department: "Department",
	division: "Division",
};

const ALIASES: Record<string, UserImportFieldKey> = {
	name: "name",
	full_name: "name",
	email: "email",
	role: "role",
	department: "department",
	division: "division",
};

export function guessUserImportField(header: string): UserImportFieldKey | "" {
	return guessMappedField(header, USER_IMPORT_FIELD_KEYS, ALIASES);
}

export const USER_IMPORT_SAMPLE_CSV = `name,email,role,department,division
Alex Rivera,alex@example.org,Viewer,Programs,Outreach
`;
