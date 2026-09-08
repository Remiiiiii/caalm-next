import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
	"pending-review": "Pending Review",
	"action-required": "Action Required",
	active: "Active",
	inactive: "Inactive",
	expired: "Expired",
	draft: "Draft",
};

const STATUS_CLASSES: Record<string, string> = {
	active: "bg-green/10 text-green border-green/20",
	"pending-review": "bg-orange/10 text-orange border-orange/20",
	draft: "bg-orange/10 text-orange border-orange/20",
	"action-required": "bg-red/10 text-red border-red/20",
	expired: "bg-red/10 text-red border-red/20",
	inactive: "bg-slate-100 text-slate-600 border-slate-200",
};

/** CAALM pill status badge for Approval workflow dialog headers. */
export function WorkflowStatusBadge({ status }: { status: string }) {
	const key = status.trim().toLowerCase();
	const label = STATUS_LABELS[key] || status || "—";
	const color =
		STATUS_CLASSES[key] || "bg-slate-100 text-slate-600 border-slate-200";

	return (
		<span
			className={cn(
				"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
				color,
			)}
		>
			Status: {label}
		</span>
	);
}
