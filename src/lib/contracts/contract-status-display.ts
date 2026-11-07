/** CAALM status badge colors (Contracts table pattern). */
export function getStatusBadgeClasses(status: string): string {
	switch (status) {
		case "pending-review":
			return "bg-orange/10 text-orange border-orange/20";
		case "action-required":
			return "bg-red/10 text-red border-red/20";
		case "active":
			return "bg-green/10 text-green border-green/20";
		case "inactive":
			return "bg-slate-100 text-slate-600 border-slate-200";
		case "expired":
			return "bg-red/10 text-red border-red/20";
		default:
			return "bg-slate-100 text-slate-600 border-slate-200";
	}
}

export function getStatusLabel(status: string): string {
	switch (status) {
		case "pending-review":
			return "Pending review";
		case "action-required":
			return "Action required";
		case "active":
			return "Active";
		case "inactive":
			return "Inactive";
		case "expired":
			return "Expired";
		default:
			return status.charAt(0).toUpperCase() + status.slice(1);
	}
}
