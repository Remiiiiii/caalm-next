import { format } from "date-fns";
import { formatOrgLabel } from "./formatOrgLabel";
import type { ReviewField, ReviewFieldFormat } from "./types";

export type PersonOption = {
	id: string;
	name: string;
	imageUrl?: string | null;
};

export function fieldValueEmpty(value: unknown): boolean {
	if (value === undefined || value === null || value === "") return true;
	if (Array.isArray(value)) return value.length === 0;
	if (value instanceof Date) return Number.isNaN(value.getTime());
	return false;
}

export function parseReviewDate(value: unknown): Date | null {
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
	if (typeof value === "string" && /\d{4}-\d{2}-\d{2}/.test(value)) {
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	return null;
}

/** Spec: `1 Aug 2026`, not US numeric dates. */
function formatMoneyDisplay(amount: unknown, currency: string): string {
	if (amount === undefined || amount === null || amount === "") return "";
	const n = Number(String(amount).replace(/,/g, ""));
	if (!Number.isFinite(n)) return String(amount);
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
		}).format(n);
	} catch {
		return `${currency} ${n.toLocaleString()}`;
	}
}

export function formatReviewDate(value: unknown): string {
	const d = parseReviewDate(value);
	return d ? format(d, "d MMM yyyy") : "";
}

export function middleTruncateFileName(name: string, max = 36): string {
	if (name.length <= max) return name;
	const dot = name.lastIndexOf(".");
	const ext = dot > 0 ? name.slice(dot) : "";
	const stem = dot > 0 ? name.slice(0, dot) : name;
	const budget = max - ext.length - 1;
	if (budget < 4) return `${name.slice(0, max - 1)}…`;
	const head = Math.ceil(budget * 0.55);
	const tail = budget - head;
	return `${stem.slice(0, head)}…${stem.slice(-tail)}${ext}`;
}

export function splitSectionTitle(title: string): {
	plain: string;
	accent: string;
} {
	const idx = title.indexOf(" ");
	if (idx === -1) return { plain: title, accent: "" };
	return { plain: title.slice(0, idx), accent: title.slice(idx + 1) };
}

export function collectMissingRequiredLabels(
	sections: { fields: ReviewField[] }[],
): string[] {
	const labels: string[] = [];
	for (const section of sections) {
		for (const field of section.fields) {
			if (field.required && fieldValueEmpty(field.value)) {
				labels.push(field.label);
			}
		}
	}
	return labels;
}

export function formatFieldDisplayValue(
	field: ReviewField,
	peopleById: Map<string, PersonOption>,
): string {
	if (fieldValueEmpty(field.value)) return "";
	const fmt = field.format;
	if (field.fieldKey === "amount") {
		return formatMoneyDisplay(
			field.value,
			field.formatOptions?.currencyCode || "USD",
		);
	}
	if (fmt === "date") return formatReviewDate(field.value);
	if (fmt === "enum") {
		if (Array.isArray(field.value)) {
			return field.value.map((v) => formatOrgLabel(v)).join(", ");
		}
		return formatOrgLabel(field.value);
	}
	if (fmt === "person") {
		const ids = Array.isArray(field.value)
			? field.value.map(String)
			: [String(field.value)];
		return ids
			.map((id) => peopleById.get(id)?.name || "Unknown user")
			.join(", ");
	}
	if (typeof field.value === "boolean") return field.value ? "Yes" : "No";
	return String(field.value);
}