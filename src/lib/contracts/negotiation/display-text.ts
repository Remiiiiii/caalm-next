/**
 * Soften markdown for the negotiate pane.
 * Offsets still come from the raw extractedText — this is display-only.
 *
 * Defined terms keep **bold** markers so the UI can render them as <strong>.
 */

import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

/** Plain string for snippets/quotes — strips headings, keeps bullet markers readable. */
export function formatNegotiationParagraphDisplay(paragraph: string): string {
	return paragraph
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/^[-*]\s+/gm, "• ")
		.trim();
}

/**
 * Turn a raw snapshot span into React nodes with **defined terms** as bold.
 * Does not strip bold — legally significant terms must stay visually distinct.
 */
export function renderNegotiationInlineText(text: string): ReactNode {
	const cleaned = text.replace(/^#{1,6}\s+/gm, "").replace(/^[-*]\s+/gm, "• ");
	const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
	return createElement(
		Fragment,
		null,
		...parts.map((part, index) => {
			const bold = /^\*\*(.+)\*\*$/.exec(part);
			if (bold) {
				return createElement(
					"strong",
					{ key: index, className: "font-semibold text-slate-800" },
					bold[1],
				);
			}
			return createElement(Fragment, { key: index }, part);
		}),
	);
}
