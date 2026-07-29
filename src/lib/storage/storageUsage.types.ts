export interface FileTypeSummary {
	size: number;
	latestDate: string;
}

export interface StorageUsagePayload {
	document: FileTypeSummary;
	image: FileTypeSummary;
	video: FileTypeSummary;
	audio: FileTypeSummary;
	other: FileTypeSummary;
	used: number;
	all: number;
	limitBytes: number;
	limitGB: number;
}

export const STORAGE_USAGE_SWR_KEY = "/api/storage/usage";
