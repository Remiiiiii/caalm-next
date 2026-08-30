import {
	differenceInCalendarDays,
	differenceInHours,
	isYesterday,
} from "date-fns";
import { blueprintLabel } from "@/lib/templates/blueprint-catalog";
import { WIZARD_STEP_COUNT } from "@/lib/templates/constants";
import { filledTokenPercent } from "@/lib/templates/token-schema";
import type { WizardIntake, WizardSession, WizardSessionSummary } from "@/types/contract-templates";

export function draftDisplayName(intake: WizardIntake): string {
	const name = intake.contractName.trim();
	return name || "Untitled draft";
}

export function draftAgreementLabel(blueprintId: string | null): string {
	if (!blueprintId) return "No agreement type chosen";
	return blueprintLabel(blueprintId);
}

export function draftEditedAt(session: WizardSession): string {
	const iso = session.payload.lastSavedAt || session.$updatedAt || session.$createdAt;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";

	const hours = differenceInHours(new Date(), date);
	if (hours < 1) return "Just now";
	if (hours < 24) return `${hours}h ago`;
	if (isYesterday(date)) return "Yesterday";

	const days = differenceInCalendarDays(new Date(), date);
	if (days < 7) return `${days} days ago`;
	return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function draftProgress(session: WizardSession): {
	percent: number;
	label: string;
} {
	if (!session.payload.blueprintId) {
		return { percent: 0, label: "Not started" };
	}

	const percent = filledTokenPercent(
		session.payload.blueprintId,
		session.payload.intake,
		session.payload.tokenValues,
	);
	if (percent > 0) {
		return { percent, label: `${percent}% complete` };
	}

	if (session.currentStep > 0) {
		const stepPercent = Math.round(
			(session.currentStep / (WIZARD_STEP_COUNT - 1)) * 100,
		);
		return {
			percent: Math.max(stepPercent, 8),
			label: `${stepPercent}% complete`,
		};
	}

	return { percent: 0, label: "Not started" };
}

/** Drafts with no name, no blueprint, and no fill progress. */
export function isEmptyWizardDraft(session: WizardSession): boolean {
	if (session.payload.intake.contractName.trim()) return false;
	if (session.payload.blueprintId) return false;
	if (session.payload.templateId) return false;
	return true;
}

export function sortDraftsByEdited(drafts: WizardSession[]): WizardSession[] {
	return [...drafts].sort((a, b) => {
		const aTime = new Date(
			a.payload.lastSavedAt || a.$updatedAt || a.$createdAt,
		).getTime();
		const bTime = new Date(
			b.payload.lastSavedAt || b.$updatedAt || b.$createdAt,
		).getTime();
		return bTime - aTime;
	});
}

export function draftDisplayNameFromSummary(
	summary: WizardSessionSummary,
): string {
	const name = summary.contractName.trim();
	return name || "Untitled draft";
}

export function draftEditedAtFromSummary(
	summary: WizardSessionSummary,
): string {
	const iso = summary.lastSavedAt || summary.$updatedAt || summary.$createdAt;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";

	const hours = differenceInHours(new Date(), date);
	if (hours < 1) return "Just now";
	if (hours < 24) return `${hours}h ago`;
	if (isYesterday(date)) return "Yesterday";

	const days = differenceInCalendarDays(new Date(), date);
	if (days < 7) return `${days} days ago`;
	return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function draftProgressFromSummary(
	summary: WizardSessionSummary,
): { percent: number; label: string } {
	if (!summary.blueprintId) {
		return { percent: 0, label: "Not started" };
	}

	if (summary.fillPercent > 0) {
		return {
			percent: summary.fillPercent,
			label: `${summary.fillPercent}% complete`,
		};
	}

	if (summary.currentStep > 0) {
		const stepPercent = Math.round(
			(summary.currentStep / (WIZARD_STEP_COUNT - 1)) * 100,
		);
		return {
			percent: Math.max(stepPercent, 8),
			label: `${stepPercent}% complete`,
		};
	}

	return { percent: 0, label: "Not started" };
}

/** Untitled, no agreement type chosen, and never started. */
export function isEmptyWizardDraftSummary(
	summary: WizardSessionSummary,
): boolean {
	if (summary.contractName.trim()) return false;
	if (summary.blueprintId) return false;
	if (summary.templateId) return false;
	return true;
}

export function sortDraftSummariesByEdited(
	drafts: WizardSessionSummary[],
): WizardSessionSummary[] {
	return [...drafts].sort((a, b) => {
		const aTime = new Date(
			a.lastSavedAt || a.$updatedAt || a.$createdAt,
		).getTime();
		const bTime = new Date(
			b.lastSavedAt || b.$updatedAt || b.$createdAt,
		).getTime();
		return bTime - aTime;
	});
}
