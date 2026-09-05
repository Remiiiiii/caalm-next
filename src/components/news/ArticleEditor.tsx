"use client";

import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AlertTriangle,
	Bold,
	BookOpenCheck,
	FileText,
	Italic,
	List,
	ListOrdered,
	Loader2,
	Save,
	Strikethrough,
	Trash2,
	Underline,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import ArticlePreview from "./ArticlePreview";
import { ImageGenerator } from "./ImageGenerator";
import "react-datepicker/dist/react-datepicker.css";

interface ArticleEditorProps {
	articleId?: string | null;
	open: boolean;
	onClose: () => void;
	onSave: () => void;
}

// TipTap editor extensions
const editorExtensions = [
	StarterKit.configure({
		link: false,
	}),
	LinkExtension.configure({
		openOnClick: false,
		HTMLAttributes: {
			class: "text-blue-500 underline cursor-pointer",
		},
	}),
	ImageExtension.configure({
		inline: true,
		allowBase64: true,
	}),
	Placeholder.configure({
		placeholder: "Write your article content here...",
	}),
];

// Editor toolbar component
const EditorToolbar = ({ editor }: { editor: any }) => {
	if (!editor) return null;

	return (
		<div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 rounded-t-lg">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleBold().run()}
				className={`h-8 w-8 p-0 ${
					editor.isActive("bold") ? "bg-slate-200" : ""
				}`}
				title="Bold"
			>
				<Bold className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleItalic().run()}
				className={`h-8 w-8 p-0 ${
					editor.isActive("italic") ? "bg-slate-200" : ""
				}`}
				title="Italic"
			>
				<Italic className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleUnderline().run()}
				className={`h-8 w-8 p-0 ${
					editor.isActive("underline") ? "bg-slate-200" : ""
				}`}
				title="Underline"
			>
				<Underline className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleStrike().run()}
				className={`h-8 w-8 p-0 ${
					editor.isActive("strike") ? "bg-slate-200" : ""
				}`}
				title="Strikethrough"
			>
				<Strikethrough className="h-4 w-4" />
			</Button>
			<div className="w-px h-6 bg-slate-300 mx-1" />
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				className={`h-8 w-8 p-0 ${
					editor.isActive("bulletList") ? "bg-slate-200" : ""
				}`}
				title="Bullet List"
			>
				<List className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				className={`h-8 w-8 p-0 ${
					editor.isActive("orderedList") ? "bg-slate-200" : ""
				}`}
				title="Numbered List"
			>
				<ListOrdered className="h-4 w-4" />
			</Button>
		</div>
	);
};

