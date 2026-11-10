import type { ContractStatus } from "@/constants/status";

export type PendingInvitationRow = {
	$id: string;
	name: string;
	email: string;
	role: string;
	token: string;
	expiresAt: string;
	status: ContractStatus | string;
	revoked?: boolean;
	$createdAt: string;
	invitedBy?: string;
	department?: string | null;
	division?: string | null;
};

export function formatInvitationRole(role?: string): string {
	if (!role?.trim()) return "—";
	return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function formatInvitationStatusLabel(status?: string): string {
	if (!status?.trim()) return "—";
	return status
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join(" ");
}

export function invitationStatusBadgeClass(status: string): string {
	const normalized = status?.toLowerCase?.() ?? "";
	switch (normalized) {
		case "pending-review":
		case "pending":
			return "border-orange/20 bg-orange/10 text-orange";
		case "action-required":
			return "border-red/20 bg-red/10 text-red";
		case "active":
		case "accepted":
			return "border-green/20 bg-green/10 text-green";
		case "inactive":
		case "revoked":
			return "border-slate-200 bg-slate-100 text-slate-600";
		default:
			return "border-slate-200 bg-slate-100 text-slate-600";
	}
}
