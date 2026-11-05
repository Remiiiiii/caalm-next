import { PERMISSIONS } from "@/constants/permissions";
import type { AssistantResearchStep } from "@/lib/assistant/assistant-research-steps";
import {
	type AuditRemediationContext,
	formatAuditFindingLabel,
} from "@/lib/assistant/audit-remediation-context";
import type { AssistantAuthContext } from "@/lib/assistant/auth";
import {
	autonomyFailSummaryLead,
	autonomyPassSummaryLead,
	classifyCorrectionAutonomy,
} from "@/lib/assistant/correction-autonomy";
import { buildImplementationAnalysis } from "@/lib/assistant/implementation-analysis";
import type { RetrievedSource } from "@/lib/assistant/knowledge/retrieve";
import {
	type AssistantSuggestion,
	withCloseCapSuggestion,
} from "@/lib/assistant/suggestions";
import {
	getAuditDocument,
	getFinding,
	listCaps,
	listFindings,
} from "@/lib/audit-upload/store";
import type {
	AuditCapRecord,
	AuditFindingRecord,
} from "@/lib/audit-upload/types";

export type AuditRemediationResearchResult = {
	steps: AssistantResearchStep[];
	answer: string;
	sources: RetrievedSource[];
	suggestions: AssistantSuggestion[];
	hasExecutableApply: boolean;
	/** Offer confirm_finding pending action (draft finding, no CAP yet). */
	hasConfirmAction: boolean;
};

function step(
	id: string,
	label: string,
	kind: AssistantResearchStep["kind"],
	status: AssistantResearchStep["status"],
	resultNote?: string,
): AssistantResearchStep {
	return { id, label, kind, status, ...(resultNote ? { resultNote } : {}) };
}

function humanStatus(status: string): string {
	return status.replaceAll("_", " ");
}

export function buildOtherFindingSuggestion(): AssistantSuggestion {
	return {
		id: "other-finding",
		label: "Ask me about a different finding on this audit",
		action: {
			type: "prompt",
			text: "List other findings on this uploaded audit that still need work.",
		},
	};
}

/** Navigate chips when Ask CAALM cannot confirm for the user (no permission). */
export function buildNullResultSuggestions(
	documentId: string,
	findingId: string,
): AssistantSuggestion[] {
	const findingHref = `/audits/upload/${documentId}#finding-${findingId}`;
	return [
		{
			id: "confirm-finding",
			label: "Confirm this finding to draft a corrective action",
			action: {
				type: "navigate",
				href: findingHref,
			},
		},
		buildOtherFindingSuggestion(),
	];
}

function oneLine(raw: string, max = 220): string {
	const flat = raw.replace(/\s+/g, " ").trim();
	if (flat.length <= max) return flat;
	return `${flat.slice(0, max - 1).trimEnd()}…`;
}

function buildFindingsMarkdown(params: {
	findingLabel: string;
	summary: string;
	whatFound: { label: string; current: string; required: string }[];
	rootCause: string | null;
	proposedSteps: string[];
	manualSteps: string[];
	/** Autonomy leads are longer; default 400 truncates them. */
	summaryMax?: number;
}): string {
	const whatLines = params.whatFound
		.map((row) => {
			const current = oneLine(row.current, 80);
			const required = oneLine(row.required, 160);
			return `- **${row.label}:** ${current} → ${required}`;
		})
		.join("\n");
	const proposed = params.proposedSteps
		.map((line, index) => `${index + 1}. ${oneLine(line, 280)}`)
		.join("\n");
	const manual =
		params.manualSteps.length > 0
			? `\n## Manual steps (outside CAALM)\n${params.manualSteps.map((line, i) => `${i + 1}. ${oneLine(line, 280)}`).join("\n")}`
			: "";

	return [
		`## Summary`,
		oneLine(params.summary, params.summaryMax ?? 400),
		whatLines ? `\n## What was found\n${whatLines}` : "",
		params.rootCause
			? `\n## Root cause\n${oneLine(params.rootCause, 280)}`
			: "",
		proposed ? `\n## Proposed steps\n${proposed}` : "",
		manual,
	]
		.filter(Boolean)
		.join("\n");
}

