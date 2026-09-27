export const FORM_990_PART_IX_BUCKETS = [
	"program",
	"management",
	"fundraising",
] as const;

export type Form990PartIxBucket = (typeof FORM_990_PART_IX_BUCKETS)[number];

export const FORM_990_MAPPING_SOURCE_TYPES = [
	"obligation_kind",
	"budget_category",
	"gift",
] as const;

export type Form990MappingSourceType =
	(typeof FORM_990_MAPPING_SOURCE_TYPES)[number];

export type Form990ExpenseMapping = {
	$id: string;
	orgId: string;
	sourceType: Form990MappingSourceType;
	sourceKey: string;
	partIxBucket: Form990PartIxBucket;
};

export type Form990ExpenseLine = {
	sourceType: Form990MappingSourceType;
	sourceKey: string;
	amount: number;
	contractId?: string;
	referenceId: string;
	referenceLabel: string;
	eventDate: string;
};

export type Form990WorksheetRow = {
	partIxBucket: Form990PartIxBucket;
	amount: number;
	sourceType: Form990MappingSourceType;
	sourceKey: string;
	referenceId: string;
	referenceLabel: string;
	eventDate: string;
	contractId?: string;
};
