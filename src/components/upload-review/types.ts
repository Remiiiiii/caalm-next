export type ReviewSourceRegion = {
	page: number;
	x: number;
	y: number;
	w: number;
	h: number;
};

export type ReviewFieldFormat = "mono" | "date" | "enum" | "person";

export type ReviewField = {
	label: string;
	value: unknown;
	required: boolean;
	source: "extracted" | "manual";
	sourceRegion?: ReviewSourceRegion;
	format?: ReviewFieldFormat;
	/** Form key for linked-row a11y / low-confidence tint */
	fieldKey?: string;
	formatOptions?: { currencyCode?: string };
};

export type ReviewSection = {
	title: string;
	editStep: number;
	fields: ReviewField[];
};

export type UploadDocumentPreviewProps = {
	fileName?: string;
	pdfUrl: string | null;
	htmlContent?: string | null;
	textContent?: string | null;
	downloadOnly?: boolean;
};

export type ReviewReadiness = {
	missingRequiredLabels: string[];
	canSubmit: boolean;
};