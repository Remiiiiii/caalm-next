"use client";

import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Note } from "@/lib/actions/notes.actions";
import { formatTimeForDisplay } from "@/lib/calendar/eventDisplayFormat";

function stripHtml(html: string): string {
	if (typeof document === "undefined") {
		return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
					<div className="px-6">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f5384]">
							Notes for
						</p>
						<div className="mt-1 flex items-center gap-2">
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								{heading}
							</DialogTitle>
							<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
								{noteCountLabel}
							</span>
						</div>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
					{notes.map((note, index) => {
						const body = truncateBody(note.content);
						const isLast = index === notes.length - 1;
						return (
							<button
								key={note.$id}
								type="button"
								onClick={(e) => {
									// Drop focus so :focus styles don't look like a stuck hover
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
									<p className="truncate text-sm font-semibold text-slate-800">
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
			</DialogContent>
		</Dialog>
	);
}
