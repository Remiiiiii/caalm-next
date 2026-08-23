"use client";

import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AlertTriangle,
	Ban,
	Bold,
	Calendar,
	Edit,
	Italic,
	List,
	ListOrdered,
	Loader2,
	MoreVertical,
	Plus,
	Save,
	StickyNote,
	Strikethrough,
	Trash2,
	Underline,
} from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

// VisuallyHidden component for accessibility
const VisuallyHidden = ({
	children,
	...props
}: {
	children: React.ReactNode;
	asChild?: boolean;
}) => (
	<span className="sr-only" {...props}>
		{children}
	</span>
);

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuickNotesWidgetProps {
	userId?: string;
	user?: {
		$id: string;
		name?: string;
		[key: string]: any;
	} | null;
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
	});

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedNote, setSelectedNote] = useState<Note | null>(null);

	// Form state
	const [newNote, setNewNote] = useState({ title: "", content: "" });
	const [editNote, setEditNote] = useState({ title: "", content: "" });
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
					class: "prose prose-sm max-w-none focus:outline-none",
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
					class: "prose prose-sm max-w-none focus:outline-none",
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

		try {
			await createNote({
				title: newNote.title.trim(),
				content: newNote.content.trim(),
			});

			setNewNote({ title: "", content: "" });
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

		try {
			await updateNote({
				noteId: selectedNote.$id,
				title: editNote.title.trim(),
				content: editNote.content.trim(),
			});

			setSelectedNote(null);
			setEditNote({ title: "", content: "" });
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

	const truncateContent = (content: string, maxWords: number = 25) => {
		// Strip HTML tags first, then truncate
		const plainText = stripHtml(content);
		const words = plainText.split(" ");
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
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
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
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
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
				<CardHeader className="pb-1 pt-6 px-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<StickyNote className="h-4 w-4 text-slate-600" />
							<CardTitle className="text-sm font-semibold sidebar-gradient-text">
								Quick Notes
							</CardTitle>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsCreateDialogOpen(true)}
							className="h-6 w-6 p-0 hover:bg-white/40"
						>
							<Plus className="h-3 w-3" />
						</Button>
					</div>
				</CardHeader>

				<CardContent className="px-4 pb-2">
					{error ? (
						<div className="text-sm text-red text-center py-4">{error}</div>
					) : notes.length === 0 ? (
						<div className="text-center py-8">
							<StickyNote className="h-8 w-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500 mb-3">No notes yet</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsCreateDialogOpen(true)}
								className="text-xs"
							>
								Create your first note
							</Button>
						</div>
					) : (
						<div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-hide">
							{sortedNotes.map((note, index) => (
								<div key={note.$id}>
									<div
										className="bg-white/20 rounded-lg p-2 cursor-pointer hover:bg-white/30 transition-colors border border-white/20 backdrop-blur-sm"
										onClick={() => openEditDialog(note)}
									>
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-44">
												<div className="flex items-center gap-1 mt-1">
													<Calendar className="h-3 w-3 text-slate-400" />
													<span className="text-xs text-slate-400">
														{formatDate(note.$updatedAt)}
													</span>
													<span className="text-xs text-slate-400 ml-2">
														{new Date(note.$updatedAt).toLocaleTimeString()}
													</span>
												</div>
												<h4 className="py-1 font-medium text-sm sidebar-gradient-text truncate">
													{note.title}
												</h4>
												<p className="text-xs text-slate-600 mt-1 leading-relaxed">
													{truncateContent(note.content)}
												</p>
											</div>
											<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														openEditDialog(note);
													}}
													className="h-5 w-5 p-0 hover:bg-white/60"
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
													className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600"
												>
													<Trash2 className="h-3 w-3" />
												</Button>
											</div>
										</div>
									</div>
									{/* Separator line between notes (only if multiple notes and not the last one) */}
									{sortedNotes.length > 1 && index < sortedNotes.length - 1 && (
										<div className="h-px bg-slate-300 my-2"></div>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Create Note Dialog */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
					<VisuallyHidden>
						<DialogTitle>Create New Note</DialogTitle>
					</VisuallyHidden>
					<div className="absolute top-0 left-0 right-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<div className="flex items-center gap-3">
								<Plus className="h-5 w-5 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									New Note
								</DialogTitle>
							</div>
						</div>
						<p className="ml-14 mt-1 text-sm text-slate-600">
							Capture a quick note for your dashboard
						</p>
					</div>
					<div className="glass-dialog-body-padded flex-1 space-y-4 overflow-y-auto">
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
					</div>
					<div className="glass-dialog-footer-wrap">
						<div className="flex items-center justify-between">
							<div className="text-xs text-slate-500">
								{stripHtml(newNote.content).trim()
									? "Ready to save"
									: "Add note content to save"}
							</div>
							<div className="flex items-center gap-3">
								<Button
									variant="outline"
									onClick={() => setIsCreateDialogOpen(false)}
									className="primary-btn px-3 sm:px-4"
								>
									<Ban className="h-4 w-4" />
									Cancel
								</Button>
								<Button
									onClick={handleCreateNote}
									disabled={!stripHtml(newNote.content).trim()}
									className="primary-btn px-3 sm:px-4"
								>
									<Save className="mr-1 h-4 w-4" />
									Save
								</Button>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Note Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
					<VisuallyHidden>
						<DialogTitle>Edit Note</DialogTitle>
					</VisuallyHidden>
					<div className="absolute top-0 left-0 right-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center justify-between px-6">
							<div className="flex items-center gap-3">
								<Edit className="h-5 w-5 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									Edit Note
								</DialogTitle>
							</div>
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
						<p className="ml-14 mt-1 text-sm text-slate-600">
							Update your note details
						</p>
					</div>
					<div className="glass-dialog-body-padded flex-1 space-y-4 overflow-y-auto">
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
					</div>
					<div className="glass-dialog-footer-wrap">
						<div className="flex items-center justify-between">
							<div className="text-xs text-slate-500">
								{stripHtml(editNote.content).trim()
									? "Ready to update"
									: "Add note content to update"}
							</div>
							<div className="flex items-center gap-3">
								<Button
									variant="outline"
									onClick={() => setIsEditDialogOpen(false)}
									className="primary-btn px-3 sm:px-4"
								>
									<Ban className="h-4 w-4" />
									Cancel
								</Button>
								<Button
									onClick={handleEditNote}
									disabled={!stripHtml(editNote.content).trim()}
									className="primary-btn px-3 sm:px-4"
								>
									<Save className="mr-1 h-4 w-4" />
									Update
								</Button>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent className="mx-4 max-w-md rounded-lg shadow-2xl">
					<AlertDialogHeader className="pb-1">
						<div className="flex items-center gap-4 mb-4">
							<div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
								<Trash2 className="h-5 w-5 text-red-600" />
							</div>
							<div>
								<AlertDialogTitle className="text-lg font-semibold sidebar-gradient-text">
									Delete Note?
								</AlertDialogTitle>
								<AlertDialogDescription className="text-sm text-slate-600 mt-1">
									This action cannot be undone
								</AlertDialogDescription>
							</div>
						</div>
					</AlertDialogHeader>

					<div className="px-6 pb-6">
						<div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
							<h4 className="text-sm font-medium text-slate-700 mb-3">
								Note Details
							</h4>
							<div className="space-y-2">
								{selectedNote?.title && (
									<div className="flex items-center justify-between py-1">
										<span className="text-sm text-slate-600">Title:</span>
										<span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
											{selectedNote.title}
										</span>
									</div>
								)}
								<div className="flex items-center justify-between py-1">
									<span className="text-sm text-slate-600">Created:</span>
									<span className="text-sm font-medium text-slate-700">
										{selectedNote?.$createdAt &&
											new Date(selectedNote.$createdAt).toLocaleDateString(
												"en-US",
												{
													year: "numeric",
													month: "short",
													day: "numeric",
												},
											)}
									</span>
								</div>
							</div>
						</div>

						<div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
							<div className="flex items-start gap-2">
								<div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center mt-0.5">
									<span className="text-xs text-white font-bold">!</span>
								</div>
								<p className="text-sm text-amber-800">
									<strong>Warning:</strong> This will permanently remove the
									note from your collection.
								</p>
							</div>
						</div>
					</div>

					<div className="flex justify-center items-center gap-3 px-6 pb-6 pt-4">
						<AlertDialogCancel className="primary-btn px-3 sm:px-4">
							<Ban className="w-4 h-4" />
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteNote}
							className="delete-btn px-3 sm:px-4"
						>
							Delete Note
						</AlertDialogAction>
					</div>
				</AlertDialogContent>
			</AlertDialog>

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

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .ProseMirror li {
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
