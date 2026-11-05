import { splitFindingDescription } from "@/lib/audit-upload/split-finding-description";
import type { AuditCapRecord, AuditFindingRecord } from "@/lib/audit-upload/types";

/** Title without the leading finding-code prefix (matches finding cards). */
export function findingDisplayTitle(
	findingCode: string | null | undefined,
	title: string,
): string {
	const code = findingCode?.trim();
	const raw = title.trim();
	if (!code || !raw) return raw || "Audit finding";
	return (
		raw.replace(
			new RegExp(
				`^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—-]\\s*`,
			),
			"",
		) || raw
	);
}

/** Plain label for chat copy (code + title when both exist). */
export function formatAuditFindingLabel(
	findingCode: string | null | undefined,
	title: string,
): string {
	const code = findingCode?.trim();
	if (!code) return title.trim() || "this audit finding";
	if (title.includes(code)) return title.trim();
	return `${code} — ${title.trim()}`;
}

export function auditRemediationUserPrompt(
	findingCode: string | null | undefined,
	title: string,
): string {
	const label = formatAuditFindingLabel(findingCode, title);
	return `Show me how to implement the corrective steps for ${label}.`;
}

export type AuditRemediationLaunchContext = {
	kind: "audit_remediation";
	findingId: string;
	documentId: string;
};

export type AuditRemediationContext = {
	findingId: string;
	documentId: string;
	findingCode: string | null;
	title: string;
	severity: string;
	conditionText: string;
	correctiveText: string;
	capStatus: string | null;
	capTitle: string | null;
	capId: string | null;
};

export function parseAuditRemediationLaunch(
	raw: unknown,
): AuditRemediationLaunchContext | "invalid" | null {
	if (raw == null) return null;
	if (typeof raw !== "object") return "invalid";
	const rec = raw as Record<string, unknown>;
	if (rec.kind !== "audit_remediation") return "invalid";
	const findingId =
		typeof rec.findingId === "string" ? rec.findingId.trim() : "";
	const documentId =
		typeof rec.documentId === "string" ? rec.documentId.trim() : "";
	if (!findingId || !documentId) return "invalid";
	return { kind: "audit_remediation", findingId, documentId };
}

export function buildAuditRemediationContext(params: {
	finding: AuditFindingRecord;
	cap?: AuditCapRecord | null;
}): AuditRemediationContext {
	const { finding, cap } = params;
	const { conditionText, correctiveText } = splitFindingDescription(
		finding.description,
	);
	return {
		findingId: finding.$id,
		documentId: finding.documentId,
		findingCode: finding.findingCode,
		title: finding.title,
		severity: finding.severityComputed,
		conditionText,
		correctiveText,
		capStatus: cap?.status ?? null,
		capTitle: cap?.title ?? null,
		capId: cap?.$id ?? null,
	};
}

export function conversationTitleForRemediation(
	ctx: AuditRemediationContext,
): string {
	const display = findingDisplayTitle(ctx.findingCode, ctx.title);
	const id = ctx.findingCode?.trim() || ctx.findingId;
	return `${id} — ${display}`.slice(0, 100);
}

/** System-prompt addendum. Finding text is loaded on the server, not from the client. */
export function buildAuditRemediationPrompt(ctx: AuditRemediationContext): string {
	const label = formatAuditFindingLabel(ctx.findingCode, ctx.title);
	const howToCorrect =
		ctx.correctiveText.trim() ||
		"(No separate How to correct text — guide from the finding condition.)";
	const capLine = ctx.capStatus
		? `Corrective action status: ${ctx.capStatus.replaceAll("_", " ")}${
				ctx.capTitle ? ` titled "${ctx.capTitle}"` : ""
			}.`
		: "No corrective action record yet. The user may need to confirm the finding or create a corrective action first.";

	return `AUDIT REMEDIATION CONTEXT (for non–Show-me-how turns only)
Finding: ${label}
How to correct: ${howToCorrect}
Condition: ${ctx.conditionText}
Severity: ${ctx.severity.replaceAll("_", " ")}.
${capLine}
IDs for tool calls (use these exact values — never invent or guess an id):
- findingId: ${ctx.findingId}
- documentId: ${ctx.documentId}
- capId: ${ctx.capId ?? "none"}
Do not give UI navigation plans or numbered “how to use CAALM” steps — Show me how uses live org-data research instead.
When the user asks to open Mark closed, paste a verification note into the close dialog, or mark closed with text you already provided, call prepare_close_corrective_action with the exact findingId, documentId, and capId above plus the verification note — never say you cannot click or interact with the page.`;
}
