"use client";

import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AlertTriangle,
	Bold,
	Calendar,
	Edit,
	Info,
	Italic,
	List,
	ListOrdered,
	Loader2,
	MoreVertical,
	Save,
	SquareArrowOutUpRight,
	StickyNote,
	StickyNotePlus,
	Strikethrough,
	Trash2,
	Underline,
} from "lucide-react";
import React, { useState } from "react";
import {
	isNotePinDateTimeInPast,
	NOTE_PIN_PAST_TIME_ERROR,
	NoteCalendarPinFields,
	type NotePinMode,
} from "@/components/notes/NoteCalendarPinFields";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/hooks/useNotes";
import type { Note } from "@/lib/actions/notes.actions";

const outlineCancelClass =
	"rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";

interface QuickNotesWidgetProps {
	userId?: string;
	user?: {
		$id: string;
		name?: string;
		[key: string]: any;
	} | null;
	initialNotes?: Note[];
}

// Tiptap editor configuration
const editorExtensions = [
	StarterKit.configure({
		link: false, // Disable default link extension to avoid duplicate
		bulletList: {
			keepMarks: true,
			keepAttributes: false,
		},
		orderedList: {
			keepMarks: true,
			keepAttributes: false,
		},
	}),
	LinkExtension.configure({
		openOnClick: false,
		HTMLAttributes: {
			class: "text-blue-500 underline cursor-pointer",
		},
	}),
	Placeholder.configure({
		placeholder: "Take a note...",
	}),
];

// Toolbar component for Tiptap editor (footer version)
const EditorToolbar = ({ editor }: { editor: any }) => {
	if (!editor) return null;

	return (
		<div className="flex items-center gap-2">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleBold().run()}
				className={`h-6 w-6 p-0 ${
					editor.isActive("bold") ? "bg-slate-200" : ""
				}`}
				title="Bold"
			>
				<Bold className="h-3 w-3" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleItalic().run()}
				className={`h-6 w-6 p-0 ${
					editor.isActive("italic") ? "bg-slate-200" : ""
				}`}
				title="Italic"
			>
				<Italic className="h-3 w-3" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleUnderline().run()}
				className={`h-6 w-6 p-0 ${
					editor.isActive("underline") ? "bg-slate-200" : ""
				}`}
				title="Underline"
			>
				<Underline className="h-3 w-3" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleStrike().run()}
				className={`h-6 w-6 p-0 ${
					editor.isActive("strike") ? "bg-slate-200" : ""
				}`}
				title="Strikethrough"
			>
				<Strikethrough className="h-3 w-3" />
			</Button>
			<div className="w-px h-4 bg-slate-300 mx-0.5" />
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				className={`h-6 w-6 p-0 ${
					editor.isActive("bulletList") ? "bg-slate-200" : ""
				}`}
				title="Bullet List"
			>
				<List className="h-3 w-3" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				className={`h-6 w-6 p-0 ${
					editor.isActive("orderedList") ? "bg-slate-200" : ""
				}`}
				title="Numbered List"
			>
				<ListOrdered className="h-3 w-3" />
			</Button>
		</div>
	);
};

