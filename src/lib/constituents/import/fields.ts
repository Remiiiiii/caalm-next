/** CSV column targets for constituent + optional gift columns. */
export const IMPORT_FIELD_KEYS = [
	"firstName",
	"lastName",
	"email",
	"phone",
	"type",
	"giftAmount",
	"giftDate",
	"giftMethod",
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELD_KEYS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportFieldKey, string> = {
	firstName: "First name",
	lastName: "Last name",
	email: "Email",
	phone: "Phone",
	type: "Constituent type",
	giftAmount: "Gift amount",
	giftDate: "Gift date",
	giftMethod: "Gift method",
};

export function listUnknownCsvHeaders(
	headers: string[],
	mapping: Record<string, ImportFieldKey | "">,
): string[] {
	return headers.filter((header) => {
		const target = mapping[header];
		return !target;
	});
}
