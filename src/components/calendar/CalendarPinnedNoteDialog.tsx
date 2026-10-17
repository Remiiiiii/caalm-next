"use client";

import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Clock,
	Pencil,
	Save,
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NoteRichContent } from "@/components/notes/NoteRichContent";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Input } from "@/components/ui/input";
import type { Note } from "@/lib/actions/notes.actions";
import { updateNote } from "@/lib/actions/notes.actions";
import { formatTimeForDisplay } from "@/lib/calendar/eventDisplayFormat";
import { sanitizeNoteHtml } from "@/lib/sanitize-note-html";

function formatPinDateLong(date: string): string {
	const [year, month, day] = date.split("-").map(Number);
	if (!year || !month || !day) return date;
	return new Date(year, month - 1, day).toLocaleDateString("en-US", {
		weekday: "long",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatPinnedBadgeDate(date: string): string {
	const [year, month, day] = date.split("-").map(Number);
	if (!year || !month || !day) return date;
	return new Date(year, month - 1, day).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function CalendarPinnedNoteDialog({
	open,
	onOpenChange,
	note,
	notes,
	onBackToList,
	onSelectNote,
	onNoteUpdated,
	onDelete,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	note: Note | null;
	notes: Note[];
	onBackToList: () => void;
	onSelectNote: (note: Note) => void;
	onNoteUpdated: (note: Note) => void;
	onDelete: (note: Note) => void | Promise<void>;
}) {
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const editBodyRef = useRef<HTMLDivElement>(null);

	const noteIndex = useMemo(() => {
		if (!note) return -1;
		return notes.findIndex((n) => n.$id === note.$id);
	}, [note, notes]);

	const currentNote =
		noteIndex >= 0 ? (notes[noteIndex] ?? note) : note;

	useEffect(() => {
		if (!open) {
			setIsDeleteOpen(false);
			setIsEditing(false);
		}
	}, [open]);

	useEffect(() => {
		setIsEditing(false);
	}, [currentNote?.$id]);

	if (!currentNote) return null;

	const total = notes.length || 1;
	const displayIndex = noteIndex >= 0 ? noteIndex + 1 : 1;
	const timeLabel = currentNote.calendarTime
		? formatTimeForDisplay(currentNote.calendarTime)
		: "";
	const dateLabel = currentNote.calendarDate
		? formatPinDateLong(currentNote.calendarDate)
		: "";
	const pinBadgeDate = currentNote.calendarDate
		? formatPinnedBadgeDate(currentNote.calendarDate)
		: "";

	const goPrev = () => {
		if (notes.length < 2 || noteIndex < 0 || isEditing) return;
		const prev = notes[(noteIndex - 1 + notes.length) % notes.length];
		if (prev) onSelectNote(prev);
	};

	const goNext = () => {
		if (notes.length < 2 || noteIndex < 0 || isEditing) return;
		const next = notes[(noteIndex + 1) % notes.length];
		if (next) onSelectNote(next);
	};

	const startEditing = () => {
		setEditTitle(currentNote.title || "");
		setIsEditing(true);
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const rawHtml = editBodyRef.current?.innerHTML || "";
			const updated = await updateNote({
				noteId: currentNote.$id,
				title: editTitle.trim() || "Untitled note",
				content: sanitizeNoteHtml(rawHtml),
			});
			onNoteUpdated(updated);
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	};

	const handleConfirmDelete = async () => {
		setIsDeleting(true);
		try {
			await onDelete(currentNote);
			setIsDeleteOpen(false);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
					<div className="absolute top-0 left-0 right-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
					<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3">
						<div className="flex items-center justify-between gap-3">
							<button
								type="button"
								onClick={() => {
									if (isEditing) {
										setIsEditing(false);
										return;
									}
									onBackToList();
								}}
								className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-[#0f5384] transition-colors hover:text-[#0c4269]"
							>
								<ChevronLeft className="h-4 w-4" />
								{isEditing ? "Cancel edit" : "All notes"}
							</button>
							{!isEditing && total > 1 ? (
								<div className="flex items-center gap-1 text-sm text-slate-500">
									<button
										type="button"
										onClick={goPrev}
										className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600"
										aria-label="Previous note"
									>
										<ChevronLeft className="h-4 w-4" />
									</button>
									<span className="min-w-14 text-center tabular-nums">
										{displayIndex} of {total}
									</span>
									<button
										type="button"
										onClick={goNext}
										className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600"
										aria-label="Next note"
									>
										<ChevronRight className="h-4 w-4" />
									</button>
								</div>
							) : null}
						</div>
					</div>

					<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
						{isEditing ? (
							<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
								<DialogTitle className="sr-only">Edit note</DialogTitle>
								<Input
									value={editTitle}
									onChange={(e) => setEditTitle(e.target.value)}
									placeholder="Title"
									className="border-[0.25px] border-slate-300 text-base font-semibold"
								/>
								{/* contentEditable keeps rich note HTML editable without a full TipTap mount */}
								<div
									key={currentNote.$id}
									ref={editBodyRef}
									contentEditable
									suppressContentEditableWarning
									className="note-rich-content min-h-[160px] rounded-md border-[0.25px] border-slate-300 p-3 text-sm text-slate-700 outline-none focus-visible:border-[#078FAB]"
									dangerouslySetInnerHTML={{
										__html: sanitizeNoteHtml(currentNote.content),
									}}
								/>
							</div>
						) : (
							<>
								<DialogTitle className="text-2xl font-semibold text-slate-800">
									{currentNote.title || "Untitled note"}
								</DialogTitle>
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<p className="flex items-center gap-1.5 text-sm text-slate-500">
										<Clock className="h-3.5 w-3.5 shrink-0" />
										{dateLabel}
										{timeLabel ? ` · ${timeLabel}` : ""}
									</p>
									{pinBadgeDate ? (
										<span className="inline-flex items-center gap-1 rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-[#0f5384]">
											<Calendar className="h-3 w-3" />
											Pinned to {pinBadgeDate}
										</span>
									) : null}
								</div>
								<div className="mt-4 border-t border-slate-200 pt-4">
									<div className="rounded-lg border border-slate-200 bg-white p-4">
										<NoteRichContent html={currentNote.content} />
									</div>
								</div>
							</>
						)}
					</div>

					<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
						{isEditing ? (
							<Button
								className="btn-primary px-3 sm:px-4"
								onClick={handleSave}
								disabled={isSaving}
							>
								<Save className="h-4 w-4" />
								{isSaving ? "Saving..." : "Save"}
							</Button>
						) : (
							<>
								<Button
									className="btn-primary px-3 sm:px-4"
									onClick={startEditing}
								>
									<Pencil className="h-4 w-4" />
									Edit note
								</Button>
								<Button
									type="button"
									onClick={() => setIsDeleteOpen(true)}
									className="delete-btn px-3 sm:px-4"
								>
									<Trash2 className="h-4 w-4" />
									Delete
								</Button>
							</>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<DeleteConfirmationDialog
				open={isDeleteOpen}
				onOpenChange={setIsDeleteOpen}
				title="Delete note?"
				description="This permanently removes the note from your dashboard and calendar."
				itemName={currentNote.title || "Untitled note"}
				itemNoun="note"
				isLoading={isDeleting}
				onConfirm={handleConfirmDelete}
			/>
		</>
	);
}
