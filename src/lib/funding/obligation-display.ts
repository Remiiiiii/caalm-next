import { daysUntil } from "./constants";
import type { ObligationKind, ObligationStatus } from "./types";

export const OBLIGATION_KIND_LABEL: Record<ObligationKind, string> = {
	renewal: "Renewal",
	reporting: "Reporting",
	deliverable: "Deliverable",
	compliance: "Compliance",
	payment: "Payment",
	other: "Other",
};

export const OBLIGATION_STATUS_LABEL: Record<ObligationStatus, string> = {
	open: "Open",
	in_progress: "In progress",
	done: "Done",
	waived: "Waived",
	overdue: "Overdue",
};

export function obligationStatusBadgeClass(status: ObligationStatus): string {
	if (status === "done") {
		return "bg-green/10 text-green border-green/20";
	}
	if (status === "overdue") {
		return "bg-red/10 text-red border-red/20";
	}
	if (status === "in_progress") {
		return "bg-blue/10 text-blue border-blue/20";
	}
	if (status === "waived") {
		return "bg-slate-100 text-slate-600 border-slate-200";
	}
	return "bg-orange/10 text-orange border-orange/20";
}

export function formatObligationDueLine(dueDate?: string): string | null {
	if (!dueDate) return null;
	const raw = dueDate.slice(0, 10);
	const [y, m, d] = raw.split("-").map(Number);
	if (!y || !m || !d) return null;
	const label = new Date(y, m - 1, d).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
	const days = daysUntil(dueDate);
	if (days == null) return `Due ${label}`;
	if (days < 0) return `Due ${label} · ${Math.abs(days)}d overdue`;
	if (days === 0) return `Due ${label} · today`;
	return `Due ${label} · in ${days} days`;
}