const ArticleEditor: React.FC<ArticleEditorProps> = ({
	articleId,
	open,
	onClose,
	onSave,
}) => {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [type, setType] = useState<
		"announcement" | "update" | "alert" | "info"
	>("info");
	const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
	const [department, setDepartment] = useState("");
	const [status, setStatus] = useState<"draft" | "published">("draft");
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState("");
	const [thumbnailUrl, setThumbnailUrl] = useState("");
	const [thumbnailPrompt, setThumbnailPrompt] = useState("");
	const [scheduledAt, setScheduledAt] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [isClient, setIsClient] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [characterCount, setCharacterCount] = useState(0);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const { toast } = useToast();

	// Initialize client state
	useEffect(() => {
		setIsClient(true);
	}, []);

	// TipTap editor
	const editor = useEditor(
		{
			extensions: editorExtensions,
			content: content,
			immediatelyRender: false,
			onUpdate: ({ editor }) => {
				const html = editor.getHTML();
				setContent(html);
				setCharacterCount(editor.getText().length);
				setHasUnsavedChanges(true);
			},
			editorProps: {
				attributes: {
					class:
						"prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4",
				},
			},
		},
		[isClient],
	);

	// Update editor content when content state changes (from loading article)
	useEffect(() => {
		if (editor && content && editor.getHTML() !== content) {
			editor.commands.setContent(content);
			setCharacterCount(editor.getText().length);
		}
	}, [content, editor]);

	const loadArticle = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/internal-news/${articleId}`);
			if (!response.ok) throw new Error("Failed to load article");

			const data = await response.json();
			const article = data.article;

			setTitle(article.title || "");
			setContent(article.content || "");
			setType(article.type || "info");
			setPriority(article.priority || "medium");
			setDepartment(article.department || "");
			setStatus(article.status === "published" ? "published" : "draft");
			setTags(article.tags || []);
			setThumbnailUrl(article.image || "");
			setThumbnailPrompt(article.thumbnailPrompt || "");
			setScheduledAt(article.scheduledAt || "");
			setHasUnsavedChanges(false);
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to load article",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setTitle("");
		setContent("");
		setType("info");
		setPriority("medium");
		setDepartment("");
		setStatus("draft");
		setTags([]);
		setTagInput("");
		setThumbnailUrl("");
		setThumbnailPrompt("");
		setCharacterCount(0);
		setScheduledAt("");
		setHasUnsavedChanges(false);
		if (editor) {
			editor.commands.clearContent();
		}
	};

	// Load article if editing
	useEffect(() => {
		if (open && articleId) {
			loadArticle();
		} else if (open && !articleId) {
			// Reset form for new article
			resetForm();
		}
	}, [
		open,
		articleId, // Reset form for new article
		resetForm,
		loadArticle,
	]);

	const handleSave = async (publish: boolean = false) => {
		if (!title.trim()) {
			toast({
				title: "Validation Error",
				description: "Title is required",
				variant: "destructive",
			});
			return;
		}

		if (!content.trim() || content === "<p></p>") {
			toast({
				title: "Validation Error",
				description: "Content is required",
				variant: "destructive",
			});
			return;
		}

		try {
			setLoading(true);

			const articleData = {
				title: title.trim(),
				content: editor?.getHTML() || content,
				type,
				priority,
				department: department || undefined,
				status: publish ? "published" : status,
				thumbnailUrl: thumbnailUrl || undefined,
				thumbnailPrompt: thumbnailPrompt || undefined,
				tags: tags.filter(Boolean),
				scheduledAt: scheduledAt || undefined,
			};

			let response;
			if (articleId) {
				// Update existing article
				response = await fetch(`/api/internal-news/${articleId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(articleData),
				});
			} else {
				// Create new article
				response = await fetch("/api/internal-news", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(articleData),
				});
			}

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to save article");
			}

			// If publishing, also call publish endpoint
			if (publish && articleId) {
				await fetch(`/api/internal-news/${articleId}/publish`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ publish: true }),
				});
			}

			toast({
				title: "Success",
				description: publish
					? "Article published successfully"
					: articleId
						? "Article updated successfully"
						: "Article created successfully",
			});

			setHasUnsavedChanges(false);
			onSave();
			onClose();
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to save article",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleImageGenerated = (imageUrl: string, prompt: string) => {
		setThumbnailUrl(imageUrl);
		setThumbnailPrompt(prompt);
		setHasUnsavedChanges(true);
	};

	const handleAddTag = () => {
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			setTags([...tags, tagInput.trim()]);
			setTagInput("");
			setHasUnsavedChanges(true);
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		setTags(tags.filter((t) => t !== tagToRemove));
		setHasUnsavedChanges(true);
	};

	const handleClose = () => {
		if (hasUnsavedChanges) {
			setShowConfirmDialog(true);
		} else {
			resetForm();
			onClose();
		}
	};

	const handleConfirmClose = () => {
		resetForm();
		setShowConfirmDialog(false);
		onClose();
	};

	// Auto-save hook
	const { isSaving, lastSaved } = useAutoSave(
		{
			title,
			content: editor?.getHTML() || content,
			type,
			priority,
			department,
			status,
			tags,
			thumbnailUrl,
			thumbnailPrompt,
			scheduledAt,
		},
		articleId || "new",
		hasUnsavedChanges,
		async (data: Record<string, any>) => {
			if (articleId && hasUnsavedChanges) {
				// Auto-save only for existing articles
				try {
					await fetch(`/api/internal-news/${articleId}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(data),
					});
				} catch (error) {
					console.error("Auto-save failed:", error);
				}
			}
		},
	);

	// Generate prompt suggestion from content
	const getSuggestedPrompt = () => {
		const textContent = editor?.getText() || content.replace(/<[^>]*>/g, "");
		const preview = textContent.substring(0, 200).trim();
		return preview || "Professional business news article image";
	};

	if (!open) return null;

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(isOpen) => {
					if (!isOpen && !showConfirmDialog) {
						handleClose();
					}
				}}
			>
				<DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] sm:w-full max-w-7xl max-sm:inset-2 max-sm:left-2 max-sm:top-2 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:h-[calc(100vh-1rem)] flex-col overflow-hidden p-0 shadow-xl">
					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Header with gradient background */}
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<div className="flex items-center gap-3">
								<FileText className="w-5 h-5 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									{articleId ? "Edit Article" : "Create New Article"}
								</DialogTitle>
							</div>
						</div>
						<p className="text-sm text-slate-600 mt-1 ml-14">
							{articleId
								? "Update article content, metadata, and settings"
								: "Create a new news article for the company feed"}
						</p>
					</div>

					{/* Scrollable Content */}
					<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Left Column - Editor */}
							<div className="lg:col-span-2 space-y-4">
								{/* Title */}
								<div>
									<Label htmlFor="title">Title *</Label>
									<Input
										id="title"
										value={title}
										onChange={(e) => {
											setTitle(e.target.value);
											setHasUnsavedChanges(true);
										}}
										placeholder="Enter article title..."
										maxLength={200}
										className="mt-1"
									/>
									<p className="text-xs text-slate-500 mt-1">
										{title.length}/200 characters
									</p>
								</div>

								{/* Content Editor */}
								<div>
									<Label>Content *</Label>
									<div className="mt-1 border border-slate-200 rounded-lg overflow-hidden">
										{isClient && editor && <EditorToolbar editor={editor} />}
										<div className="bg-white min-h-[300px]">
											{isClient && editor ? (
												<EditorContent editor={editor} />
											) : (
												<div className="p-4 text-slate-400">
													Loading editor...
												</div>
											)}
										</div>
									</div>
									<p className="text-xs text-slate-500 mt-1">
										{characterCount} characters
									</p>
								</div>

								{/* Metadata Row */}
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div>
										<Label htmlFor="type">Type</Label>
										<Select
											value={type}
											onValueChange={(value: any) => {
												setType(value);
												setHasUnsavedChanges(true);
											}}
										>
											<SelectTrigger className="mt-1">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="announcement">
													Announcement
												</SelectItem>
												<SelectItem value="update">Update</SelectItem>
												<SelectItem value="alert">Alert</SelectItem>
												<SelectItem value="info">Info</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor="priority">Priority</Label>
										<Select
											value={priority}
											onValueChange={(value: any) => {
												setPriority(value);
												setHasUnsavedChanges(true);
											}}
										>
											<SelectTrigger className="mt-1">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="high">High</SelectItem>
												<SelectItem value="medium">Medium</SelectItem>
												<SelectItem value="low">Low</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor="department">Department</Label>
										<Input
											id="department"
											value={department}
											onChange={(e) => {
												setDepartment(e.target.value);
												setHasUnsavedChanges(true);
											}}
											placeholder="Department"
											className="mt-1"
										/>
									</div>

									<div className="flex items-end">
										<div className="flex items-center space-x-2 w-full">
											<Switch
												id="status"
												checked={status === "published"}
												onCheckedChange={(checked) => {
													setStatus(checked ? "published" : "draft");
													setHasUnsavedChanges(true);
												}}
											/>
											<Label htmlFor="status" className="cursor-pointer">
												{status === "published" ? "Published" : "Draft"}
											</Label>
										</div>
									</div>
								</div>

								{/* Tags */}
								<div>
									<Label htmlFor="tags">Tags</Label>
									<div className="flex gap-2 mt-1">
										<Input
											id="tags"
											value={tagInput}
											onChange={(e) => setTagInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													handleAddTag();
												}
											}}
											placeholder="Add tag and press Enter"
										/>
										<Button
											type="button"
											onClick={handleAddTag}
											variant="outline"
										>
											Add
										</Button>
									</div>
									{tags.length > 0 && (
										<div className="flex flex-wrap gap-2 mt-2">
											{tags.map((tag) => (
												<Badge
													key={tag}
													variant="secondary"
													className="flex items-center gap-1"
												>
													{tag}
													<button
														type="button"
														onClick={() => handleRemoveTag(tag)}
														className="ml-1 hover:text-red"
													>
														<X className="h-3 w-3" />
													</button>
												</Badge>
											))}
										</div>
									)}
								</div>

								{/* Image Generation */}
								<div>
									<Label>Thumbnail Image</Label>
									<Tabs defaultValue="generate" className="mt-1">
										<TabsList>
											<TabsTrigger value="generate">
												Generate with AI
											</TabsTrigger>
											<TabsTrigger value="upload">Upload</TabsTrigger>
											<TabsTrigger value="url">URL</TabsTrigger>
										</TabsList>
										<TabsContent value="generate">
											<ImageGenerator
												onImageGenerated={handleImageGenerated}
												initialPrompt={getSuggestedPrompt()}
											/>
										</TabsContent>
										<TabsContent value="upload">
											<Input
												type="file"
												accept="image/*"
												onChange={(e) => {
													const file = e.target.files?.[0];
													if (file) {
														const reader = new FileReader();
														reader.onload = (event) => {
															const result = event.target?.result as string;
															setThumbnailUrl(result);
															setHasUnsavedChanges(true);
														};
														reader.readAsDataURL(file);
													}
												}}
											/>
										</TabsContent>
										<TabsContent value="url">
											<Input
												placeholder="Enter image URL"
												value={thumbnailUrl}
												onChange={(e) => {
													setThumbnailUrl(e.target.value);
													setHasUnsavedChanges(true);
												}}
											/>
										</TabsContent>
									</Tabs>
									{thumbnailUrl && (
										<div className="mt-2">
											<img
												src={thumbnailUrl}
												alt="Thumbnail preview"
												className="w-full h-48 object-cover rounded-lg border border-slate-200"
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => {
													setThumbnailUrl("");
													setThumbnailPrompt("");
													setHasUnsavedChanges(true);
												}}
												className="mt-2"
											>
												<X className="mr-2 h-4 w-4" />
												Remove Image
											</Button>
										</div>
									)}
								</div>
							</div>

							{/* Right Column - Preview */}
							<div className="lg:col-span-1">
								<div className="sticky top-4">
									<Label>Preview</Label>
									<div className="mt-1 border border-slate-200 rounded-lg p-4 bg-slate-50">
										<ArticlePreview
											title={title || "Article Title"}
											content={
												editor?.getText() ||
												content.replace(/<[^>]*>/g, "") ||
												"Article content preview..."
											}
											type={type}
											priority={priority}
											department={department}
											author="You"
											date={new Date().toISOString()}
											image={thumbnailUrl}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Professional Footer */}
					<div className="glass-dialog-alert-footer">
						<div className="text-xs text-slate-500">
							{isSaving && "Saving..."}
							{lastSaved &&
								!isSaving &&
								`Last saved ${lastSaved.toLocaleTimeString()}`}
						</div>
						<div className="flex items-center gap-3">
							<Button
								onClick={() => handleSave(false)}
								disabled={loading}
								variant="outline"
								className="primary-btn px-3 sm:px-4"
							>
								{loading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Save className="h-4 w-4" />
										Save Draft
									</>
								)}
							</Button>
							<Button
								onClick={() => handleSave(true)}
								disabled={loading}
								className="primary-btn px-3 sm:px-4"
							>
								{loading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Publishing...
									</>
								) : (
									<>
										<BookOpenCheck className="h-4 w-4" />
										Publish
									</>
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Confirmation Dialog for Unsaved Changes */}
			<Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<DialogContent className="flex max-h-[90vh] max-w-md flex-col overflow-hidden p-0 shadow-xl">
					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Header with gradient background */}
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<div className="flex items-center gap-3">
								<AlertTriangle className="w-5 h-5 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									Unsaved Changes
								</DialogTitle>
							</div>
						</div>
						<p className="text-sm text-slate-600 mt-1 ml-14">
							You have unsaved changes that will be lost if you continue
						</p>
					</div>

					{/* Scrollable Content */}
					<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
						<p className="text-sm text-slate-600">
							Are you sure you want to close? All unsaved changes will be lost.
						</p>
					</div>

					{/* Professional Footer */}
					<div className="glass-dialog-alert-footer">
						<div className="text-xs text-slate-500"></div>
						<div className="flex items-center justify-end gap-3">
							<Button
								onClick={handleConfirmClose}
								variant="destructive"
								className="primary-btn px-3 sm:px-4"
							>
								<Trash2 className="h-4 w-4" />
								Discard Changes
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default ArticleEditor;
