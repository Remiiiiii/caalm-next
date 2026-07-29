/**
 * Type definitions for License Upload Form
 */

export interface LicenseUploadFormProps {
	ownerId: string;
	accountId: string;
	className?: string;
	triggerLabel?: string;
	onSuccess?: () => void;
}

export interface ProcessedFileData {
	name: string;
	type: string;
	size: number;
	base64Content: string;
	arrayBuffer: ArrayBuffer;
	lastModified: number;
	bucketFileId?: string | null;
}

export interface Draft {
	$id: string;
	formData: string | Record<string, unknown>;
	currentStep: number;
	processedFileData: string | Record<string, unknown> | null;
	extractedData: string | Record<string, unknown> | null;
	progressPercentage: number;
	lastSavedAt: string;
	isCompleted: boolean;
	ownerId: string;
	accountId: string;
}

export interface Manager {
	$id: string;
	fullName: string;
	email: string;
	division?: string;
}
