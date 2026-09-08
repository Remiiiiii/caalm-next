import type {
	AnchorType,
	AuthorType,
	CommentStatus,
	CommentVisibility,
} from "./constants";
import { parseNegotiationDocument } from "./document-model";

export interface NegotiationCommentDraft {
	$id?: string;
	contractId: string;
	orgId: string;
	versionId: string;
	anchorType: AnchorType;
	anchorStart: number;
	anchorEnd: number;
	body: string;
	authorType: AuthorType;
	authorId: string;
	authorEmail: string;
	/** Display-only; resolved at list/create time (not always stored). */
	authorName?: string;
	status: CommentStatus;
	redlineProposal: string;
	visibility: CommentVisibility;
}

/** Turn an email local-part into a readable name when we have no profile name. */
export function displayNameFromEmail(email: string): string {
	const local = email.trim().split("@")[0] || "";
	const parts = local.split(/[._+-]+/).filter(Boolean);
	if (parts.length === 0) return "";
	return parts
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join(" ");
}

export function buildComment(input: {
	contractId: string;
	orgId: string;
	versionId: string;
	body: string;
	anchorType?: AnchorType;
	anchorStart?: number;
	anchorEnd?: number;
	authorType?: AuthorType;
	authorId?: string;
	authorEmail?: string;
	authorName?: string;
	redlineProposal?: string;
	visibility?: CommentVisibility;
}): NegotiationCommentDraft {
	const body = input.body.trim();
	if (!body) {
		throw new Error("Comment body is required");
	}
	const start = Math.max(0, input.anchorStart ?? 0);
	const end = Math.max(start, input.anchorEnd ?? start);
	// Paragraph/selection comments need a real span so redlines land on the right text.
	if (end <= start) {
		throw new Error("Select a paragraph before commenting");
	}
	const authorEmail = input.authorEmail || "";
	const authorName =
		(input.authorName || "").trim() ||
		displayNameFromEmail(authorEmail) ||
		undefined;
	return {
		contractId: input.contractId,
		orgId: input.orgId,
		versionId: input.versionId,
		anchorType: input.anchorType || "paragraph",
		anchorStart: start,
		anchorEnd: end,
		body,
		authorType: input.authorType || "internal",
		authorId: input.authorId || "",
		authorEmail,
		authorName,
		status: "open",
		redlineProposal: (input.redlineProposal || "").trim(),
		// Internal-only comments stay hidden from counterparty token views.
		visibility: input.visibility === "internal" ? "internal" : "shared",
	};
}

/** Swap the selected span for the proposed replacement text. */
export function assertRedlineAnchorAllowed(
	extractedText: string,
	anchorStart: number,
	anchorEnd: number,
): void {
	const paragraph = parseNegotiationDocument(
		extractedText,
	).negotiableParagraphs.find(
		(row) => anchorStart < row.end && anchorEnd > row.start,
	);
	if (!paragraph) {
		throw new Error("Redline must target negotiable contract text");
	}
	if (
		paragraph.redlineAllowed === false ||
		anchorStart < (paragraph.protectedEnd ?? paragraph.start)
	) {
		throw new Error(
			"Wizard labels and defined structural terms cannot be redlined",
		);
	}
}

/** Swap the selected span for the proposed replacement text. */
export function applyRedline(
	extractedText: string,
	comment: Pick<NegotiationCommentDraft, "anchorStart" | "anchorEnd" | "redlineProposal">,
): string {
	const proposal = comment.redlineProposal.trim();
	if (!proposal) {
		throw new Error("Redline proposal is empty");
	}
	const start = Math.max(0, comment.anchorStart);
	const end = Math.min(extractedText.length, Math.max(start, comment.anchorEnd));
	assertRedlineAnchorAllowed(extractedText, start, end);
	return `${extractedText.slice(0, start)}${proposal}${extractedText.slice(end)}`;
}

export function countOpenComments(
	comments: Array<{ status?: string }>,
): number {
	return comments.filter((row) => (row.status || "open") === "open").length;
}

export function canSendForReview(input: {
	openCommentCount: number;
	hasApprovePermission: boolean;
}): { ok: boolean; reason?: string } {
	if (input.openCommentCount === 0) return { ok: true };
	if (input.hasApprovePermission) return { ok: true };
	return {
		ok: false,
		reason: "Resolve open comments before sending for review",
	};
}
