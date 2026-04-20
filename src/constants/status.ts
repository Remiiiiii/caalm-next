/**
 * Contract Status Enum
 * Matches the status enum attribute in the Contracts collection
 * Also used by: Invitations, Files, Users, Licenses collections
 */
export const CONTRACT_STATUS_ENUM = [
	"active",
	"inactive",
	"pending-review",
	"action-required",
	"expired",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUS_ENUM)[number];

/**
 * Status options for UI components (dropdowns, filters, etc.)
 */
export const CONTRACT_STATUS_OPTIONS = [
	{ value: "active" as const, label: "Active" },
	{ value: "inactive" as const, label: "Inactive" },
	{ value: "pending-review" as const, label: "Pending Review" },
	{ value: "action-required" as const, label: "Action Required" },
	{ value: "expired" as const, label: "Expired" },
] as const;
