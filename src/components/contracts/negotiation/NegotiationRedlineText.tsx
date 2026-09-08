"use client";

import { renderNegotiationInlineText } from "@/lib/contracts/negotiation/display-text";
import type { RedlineSegment } from "@/lib/contracts/negotiation/redline-render";

interface NegotiationRedlineTextProps {
	segments: RedlineSegment[];
}

/** Paragraph text with inline strikethrough/underline redlines (author badge sits above). */
export function NegotiationRedlineText({
	segments,
}: NegotiationRedlineTextProps) {
	return (
		<>
			{segments.map((segment, index) => {
				const key = `${segment.kind}-${index}`;
				if (segment.kind === "removed") {
					return (
						<del key={key} className="negotiate-redline-del no-underline">
							{renderNegotiationInlineText(segment.text)}
						</del>
					);
				}
				if (segment.kind === "added") {
					return (
						<ins key={key} className="negotiate-redline-ins">
							{renderNegotiationInlineText(segment.text)}
						</ins>
					);
				}
				return (
					<span key={key}>{renderNegotiationInlineText(segment.text)}</span>
				);
			})}
		</>
	);
}

/** Prefer counterparty when a paragraph has mixed authors. */
export function redlineAuthorLabel(
	segments: RedlineSegment[],
): "counterparty" | "internal" | null {
	const authors = segments
		.filter((segment) => segment.kind === "added" || segment.kind === "removed")
		.map((segment) => segment.authorType)
		.filter((value): value is "internal" | "counterparty" => Boolean(value));
	if (authors.length === 0) return null;
	if (authors.includes("counterparty")) return "counterparty";
	return "internal";
}