export async function runAuditRemediationResearch(params: {
	ctx: AssistantAuthContext;
	remediationContext: AuditRemediationContext;
	/** Ignored — remediation cites only records touched in research. */
	ragSources?: RetrievedSource[];
}): Promise<AuditRemediationResearchResult> {
	const { ctx, remediationContext } = params;
	const findingLabel = formatAuditFindingLabel(
		remediationContext.findingCode,
		remediationContext.title,
	);
	const steps: AssistantResearchStep[] = [];

	const doc = await getAuditDocument(ctx.orgId, remediationContext.documentId);
	steps.push(
		step(
			"doc",
			`Opening uploaded audit${doc?.title ? ` “${doc.title}”` : ""}…`,
			"file",
			doc ? "done" : "empty",
			doc ? "— record loaded" : "— audit not found",
		),
	);

	const finding =
		(await getFinding(ctx.orgId, remediationContext.findingId)) ??
		({
			$id: remediationContext.findingId,
			documentId: remediationContext.documentId,
			title: remediationContext.title,
			findingCode: remediationContext.findingCode,
			description: `${remediationContext.conditionText}\n\n${remediationContext.correctiveText}`,
			status: "confirmed",
		} as Pick<
			AuditFindingRecord,
			"$id" | "documentId" | "title" | "findingCode" | "description" | "status"
		>);

	steps.push(
		step(
			"finding",
			`Reading finding ${findingLabel}…`,
			"file",
			finding ? "done" : "empty",
			finding ? `— ${humanStatus(String(finding.status))}` : undefined,
		),
	);

	const caps = await listCaps({
		orgId: ctx.orgId,
		documentId: remediationContext.documentId,
		limit: 50,
	});
	const cap =
		caps.find((row) => row.findingId === remediationContext.findingId) ?? null;

	steps.push(
		step(
			"caps",
			`Searching corrective actions on this audit…`,
			"database",
			"done",
			cap
				? `— ${cap.title} (${humanStatus(cap.status)})`
				: "— none linked to this finding",
		),
	);

	const canManageFindings = ctx.permissions.includes(
		PERMISSIONS.AUDIT.MANAGE_FINDINGS,
	);
	const canManageCaps = ctx.permissions.includes(PERMISSIONS.AUDIT.MANAGE_CAPS);

	const findingHref = `/audits/upload/${remediationContext.documentId}#finding-${remediationContext.findingId}`;
	const findingCapHref = `/audits/upload/${remediationContext.documentId}#finding-cap-${remediationContext.findingId}`;

	// Only cite org records touched in research — not unrelated help-doc chips.
	const sources: RetrievedSource[] = [
		{
			id: `finding-${remediationContext.findingId}`,
			title: findingLabel,
			excerpt: oneLine(remediationContext.conditionText, 160),
			href: cap ? findingCapHref : findingHref,
		},
		...(doc
			? [
					{
						id: `audit-doc-${doc.$id}`,
						title: doc.title || "Uploaded audit",
						excerpt: oneLine(doc.summary ?? "Uploaded audit record", 120),
						href: `/audits/upload/${doc.$id}`,
					},
				]
			: []),
	];

	const corrective = remediationContext.correctiveText.trim();
	const condition = remediationContext.conditionText.trim();
	const findingStatus = String(
		(finding as { status?: string }).status ?? "",
	).toLowerCase();
	const isDraftFinding = findingStatus === "draft";

	if (!doc || !finding) {
		const answer = [
			"## Summary",
			`I searched your organization's uploaded audit data for **${findingLabel}** but could not load the audit or finding record.`,
			"",
			"## What I searched",
			"Use the research trace above to see each lookup.",
			"",
			"## Likely reason",
			"The audit may have been removed, or your account no longer has access to that upload.",
		].join("\n");
		return {
			steps,
			answer,
			sources,
			suggestions: buildNullResultSuggestions(
				remediationContext.documentId,
				remediationContext.findingId,
			),
			hasExecutableApply: false,
			hasConfirmAction: false,
		};
	}

	// Short path: finding still draft — confirm first; skip long research.
	if (isDraftFinding && !cap) {
		const answer = [
			`## Summary`,
			`**${findingLabel}** is still a draft. Confirm it before CAALM can draft or start a corrective action.`,
			"",
			`## Next step`,
			canManageFindings
				? `Confirm the finding below. That records agreement and may draft an Open corrective action. Then I will continue Show me how in this chat.`
				: `Open the finding card and use **Confirm finding** (you need permission to manage findings). Then ask Show me how again.`,
		].join("\n");
		return {
			steps,
			answer,
			sources,
			suggestions: canManageFindings
				? [buildOtherFindingSuggestion()]
				: buildNullResultSuggestions(
						remediationContext.documentId,
						remediationContext.findingId,
					),
			hasExecutableApply: false,
			hasConfirmAction: canManageFindings,
		};
	}

	const siblings = await listFindings({
		orgId: ctx.orgId,
		documentId: remediationContext.documentId,
		limit: 50,
	});
	const repeatHint = siblings.filter(
		(row) =>
			row.$id !== remediationContext.findingId &&
			row.findingCode === remediationContext.findingCode,
	);
	steps.push(
		step(
			"related",
			`Checking for related findings on the same audit…`,
			"search",
			"done",
			repeatHint.length
				? `— ${repeatHint.length} related row(s)`
				: "— no duplicate code on this audit",
		),
	);

	const analysis = buildImplementationAnalysis({
		finding: finding as AuditFindingRecord,
		cap: cap as AuditCapRecord | null,
		canManageCaps,
	});

	if (!corrective && !cap) {
		const answer = [
			"## Summary",
			`Finding **${findingLabel}** is in CAALM, but there is no **How to correct** text and no corrective action yet — there is nothing concrete to execute automatically.`,
			"",
			"## What I searched",
			steps
				.map((s) => `- ${s.label}${s.resultNote ? ` ${s.resultNote}` : ""}`)
				.join("\n"),
			"",
			"## Likely reason",
			"Add How to correct / a corrective action on the uploaded audit before I can propose data-backed fixes.",
		].join("\n");
		return {
			steps,
			answer,
			sources,
			suggestions: [buildOtherFindingSuggestion()],
			hasExecutableApply: false,
			hasConfirmAction: false,
		};
	}

	const whatFound = [
		{
			label: "Finding condition",
			current: "Reported gap",
			required: condition.slice(0, 200) || "See finding details",
		},
		...analysis.changes.map((change) => ({
			label: change.label,
			current: change.current,
			required: change.required,
		})),
	];

	const autonomy = classifyCorrectionAutonomy({
		title: remediationContext.title,
		conditionText: condition,
		correctiveText: corrective,
	});

	const proposedSteps: string[] = [];
	const manualSteps: string[] = [];
	let summary: string;

	if (autonomy.aiCompletable) {
		const capBit = cap
			? ` Finding **${findingLabel}** has corrective action “${cap.title}” (${humanStatus(cap.status)}).`
			: ` Finding **${findingLabel}** still needs a corrective action record in CAALM.`;
		summary = `${autonomyPassSummaryLead()}${capBit}`;

		if (analysis.canApply) {
			proposedSteps.push(
				`Start corrective action “${cap?.title ?? "Open action"}” (Open → In progress) in CAALM when you confirm below — that is the data step I can apply.`,
			);
		} else if (cap && cap.status !== "open") {
			proposedSteps.push(
				`Corrective action “${cap.title}” is already ${humanStatus(cap.status)}. Review the change, then Mark closed when you agree.`,
			);
		} else if (!cap) {
			proposedSteps.push(
				"Create or confirm a corrective action on the finding card, then ask Show me how again so I can start it.",
			);
		}
		manualSteps.push(
			"Review the proposed change, then Mark closed — no outside-CAALM evidence step is required for this data correction.",
		);
	} else {
		summary = `${autonomyFailSummaryLead({
			canStartCap: analysis.canApply || Boolean(cap),
			unmetReason: autonomy.unmetReason,
		})} Finding **${findingLabel}**.`;

		if (analysis.canApply) {
			proposedSteps.push(
				`Start corrective action “${cap?.title ?? "Open action"}” (Open → In progress) when you confirm below — I can draft/start tracking, not finish the real-world work.`,
			);
		} else if (cap && cap.status !== "open") {
			proposedSteps.push(
				`Keep corrective action “${cap.title}” in ${humanStatus(cap.status)} until the required evidence is uploaded.`,
			);
		} else if (!cap) {
			proposedSteps.push(
				"Confirm or create a corrective action so CAALM can track the work, then ask Show me how again to start it.",
			);
		}

		if (corrective) {
			manualSteps.push(oneLine(corrective, 280));
		}
		manualSteps.push(
			`Upload documentation that shows ${autonomy.unmetReason} on the corrective action.`,
		);
		manualSteps.push(
			"Mark closed only after that evidence is on file — CAALM will not close this finding for you.",
		);
	}

	const answer = buildFindingsMarkdown({
		findingLabel,
		summary,
		whatFound,
		rootCause: condition ? (condition.split(".")[0]?.trim() ?? null) : null,
		proposedSteps,
		manualSteps,
		summaryMax: 700,
	});

	const baseSuggestions: AssistantSuggestion[] = analysis.canApply
		? []
		: [buildOtherFindingSuggestion()];

	return {
		steps,
		answer,
		sources,
		suggestions: withCloseCapSuggestion(baseSuggestions, {
			capId: cap?.$id ?? remediationContext.capId,
			capStatus: cap?.status ?? remediationContext.capStatus,
			canManageCaps,
			findingId: remediationContext.findingId,
			documentId: remediationContext.documentId,
			answerText: answer,
		}),
		hasExecutableApply: analysis.canApply,
		hasConfirmAction: false,
	};
}
