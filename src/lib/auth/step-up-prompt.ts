import type { ReactNode } from "react";

export type StepUpTone = "brand" | "danger";

export type StepUpSummaryRow = {
	label: string;
	value: string;
	lead?: boolean;
};

export type StepUpPrompt = {
	tone?: StepUpTone;
	icon?: ReactNode;
	title?: string;
	description?: string;
	summaryRows?: StepUpSummaryRow[];
	confirmLabel?: string;
	confirmingLabel?: string;
	successMessage?: string;
	helpHref?: string;
};

export const DEFAULT_STEP_UP_PROMPT = {
	tone: "brand" as const,
	title: "Confirm with a code",
	description:
		"Enter the 6-digit code we emailed you. Nothing runs until the code matches.",
	confirmLabel: "Confirm with code",
	confirmingLabel: "Confirming",
	successMessage: "Code confirmed.",
};

export function defaultStepUpDescription(destination?: string): string {
	if (!destination?.trim()) return DEFAULT_STEP_UP_PROMPT.description;
	return `Enter the 6-digit code we sent to ${destination.trim()}. Nothing runs until the code matches.`;
}

export function resolveStepUpPrompt(
	prompt?: StepUpPrompt,
	destination?: string,
): Required<
	Pick<
		StepUpPrompt,
		| "tone"
		| "title"
		| "description"
		| "confirmLabel"
		| "confirmingLabel"
		| "successMessage"
	>
> & { summaryRows: StepUpSummaryRow[]; helpHref?: string } {
	return {
		tone: prompt?.tone ?? DEFAULT_STEP_UP_PROMPT.tone,
		title: prompt?.title?.trim() || DEFAULT_STEP_UP_PROMPT.title,
		description:
			prompt?.description?.trim() || defaultStepUpDescription(destination),
		summaryRows: orderSummaryRows(prompt?.summaryRows ?? []),
		confirmLabel:
			prompt?.confirmLabel?.trim() || DEFAULT_STEP_UP_PROMPT.confirmLabel,
		confirmingLabel:
			prompt?.confirmingLabel?.trim() || DEFAULT_STEP_UP_PROMPT.confirmingLabel,
		successMessage:
			prompt?.successMessage?.trim() || DEFAULT_STEP_UP_PROMPT.successMessage,
		helpHref: prompt?.helpHref,
	};
}

export function orderSummaryRows(rows: StepUpSummaryRow[]): StepUpSummaryRow[] {
	const visible = rows.filter((row) => row.value.trim().length > 0);
	const lead = visible.filter((row) => row.lead);
	const rest = visible.filter((row) => !row.lead);
	return [...lead, ...rest];
}

export function confirmingLabelFromPending(
	pending?: string,
	fallback = DEFAULT_STEP_UP_PROMPT.confirmingLabel,
): string {
	if (!pending) return fallback;
	const trimmed = pending.replace(/[.…]+$/g, "").trim();
	return trimmed || fallback;
}

export function factValueToText(value: unknown): string | null {
	if (value == null || typeof value === "boolean") return null;
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === "number") return String(value);
	return null;
}

export function mapConfirmFactsToSummaryRows(params: {
	confirmLabel: string;
	facts?: Array<{ label: string; value: unknown }>;
}): StepUpSummaryRow[] {
	const factRows: StepUpSummaryRow[] = (params.facts ?? [])
		.map((fact) => {
			const value = factValueToText(fact.value);
			if (!value) return null;
			return { label: fact.label, value };
		})
		.filter((row): row is StepUpSummaryRow => Boolean(row));

	return orderSummaryRows([
		{ label: "Action", value: params.confirmLabel, lead: true },
		...factRows,
	]);
}
