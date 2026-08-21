import type { CalendarSensitivity } from "@/constants/rbac";

/** Map approval status values to short badge text. */
export function getApprovalStatusText(
	status: string | null | undefined,
): string {
	if (!status) return "";

	const statusMap: Record<string, string> = {
		pending: "PENDING",
		approved: "APPROVED",
		rejected: "REJECTED",
		changes_requested: "CHG REQ",
		not_required: "NOT REQUIRED",
	};

	return statusMap[status] || status.replace("_", " ").toUpperCase();
}

/** Map sensitivity level to badge color classes. */
export function getSensitivityBadgeClasses(
	sensitivityLevel: CalendarSensitivity,
): string {
	switch (sensitivityLevel) {
		case "standard":
			return "bg-[#d4fcee] text-[#10b981] border-[#10b981]";
		case "restricted":
			return "bg-[#f5f2f9] text-[#a06ce2] border-[#a06ce2]";
		case "confidential":
			return "bg-[#d9e3f9] text-[#0033A0] border-[#0033A0]";
		default:
			return "bg-slate-50 text-slate-700 border-slate-200";
	}
}
