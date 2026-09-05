import type { Models } from "node-appwrite";

// Centralized UI-facing file document type used across components
export interface UIFileDoc extends Models.Document {
	// Core file properties used in UI
	type: string;
	extension: string;
	url: string;
	name: string;
	size: number;
	owner: { fullName: string } | string;
	users: string[];

	// Contract linkage and metadata
	contractId?: string;
	contractName?: string;
	contractOwnerId?: string;
	contractExpiryDate?: string;
	isExpired?: boolean;
	status?:
		| "active"
		| "inactive"
		| "pending-review"
		| "action-required"
		| "expired";
	contractType?: string;
	amount?: number;
	vendor?: string;
	contractNumber?: string;
	priority?: string;
	compliance?: string;
	department?: string;
	assignedManagers?: string[];
	riskLevel?: string;

	// Storage/other optional attributes referenced by UI
	bucketFileId?: string;
	description?: string;
	deletedAt?: string | null;
	deletedBy?: string | null;
	approvalWorkflowState?: string;
}
