/**
 * Inline redline segments for a paragraph: the anchored span renders as
 * strikethrough, the proposal as an underlined insertion, tagged by author.
 */

import type { NegotiationComment } from "./comments.service";
import type { DocumentParagraph } from "./document-model";

export interface RedlineSegment {
	kind: "text" | "removed" | "added";
	text: string;
	authorType?: "internal" | "counterparty";
	commentId?: string;
}

function overlaps(comment: NegotiationComment, p: DocumentParagraph): boolean {
	return comment.anchorStart < p.end && comment.anchorEnd > p.start;
}

/** Open redline comments anchored inside this paragraph, in document order. */
export function redlinesForParagraph(
	paragraph: DocumentParagraph,
	comments: NegotiationComment[],
): NegotiationComment[] {
	return comments
		.filter(
			(comment) =>
				comment.status === "open" &&
				comment.redlineProposal.trim() &&
				overlaps(comment, paragraph),
		)
		.sort((a, b) => a.anchorStart - b.anchorStart);
}

/** All comments (any status) anchored to this paragraph. */
export function commentsForParagraph(
	paragraph: DocumentParagraph,
	comments: NegotiationComment[],
): NegotiationComment[] {
	return comments.filter((comment) => overlaps(comment, paragraph));
}

/**
 * Cut the paragraph into text / removed / added segments. Overlapping
 * proposals keep the first and skip the rest so the text never doubles.
 */
export function buildRedlineSegments(
	paragraph: DocumentParagraph,
	comments: NegotiationComment[],
): RedlineSegment[] {
	if (paragraph.redlineAllowed === false) {
		return [{ kind: "text", text: paragraph.text }];
	}
	const redlines = redlinesForParagraph(paragraph, comments);
	if (redlines.length === 0) {
		return [{ kind: "text", text: paragraph.text }];
	}

	const segments: RedlineSegment[] = [];
	let cursor = paragraph.start;
	for (const comment of redlines) {
		const editableStart = paragraph.protectedEnd ?? paragraph.start;
		const start = Math.max(editableStart, comment.anchorStart);
		const end = Math.min(paragraph.end, comment.anchorEnd);
		if (start < cursor || end <= start) continue; // overlap — skip
		if (start > cursor) {
			segments.push({
				kind: "text",
				text: paragraph.text.slice(
					cursor - paragraph.start,
					start - paragraph.start,
				),
			});
		}
		segments.push({
			kind: "removed",
			text: paragraph.text.slice(
				start - paragraph.start,
				end - paragraph.start,
			),
			authorType: comment.authorType,
			commentId: comment.$id,
		});
		segments.push({
			kind: "added",
			text: comment.redlineProposal,
			authorType: comment.authorType,
			commentId: comment.$id,
		});
		cursor = end;
	}
	if (cursor < paragraph.end) {
		segments.push({
			kind: "text",
			text: paragraph.text.slice(cursor - paragraph.start),
		});
	}
	return segments;
}

export interface ParagraphMarker {
	paragraphStart: number;
	number: number;
	commentIds: string[];
}

/**
 * Number open-comment markers in document order (1, 2, …) so the doc pane
 * and the thread list can cross-link.
 */
export function buildParagraphMarkers(
	paragraphs: DocumentParagraph[],
	comments: NegotiationComment[],
): ParagraphMarker[] {
	const markers: ParagraphMarker[] = [];
	let number = 0;
	for (const paragraph of paragraphs) {
		const open = comments.filter(
			(comment) => comment.status === "open" && overlaps(comment, paragraph),
		);
		if (open.length === 0) continue;
		number += 1;
		markers.push({
			paragraphStart: paragraph.start,
			number,
			commentIds: open.map((comment) => comment.$id),
		});
	}
	return markers;
}
