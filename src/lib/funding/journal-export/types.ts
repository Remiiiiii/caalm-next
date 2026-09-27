export type JournalRestrictionClass = "restricted" | "unrestricted";

export type JournalRowKind = "gift" | "reclass";

export type JournalExportRow = {
	rowKind: JournalRowKind;
	sourceId: string;
	transactionDate: string;
	fundCode: string;
	amount: number;
	restrictionClass: JournalRestrictionClass;
	reclassLeg?: "from" | "to";
	memo: string;
};

export type JournalExportResult = {
	rows: JournalExportRow[];
	giftRowCount: number;
	reclassReleaseCount: number;
	giftCashTotal: number;
	startDate: string;
	endDate: string;
};
