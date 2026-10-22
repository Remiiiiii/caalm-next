"use client";

import { ChevronRight, StickyNote } from "lucide-react";
import { AppDialog } from "@/components/ui/app-dialog";
import type { Note } from "@/lib/actions/notes.actions";
import { formatTimeForDisplay } from "@/lib/calendar/eventDisplayFormat";

function stripHtml(html: string): string {
	if (typeof document === "undefined") {
		return html
			.replace(/<[^>]*>/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}
	const tmp = document.createElement("div");
	tmp.innerHTML = html;
	return (tmp.textContent || tmp.innerText || "").trim();
}

function truncateBody(html: string, maxWords = 18): string {
	const plain = stripHtml(html);
	if (!plain) return "";
	const words = plain.split(/\s+/).filter(Boolean);
	if (words.length <= maxWords) return plain;
	return `${words.slice(0, maxWords).join(" ")}...`;
}

export function CalendarPinnedNotesListDialog({
	open,
	onOpenChange,
	date,
	notes,
	onSelectNote,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	date: Date | null;
	notes: Note[];
	onSelectNote: (note: Note) => void;
}) {
	const heading = date
		? date.toLocaleDateString("en-US", {
				weekday: "long",
				month: "short",
				day: "numeric",
			})
		: "Pinned notes";

	const noteCountLabel =
		notes.length === 1 ? "1 note" : `${notes.length} notes`;

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-w-[600px]"
			icon={<StickyNote className="h-5 w-5" />}
			title={heading}
			description={`Notes for this day · ${noteCountLabel}`}
		>
			<div className="pb-1">
				{notes.map((note, index) => {
					const body = truncateBody(note.content);
					const isLast = index === notes.length - 1;
					return (
						<button
							key={note.$id}
							type="button"
							onClick={(e) => {
								e.currentTarget.blur();
								onSelectNote(note);
							}}
							className={`group flex w-full cursor-pointer items-stretch gap-3 rounded-lg px-3 py-3 text-left outline-none transition-all duration-200 hover:bg-blue-50/80 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 ${
								!isLast ? "border-b border-slate-200" : ""
							}`}
						>
							<div
								className="w-1 shrink-0 self-stretch rounded-full bg-transparent transition-colors group-hover:bg-[#0f5384]"
								aria-hidden
							/>
							<span className="w-16 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-slate-600">
								{note.calendarTime
									? formatTimeForDisplay(note.calendarTime)
									: "—"}
							</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold text-slate-700">
									{note.title || "Untitled note"}
								</p>
								{body ? (
									<p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
										{body}
									</p>
								) : (
									<p className="mt-0.5 text-xs italic text-slate-400">
										No details
									</p>
								)}
							</div>
							<ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-[#0f5384]" />
						</button>
					);
				})}
			</div>
		</AppDialog>
	);
}
