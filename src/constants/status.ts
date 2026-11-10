/**
 * Contract Status Enum
 * Matches the status enum attribute in the Contracts collection
 * Also used by: Invitations, Files, Users, Licenses collections
 */
export const CONTRACT_STATUS_ENUM = [
	"active",
	"inactive",
	"pending-review",
	"pending-signature",
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
	{ value: "pending-signature" as const, label: "Pending Signature" },
	{ value: "action-required" as const, label: "Action Required" },
	{ value: "expired" as const, label: "Expired" },
] as const;

/** Invitation rows use the shared contract status enum. */
export const INVITATION_STATUS = {
	PENDING: "pending-review",
	ACCEPTED: "active",
	REVOKED: "inactive",
} as const;

export function isPendingInvitationStatus(
	status: string | null | undefined,
): boolean {
	const normalized = status?.toLowerCase?.() ?? "";
	return normalized === INVITATION_STATUS.PENDING || normalized === "pending";
}

/** Appwrite may store booleans as real booleans or as "true"/"false" strings. */
export function isInvitationRevoked(revoked: unknown): boolean {
	return (
		revoked === true ||
		revoked === 1 ||
		revoked === "1" ||
		revoked === "true" ||
		revoked === "True"
	);
}

/** True when an invite should still appear in the Pending Invitations table. */
export function isVisiblePendingInvitation(invitation: {
	status?: string | null;
	revoked?: unknown;
}): boolean {
	if (isInvitationRevoked(invitation.revoked)) return false;
	const status = String(invitation.status ?? "").toLowerCase();
	if (
		status === INVITATION_STATUS.REVOKED ||
		status === "revoked" ||
		status === INVITATION_STATUS.ACCEPTED ||
		status === "accepted"
	) {
		return false;
	}
	return isPendingInvitationStatus(invitation.status);
}
