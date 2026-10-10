import { guessMappedField } from "@/lib/import/mapping";

export const OBLIGATION_IMPORT_FIELD_KEYS = [
	"contractNumber",
	"contractId",
	"title",
	"dueDate",
	"kind",
	"status",
	"reminderDaysBefore",
	"linkUrl",
	"description",
] as const;

export type ObligationImportFieldKey =
	(typeof OBLIGATION_IMPORT_FIELD_KEYS)[number];

export const OBLIGATION_IMPORT_FIELD_LABELS: Record<
	ObligationImportFieldKey,
	string
> = {
	contractNumber: "Contract number",
	contractId: "Contract ID",
	title: "Title",
	dueDate: "Due date",
	kind: "Kind",
	status: "Status",
	reminderDaysBefore: "Reminder days before",
	linkUrl: "Link URL",
	description: "Description",
};

const ALIASES: Record<string, ObligationImportFieldKey> = {
	contract_number: "contractNumber",
	contract: "contractNumber",
	contract_id: "contractId",
	title: "title",
	due: "dueDate",
	due_date: "dueDate",
	kind: "kind",
	type: "kind",
	status: "status",
	reminder: "reminderDaysBefore",
	reminder_days: "reminderDaysBefore",
	reminder_days_before: "reminderDaysBefore",
	link: "linkUrl",
	url: "linkUrl",
	link_url: "linkUrl",
	description: "description",
};

export function guessObligationImportField(
	header: string,
): ObligationImportFieldKey | "" {
	return guessMappedField(header, OBLIGATION_IMPORT_FIELD_KEYS, ALIASES);
}

export const OBLIGATION_IMPORT_SAMPLE_CSV = `contract_number,title,due_date,kind,status,reminder_days_before,link_url,description
GRANT-2026-01,Quarterly report,2026-06-30,reporting,open,14,https://example.org/report,Submit NAR
`;
