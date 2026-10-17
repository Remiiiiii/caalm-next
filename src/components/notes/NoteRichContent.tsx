"use client";

import { useMemo } from "react";
import { sanitizeNoteHtml } from "@/lib/sanitize-note-html";
import { cn } from "@/lib/utils";

export function NoteRichContent({
	html,
	className,
}: {
	html: string;
	className?: string;
}) {
	const clean = useMemo(() => sanitizeNoteHtml(html), [html]);

	return (
		<div
			className={cn("note-rich-content text-sm text-slate-700", className)}
			dangerouslySetInnerHTML={{ __html: clean }}
		/>
	);
}
