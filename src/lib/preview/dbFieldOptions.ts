import { CONTRACT_TYPES } from "@/components/contract-upload/constants";
import { CONTRACT_DEPARTMENTS } from "../../../constants";

export { CONTRACT_DEPARTMENTS, CONTRACT_TYPES };

export const LICENSE_TYPES = [
	"software",
	"subscription",
	"perpetual",
	"enterprise",
	"open_source",
	"certificate",
	"coi",
	"purchase_order",
] as const;

export const LICENSE_DIVISIONS = [
	{ value: "administration", label: "Administration" },
	{ value: "c-suite", label: "C-Suite" },
	{ value: "management", label: "Management" },
	{ value: "childwelfare", label: "Child Welfare" },
	{ value: "behavioralhealth", label: "Behavioral Health" },
	{ value: "clinic", label: "Clinic" },
	{ value: "residential", label: "Residential" },
	{ value: "cins-fins-snap", label: "CINS-FINS-SNAP" },
] as const;

export const LICENSE_STATUSES = [
	"active",
	"inactive",
	"expired",
	"pending-review",
	"suspended",
	"action-required",
] as const;

export const CONTRACT_STATUSES = [
	"active",
	"inactive",
	"pending-review",
	"action-required",
] as const;

export function formatEnumLabel(value: string): string {
	return value
		.replace(/_/g, " ")
		.replace(/-/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ensureSelectOption(
	options: readonly string[],
	current?: string | null,
): string[] {
	if (!current) return [...options];
	return options.includes(current) ? [...options] : [...options, current];
}