const QuickNotesWidget: React.FC<QuickNotesWidgetProps> = ({
	userId,
	user,
	initialNotes,
}) => {
	const { toast } = useToast();
	const {
		notes,
		isLoading: loading,
		error,
		createNote,
		updateNote,
		deleteNote,
	} = useNotes({
		userId: userId || user?.$id || "default",
		enableRealTime: true,
		pollingInterval: 30000,
		initialNotes,
		skipInitialFetch: initialNotes !== undefined,
	});

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isAllNotesDialogOpen, setIsAllNotesDialogOpen] = useState(false);
	const [selectedNote, setSelectedNote] = useState<Note | null>(null);
	/** Only this note shows edit/delete — avoids parent `group-hover` lighting up every row */
	const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

	// Form state
	const [newNote, setNewNote] = useState({ title: "", content: "" });
	const [editNote, setEditNote] = useState({ title: "", content: "" });
	const [createPinMode, setCreatePinMode] = useState<NotePinMode>("dashboard");
	const [createPinDate, setCreatePinDate] = useState("");
	const [createPinTime, setCreatePinTime] = useState("09:00");
	const [editPinMode, setEditPinMode] = useState<NotePinMode>("dashboard");
	const [editPinDate, setEditPinDate] = useState("");
	const [editPinTime, setEditPinTime] = useState("09:00");
	const [isClient, setIsClient] = useState(false);

	// Set client state on mount
	React.useEffect(() => {
		setIsClient(true);
	}, []);

	// Tiptap editors - only initialize on client side
	const newNoteEditor = useEditor(
		{
			extensions: editorExtensions,
			content: newNote.content,
			immediatelyRender: false,
			onUpdate: ({ editor }) => {
				setNewNote((prev) => ({ ...prev, content: editor.getHTML() }));
			},
			editorProps: {
				attributes: {
					class:
						"prose prose-sm note-rich-content max-w-none focus:outline-none",
				},
			},
		},
		[isClient],
	);

	const editNoteEditor = useEditor(
		{
			extensions: editorExtensions,
			content: editNote.content,
			immediatelyRender: false,
			onUpdate: ({ editor }) => {
				setEditNote((prev) => ({ ...prev, content: editor.getHTML() }));
			},
			editorProps: {
				attributes: {
					class:
						"prose prose-sm note-rich-content max-w-none focus:outline-none",
				},
			},
		},
		[isClient],
	);

	// Update editor content when state changes
	React.useEffect(() => {
		if (newNoteEditor && newNote.content !== newNoteEditor.getHTML()) {
			newNoteEditor.commands.setContent(newNote.content);
		}
	}, [newNote.content, newNoteEditor]);

	React.useEffect(() => {
		if (editNoteEditor && editNote.content !== editNoteEditor.getHTML()) {
			editNoteEditor.commands.setContent(editNote.content);
		}
	}, [editNote.content, editNoteEditor]);

	const handleCreateNote = async () => {
		if (!newNote.title.trim() || !newNote.content.trim()) return;
		if (createPinMode === "calendar" && (!createPinDate || !createPinTime)) {
			toast({
				title: "Date and time required",
				description: "Pick a day and time to pin this note on the calendar.",
				variant: "destructive",
			});
			return;
		}
		if (
			createPinMode === "calendar" &&
			isNotePinDateTimeInPast(createPinDate, createPinTime)
		) {
			toast({
				title: "Invalid time",
				description: NOTE_PIN_PAST_TIME_ERROR,
				variant: "destructive",
			});
			return;
		}

		try {
			await createNote({
				title: newNote.title.trim(),
				content: newNote.content.trim(),
				userName: user?.name || "",
				calendarDate: createPinMode === "calendar" ? createPinDate : null,
				calendarTime: createPinMode === "calendar" ? createPinTime : null,
			});

			setNewNote({ title: "", content: "" });
			setCreatePinMode("dashboard");
			setCreatePinDate("");
			setCreatePinTime("09:00");
			setIsCreateDialogOpen(false);

			toast({
				title: "Success",
				description: "Note created successfully",
			});
		} catch (_err) {
			toast({
				title: "Error",
				description: "Failed to create note",
				variant: "destructive",
			});
		}
	};

	const handleEditNote = async () => {
		if (!selectedNote || !editNote.title.trim() || !editNote.content.trim())
			return;
		if (editPinMode === "calendar" && (!editPinDate || !editPinTime)) {
			toast({
				title: "Date and time required",
				description: "Pick a day and time to pin this note on the calendar.",
				variant: "destructive",
			});
			return;
		}
		if (
			editPinMode === "calendar" &&
			isNotePinDateTimeInPast(editPinDate, editPinTime)
		) {
			toast({
				title: "Invalid time",
				description: NOTE_PIN_PAST_TIME_ERROR,
				variant: "destructive",
			});
			return;
		}

		try {
			await updateNote({
				noteId: selectedNote.$id,
				title: editNote.title.trim(),
				content: editNote.content.trim(),
				calendarDate: editPinMode === "calendar" ? editPinDate : null,
				calendarTime: editPinMode === "calendar" ? editPinTime : null,
			});

			setSelectedNote(null);
			setEditNote({ title: "", content: "" });
			setEditPinMode("dashboard");
			setEditPinDate("");
			setEditPinTime("09:00");
			setIsEditDialogOpen(false);

			toast({
				title: "Success",
				description: "Note updated successfully",
			});
		} catch (_err) {
			toast({
				title: "Error",
				description: "Failed to update note",
				variant: "destructive",
			});
		}
	};

	const handleDeleteNote = async () => {
		if (!selectedNote) return;

		try {
			await deleteNote(selectedNote.$id);
			setSelectedNote(null);
			setIsDeleteDialogOpen(false);

			toast({
				title: "Success",
				description: "Note deleted successfully",
			});
		} catch (_err) {
			toast({
				title: "Error",
				description: "Failed to delete note",
				variant: "destructive",
			});
		}
	};

	const openEditDialog = (note: Note) => {
		setSelectedNote(note);
		setEditNote({ title: note.title, content: note.content });
		const pinned = Boolean(note.calendarDate && note.calendarTime);
		setEditPinMode(pinned ? "calendar" : "dashboard");
		setEditPinDate(note.calendarDate || "");
		setEditPinTime(note.calendarTime || "09:00");
		setIsEditDialogOpen(true);
	};

	const openDeleteDialog = (note: Note) => {
		setSelectedNote(note);
		setIsDeleteDialogOpen(true);
	};

	// Helper function to strip HTML tags for display
	const stripHtml = (html: string) => {
		const tmp = document.createElement("div");
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || "";
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const formatNoteTimestamp = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const time = date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});
		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const startOfNoteDay = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
		);
		const dayDiff = Math.round(
			(startOfToday.getTime() - startOfNoteDay.getTime()) / 86_400_000,
		);
		if (dayDiff === 0) return `Today, ${time}`;
		if (dayDiff === 1) return `Yesterday, ${time}`;
		return `${date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		})}, ${time}`;
	};

	const truncateContent = (content: string, maxWords: number = 10) => {
		const plainText = stripHtml(content).trim();
		const words = plainText.split(/\s+/).filter(Boolean);
		if (words.length <= maxWords) return plainText;
		return `${words.slice(0, maxWords).join(" ")}...`;
	};

	// Sort notes by updated date (most recent first)
	const sortedNotes = [...notes].sort(
		(a, b) =>
			new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime(),
	);

	if (loading) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<div className="flex items-center gap-2">
						<StickyNote className="h-4 w-4 text-slate-600" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							Quick Notes
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-2 flex items-center justify-center h-full">
					<div className="flex flex-col items-center gap-2 text-sm text-slate-500">
						<Loader2 className="h-6 w-6 animate-spin text-[#0f5384]" />
						Loading notes...
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4 text-red" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							Quick Notes
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-2 flex flex-col items-center justify-center h-full">
					<div className="text-sm text-red text-center mb-2">
						Failed to load notes
					</div>
					<div className="text-xs text-slate-500 text-center">{error}</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				{/* Header */}
				<CardHeader className="pb-1 pt-2 px-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<StickyNote className="h-4 w-4 text-slate-600" />
							<CardTitle className="text-sm font-semibold sidebar-gradient-text">
								Quick Notes
							</CardTitle>
						</div>
						<div className="flex items-center gap-0.5">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsCreateDialogOpen(true)}
								className="h-6 w-6 p-0 hover:bg-white/40"
								aria-label="Create note"
							>
								<StickyNotePlus className="h-3.5 w-3.5 text-[#0f5384]" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsAllNotesDialogOpen(true)}
								className="h-6 w-6 p-0 hover:bg-white/40"
								aria-label="View all notes"
							>
								<SquareArrowOutUpRight className="h-3.5 w-3.5 text-[#0f5384]" />
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="px-4 pb-2">
					{error ? (
						<div className="text-sm text-red text-center py-4">{error}</div>
					) : notes.length === 0 ? (
						<div className="text-center py-8">
							<StickyNotePlus className="h-8 w-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500 mb-3">No notes yet</p>
							<p className="text-xs text-slate-500">Create your first note</p>
						</div>
					) : (
						<div
							data-widget-scroll
							className="max-h-[220px] space-y-2 overflow-y-auto overscroll-contain scrollbar-hide"
						>
							{sortedNotes.map((note, index) => {
								const isHovered = hoveredNoteId === note.$id;
								return (
									<div key={note.$id}>
										<div
											className={`relative cursor-pointer rounded-lg border p-2 transition-all duration-200 ${
												isHovered
													? "border-blue-200 bg-blue-50"
													: "border-transparent bg-transparent"
											}`}
											onMouseEnter={() => setHoveredNoteId(note.$id)}
											onMouseLeave={() => setHoveredNoteId(null)}
											onClick={() => openEditDialog(note)}
										>
											{isHovered ? (
												<div className="absolute top-2 right-2 z-10 flex items-center gap-1">
													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															openEditDialog(note);
														}}
														className="h-5 w-5 p-0 text-[#0f5384] hover:bg-[#0f5384]/10 hover:text-[#0f5384]"
														aria-label={`Edit ${note.title || "note"}`}
													>
														<Edit className="h-3 w-3" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															openDeleteDialog(note);
														}}
														className="h-5 w-5 p-0 text-[#0f5384] hover:bg-[#0f5384]/10 hover:text-[#0f5384]"
														aria-label={`Delete ${note.title || "note"}`}
													>
														<Trash2 className="h-3 w-3" />
													</Button>
												</div>
											) : null}

											<div className="min-w-0">
												<div className="mt-1 flex items-center gap-1">
													<Calendar className="h-3 w-3 text-slate-400" />
													<span className="text-xs text-slate-400">
														{formatDate(note.$updatedAt)}
													</span>
													<span className="ml-2 text-xs text-slate-400">
														{new Date(note.$updatedAt).toLocaleTimeString()}
													</span>
													{note.calendarDate && note.calendarTime ? (
														<span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-[10px] text-blue">
															<Calendar className="h-2.5 w-2.5" />
															Calendar
														</span>
													) : null}
												</div>
												<h4 className="truncate py-1 pr-12 text-sm font-medium sidebar-gradient-text">
													{note.title}
												</h4>
												<p className="mt-1 text-xs leading-relaxed text-slate-600">
													{truncateContent(note.content)}
												</p>
											</div>
										</div>
										{sortedNotes.length > 1 &&
											index < sortedNotes.length - 1 && (
												<div className="my-2 h-px bg-slate-300" />
											)}
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<AppDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				size="form"
				className="max-w-150"
				icon={<StickyNotePlus className="h-5 w-5" />}
				title="New note"
				description="Capture a quick note for your dashboard"
				footer={
					<>
						<span className="mr-auto inline-flex items-center gap-1.5 text-sm text-slate-500">
							<Info className="h-3.5 w-3.5 shrink-0" />
							{stripHtml(newNote.content).trim()
								? "Ready to save"
								: "Add note content to save"}
						</span>
						<Button
							type="button"
							variant="outline"
							className={outlineCancelClass}
							onClick={() => setIsCreateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={() => void handleCreateNote()}
							disabled={
								!stripHtml(newNote.content).trim() ||
								(createPinMode === "calendar" &&
									isNotePinDateTimeInPast(createPinDate, createPinTime))
							}
							className="btn-primary"
						>
							<Save className="h-4 w-4" />
							Save
						</Button>
					</>
				}
			>
				<div className="space-y-4 pb-1">
					<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
						<Input
							value={newNote.title}
							onChange={(e) =>
								setNewNote((prev) => ({ ...prev, title: e.target.value }))
							}
							placeholder="Title"
							className="border-b border-slate-200 bg-transparent p-0 text-base font-medium shadow-none placeholder:text-slate-400 focus-visible:ring-0"
						/>
						<div className="min-h-[120px]">
							{isClient && <EditorContent editor={newNoteEditor} />}
							{!isClient && (
								<div className="flex min-h-[120px] flex-col items-center justify-center gap-2 p-2 text-slate-400">
									<Loader2 className="h-5 w-5 animate-spin text-slate-400" />
									Loading editor...
								</div>
							)}
						</div>
					</div>
					{isClient && (
						<div className="rounded-lg border border-slate-200 bg-white p-3">
							<EditorToolbar editor={newNoteEditor} />
						</div>
					)}
					<NoteCalendarPinFields
						mode={createPinMode}
						onModeChange={setCreatePinMode}
						date={createPinDate}
						time={createPinTime}
						onDateChange={setCreatePinDate}
						onTimeChange={setCreatePinTime}
					/>
				</div>
			</AppDialog>

			<AppDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				size="form"
				className="max-w-[600px]"
				icon={<Edit className="h-5 w-5" />}
				title="Edit note"
				description="Update your note details"
				footer={
					<>
						<span className="mr-auto inline-flex items-center gap-1.5 text-sm text-slate-500">
							<Info className="h-3.5 w-3.5 shrink-0" />
							{stripHtml(editNote.content).trim()
								? "Ready to update"
								: "Add note content to update"}
						</span>
						<Button
							type="button"
							variant="outline"
							className={outlineCancelClass}
							onClick={() => setIsEditDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={() => void handleEditNote()}
							disabled={
								!stripHtml(editNote.content).trim() ||
								(editPinMode === "calendar" &&
									isNotePinDateTimeInPast(editPinDate, editPinTime))
							}
							className="btn-primary"
						>
							<Save className="h-4 w-4" />
							Update
						</Button>
					</>
				}
			>
				<div className="space-y-4 pb-1">
					<div className="flex justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 w-8 p-0"
									title="More Options"
								>
									<MoreVertical className="h-4 w-4 text-[#0f5384]" />
								</Button>
							</DropdownMenuTrigger>
							<AppDropdownMenuContent align="end">
								<AppDropdownMenuItem
									icon={Trash2}
									tone="danger"
									onClick={() => openDeleteDialog(selectedNote!)}
								>
									Delete Note
								</AppDropdownMenuItem>
							</AppDropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
						<Input
							value={editNote.title}
							onChange={(e) =>
								setEditNote((prev) => ({ ...prev, title: e.target.value }))
							}
							placeholder="Title"
							className="border-b border-slate-200 bg-transparent p-0 text-base font-medium shadow-none placeholder:text-slate-400 focus-visible:ring-0"
						/>
						<div className="min-h-[120px]">
							{isClient && <EditorContent editor={editNoteEditor} />}
							{!isClient && (
								<div className="flex min-h-[120px] flex-col items-center justify-center gap-2 p-2 text-slate-400">
									<Loader2 className="h-5 w-5 animate-spin text-slate-400" />
									Loading editor...
								</div>
							)}
						</div>
					</div>
					{isClient && (
						<div className="rounded-lg border border-slate-200 bg-white p-3">
							<EditorToolbar editor={editNoteEditor} />
						</div>
					)}
					<NoteCalendarPinFields
						mode={editPinMode}
						onModeChange={setEditPinMode}
						date={editPinDate}
						time={editPinTime}
						onDateChange={setEditPinDate}
						onTimeChange={setEditPinTime}
					/>
				</div>
			</AppDialog>

			<ConfirmDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				variant="destructive"
				icon={<Trash2 className="h-5 w-5" />}
				title="Delete note?"
				description="This action cannot be undone."
				facts={
					selectedNote
						? [
								...(selectedNote.title
									? [{ label: "Title", value: selectedNote.title }]
									: []),
								{
									label: "Created",
									value: new Date(selectedNote.$createdAt).toLocaleDateString(
										"en-US",
										{
											year: "numeric",
											month: "short",
											day: "numeric",
										},
									),
								},
							]
						: undefined
				}
				note="This will permanently remove the note from your collection."
				confirmLabel="Delete Note"
				confirmIcon={<Trash2 className="h-4 w-4" />}
				onConfirm={async () => {
					if (!selectedNote) return;
					await deleteNote(selectedNote.$id);
					setSelectedNote(null);
					toast({
						title: "Success",
						description: "Note deleted successfully",
					});
				}}
			/>

			<AppDialog
				open={isAllNotesDialogOpen}
				onOpenChange={setIsAllNotesDialogOpen}
				size="form"
				className="max-h-[90vh] max-w-[600px]"
				icon={<StickyNote className="h-5 w-5" />}
				title="All Notes"
				description={`Browse and open any note from your dashboard (${notes.length} ${notes.length === 1 ? "note" : "notes"})`}
				footer={
					<Button
						type="button"
						className="btn-primary px-3 sm:px-4"
						onClick={() => {
							setIsAllNotesDialogOpen(false);
							setIsCreateDialogOpen(true);
						}}
					>
						<StickyNotePlus className="h-4 w-4" />
						New note
					</Button>
				}
			>
					<div className="-mx-6 space-y-2 bg-slate-50 px-6 pb-1">
						{sortedNotes.length === 0 ? (
							<div className="py-8 text-center">
								<StickyNotePlus className="mx-auto mb-2 h-8 w-8 text-slate-300" />
								<p className="text-sm text-slate-500">No notes yet</p>
							</div>
						) : (
							sortedNotes.map((note) => (
								<div
									key={note.$id}
									role="button"
									tabIndex={0}
									onClick={() => {
										setIsAllNotesDialogOpen(false);
										openEditDialog(note);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											setIsAllNotesDialogOpen(false);
											openEditDialog(note);
										}
									}}
									className="group w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="truncate text-sm font-semibold text-slate-700">
													{note.title || "Untitled note"}
												</p>
												{note.calendarDate && note.calendarTime ? (
													<span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-[10px] text-blue">
														<Calendar className="h-2.5 w-2.5" />
														Calendar
													</span>
												) : null}
											</div>
											<p className="mt-0.5 text-xs text-slate-500">
												{formatNoteTimestamp(note.$updatedAt)}
											</p>
											<p className="mt-1 text-xs leading-relaxed text-slate-600">
												{truncateContent(note.content) || (
													<span className="italic text-slate-400">
														No details
													</span>
												)}
											</p>
										</div>
										<div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													setIsAllNotesDialogOpen(false);
													openEditDialog(note);
												}}
												className="h-7 w-7 p-0 text-slate-500 hover:bg-white hover:text-slate-700"
												aria-label={`Edit ${note.title || "note"}`}
											>
												<Edit className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													setIsAllNotesDialogOpen(false);
													openDeleteDialog(note);
												}}
												className="h-7 w-7 p-0 text-slate-500 hover:bg-red/10 hover:text-red"
												aria-label={`Delete ${note.title || "note"}`}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
			</AppDialog>

			{/* Custom styles */}
			<style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Tiptap editor styling to match modal theme */
        .ProseMirror {
          outline: none !important;
          padding: 0 !important;
          min-height: 100px !important;
          background: transparent !important;
          color: inherit !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }

        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }

        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }

        .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }

        .ProseMirror ul {
          list-style-type: disc;
          list-style-position: outside;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }

        .ProseMirror ol {
          list-style-type: decimal;
          list-style-position: outside;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }

        .ProseMirror li {
          display: list-item;
          margin: 0.25rem 0;
        }

        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }

        .ProseMirror strong {
          font-weight: 600;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror u {
          text-decoration: underline;
        }

        .ProseMirror s {
          text-decoration: line-through;
        }
      `}</style>
		</>
	);
};

export default QuickNotesWidget;
