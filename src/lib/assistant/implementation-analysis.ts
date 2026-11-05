import { formatAuditFindingLabel } from "@/lib/assistant/audit-remediation-context";
import type {
	AuditCapRecord,
	AuditFindingRecord,
} from "@/lib/audit-upload/types";

export type ImplementationChange = {
	label: string;
	current: string;
	required: string;
};

export type ImplementationAnalysis = {
	findingLabel: string;
	summary: string;
	steps: string[];
	changes: ImplementationChange[];
	blockers: string[];
	canApply: boolean;
	applyArgs: {
		capId: string;
		findingId: string;
		documentId: string;
		nextStatus: "in_progress";
	} | null;
	href: string;
	markdown: string;
};

function statusLabel(status: string | null): string {
	if (!status) return "None";
	return status.replaceAll("_", " ");
}

export function changesFromPendingArgs(
	args?: Record<string, unknown> | null,
): ImplementationChange[] {
	const raw = args?.changes;
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((row) => {
		if (!row || typeof row !== "object") return [];
		const rec = row as Record<string, unknown>;
		const label = typeof rec.label === "string" ? rec.label : "";
		const current = typeof rec.current === "string" ? rec.current : "";
		const required = typeof rec.required === "string" ? rec.required : "";
		if (!label || !current || !required) return [];
		return [{ label, current, required }];
	});
}

export function buildImplementationAnalysis(params: {
	finding: Pick<
		AuditFindingRecord,
		"$id" | "documentId" | "title" | "findingCode"
	>;
	cap: Pick<AuditCapRecord, "$id" | "title" | "status"> | null;
	canManageCaps: boolean;
}): ImplementationAnalysis {
	const { finding, cap, canManageCaps } = params;
	const findingLabel = formatAuditFindingLabel(
		finding.findingCode,
		finding.title,
	);
	const href = `/audits/upload/${finding.documentId}#finding-cap-${finding.$id}`;
	const blockers: string[] = [];
	const changes: ImplementationChange[] = [];
	const steps: string[] = [];

	if (!cap) {
		blockers.push(
			"No corrective action exists yet. Confirm the finding or create a corrective action first.",
		);
		steps.push(
			"Open the finding details on this uploaded audit.",
			"Create a corrective action, then start it.",
			"Follow How to correct in your own systems and upload evidence.",
		);
	} else if (cap.status === "open") {
		changes.push({
			label: "Corrective action status",
			current: "Open",
			required: "In progress",
		});
		steps.push(
			"Start the corrective action (status Open → In progress).",
			"Follow the How to correct steps outside CAALM.",
			"Upload screenshots or PDFs as evidence on the corrective action.",
			"Use Mark closed only after a person has checked the proof.",
		);
		if (!canManageCaps) {
			blockers.push(
				"You can view this finding, but you cannot start the corrective action.",
			);
		}
	} else if (
		cap.status === "in_progress" ||
		cap.status === "pending_verification"
	) {
		steps.push(
			"Keep the corrective action in progress.",
			"Upload evidence files on the corrective action.",
			"Use Mark closed yourself after a person reviews the proof. CAALM will not close it for you.",
		);
	} else {
		steps.push(
			"This corrective action is already closed or verified. Review evidence if you need a record.",
		);
	}

	const canApply = Boolean(
		cap && cap.status === "open" && canManageCaps && changes.length > 0,
	);

	const summary = cap
		? `Finding ${findingLabel} has a corrective action titled “${cap.title}” that is currently ${statusLabel(cap.status)}. ${
				canApply
					? "CAALM can start it for you after you confirm."
					: "Use the Corrective action section on this uploaded audit to continue."
			}`
		: `Finding ${findingLabel} does not have a corrective action yet. Confirm the finding or create one before CAALM can start the work.`;

	const changeLines = changes
		.map(
			(change) => `- ${change.label}: ${change.current} → ${change.required}`,
		)
		.join("\n");
	const stepLines = steps
		.map((step, index) => `${index + 1}. ${step}`)
		.join("\n");
	const blockerLines = blockers.map((item) => `- ${item}`).join("\n");

	const markdown = [
		`**${findingLabel}**`,
		"",
		summary,
		"",
		"## What to do in CAALM",
		stepLines,
		changeLines ? `\n## Current → required\n${changeLines}` : "",
		blockerLines ? `\n## Before you continue\n${blockerLines}` : "",
	]
		.filter(Boolean)
		.join("\n");

	return {
		findingLabel,
		summary,
		steps,
		changes,
		blockers,
		canApply,
		applyArgs:
			canApply && cap
				? {
						capId: cap.$id,
						findingId: finding.$id,
						documentId: finding.documentId,
						nextStatus: "in_progress",
					}
				: null,
		href,
		markdown,
	};
}
