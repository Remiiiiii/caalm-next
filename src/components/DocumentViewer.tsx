import {
	Calendar,
	FileImage,
	FileSpreadsheet,
	FileText,
	FileType,
	Lightbulb,
	Loader2,
	Minimize2,
	Presentation,
	Send,
	Sparkles,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDocumentViewer } from "@/hooks/useDocumentViewer";
import { fetchUserNamesByIds } from "@/lib/actions/user.actions";
import { convertFileSize } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

interface DocumentViewerProps {
	isOpen: boolean;
	onClose: () => void;
	file: {
		id: string;
		name: string;
		type: string;
		size: string;
		url: string;
		createdAt: string;
		expiresAt?: string;
		createdBy: string;
		description?: string;
	};
}

interface ChatMessage {
	id: string;
	text: string;
	sender: "user" | "assistant";
	timestamp: Date;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
	isOpen,
	onClose,
	file,
}) => {
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [isPreviewLoading, setIsPreviewLoading] = useState(true);
	const [showUploadPrompt, setShowUploadPrompt] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [welcomeMessageLoaded, setWelcomeMessageLoaded] = useState(false);
	const [showAIAssistant, setShowAIAssistant] = useState(false);
	const [creatorName, setCreatorName] = useState<string>("");
	const [documentSummary, setDocumentSummary] = useState<string>("");
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);

	// Use SWR hook for document data
	const {
		fileContent,
		contentLoading,
		analysisLoading: aiLoading,
		extractText,
		analyzeWithAI,
		refreshAll,
	} = useDocumentViewer(file?.id || "");

	// Debug logging for file.id
	useEffect(() => {
		console.log("DocumentViewer file.id:", file?.id, "type:", typeof file?.id);
	}, [file?.id]);

	// Reset all AI state when DocumentViewer opens or file changes
	useEffect(() => {
		if (isOpen) {
			setChatMessages([]);
			setNewMessage("");
			setIsLoading(false);
			setShowUploadPrompt(false);
			setWelcomeMessageLoaded(false);
			setShowAIAssistant(false);
			setDocumentSummary("");
		}
	}, [isOpen]);

	// Trigger file content extraction and AI analysis when document viewer opens
	useEffect(() => {
		if (!isOpen) return;

		const fileType = file.type.toLowerCase();

		// Check if it's a local file (file:// URL or blob URL)
		if (
			file.url.startsWith("file://") ||
			file.url.startsWith("blob:") ||
			file.url.startsWith("data:")
		) {
			console.log("Detected local file URL, cannot fetch directly:", file.url);
			setShowUploadPrompt(true);
			return;
		}

		// Extract text content for text files and PDFs
		if (
			["txt", "md", "json", "xml", "html", "js", "ts", "pdf"].includes(
				fileType,
			) &&
			extractText &&
			file.id &&
			file.name
		) {
			console.log("Extracting text content for file:", {
				id: file.id,
				name: file.name,
				type: file.type,
				url: file.url,
				isLocalFile:
					file.url.startsWith("file://") ||
					file.url.startsWith("blob:") ||
					file.url.startsWith("data:"),
				isPdf: file.type.toLowerCase() === "pdf",
			});
			extractText();
		}
	}, [isOpen, file.id, file.url, file.type, file.name, extractText]);

	useEffect(() => {
		// Only scroll to bottom when new messages are added (not on initial load)
		if (chatEndRef.current && chatMessages.length > 1) {
			chatEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [chatMessages]);

	useEffect(() => {
		// Reset preview state when document changes
		setPreviewError(null);
		setIsPreviewLoading(true);
	}, []);

	// Format AI response to convert markdown to HTML (similar to CalendarAIChat)
	const formatAIResponseHTML = (text: string): string => {
		if (!text) return "";

		let formatted = text;

		// Break long paragraphs into smaller paragraphs (after ~75 words)
		const wordsPerParagraph = 25;
		const breakIntoParagraphs = (text: string): string => {
			// Split by sentences (ending with . ! or ?)
			const sentenceRegex = /[^.!?]+[.!?]+|[^.!?]+$/g;
			const sentences = text.match(sentenceRegex) || [text];
			const paragraphs: string[] = [];
			let currentParagraph = "";
			let wordCount = 0;

			for (const sentence of sentences) {
				const trimmedSentence = sentence.trim();
				if (!trimmedSentence) continue;

				const sentenceWords = trimmedSentence
					.split(/\s+/)
					.filter((w) => w.length > 0).length;
				wordCount += sentenceWords;

				if (currentParagraph) {
					currentParagraph += ` ${trimmedSentence}`;
				} else {
					currentParagraph = trimmedSentence;
				}

				// Break paragraph if we've reached the word limit
				if (wordCount >= wordsPerParagraph) {
					paragraphs.push(currentParagraph);
					currentParagraph = "";
					wordCount = 0;
				}
			}

			// Add any remaining content
			if (currentParagraph.trim()) {
				paragraphs.push(currentParagraph.trim());
			}

			// If no breaks were made, return original text
			if (paragraphs.length <= 1) {
				return text;
			}

			// Join paragraphs with double line breaks
			return paragraphs.join("\n\n");
		};

		// Apply paragraph breaking to text that doesn't already have clear paragraph breaks
		// Only break if text is one continuous block (no existing double line breaks)
		if (
			!formatted.includes("\n\n") &&
			formatted.split(/\s+/).length > wordsPerParagraph
		) {
			formatted = breakIntoParagraphs(formatted);
		}

		// First, handle section headers like "**Key Sections to Review:**" before processing other content
		formatted = formatted.replace(
			/^\*\*([^*]+?)\*\*:?\s*$/gm,
			'<strong class="block mb-0 mt-3 text-base font-semibold sidebar-gradient-text">$1</strong>',
		);

		// Split by double line breaks first to handle sections
		const sections = formatted.split(/\n\n+/);
		const formattedSections = sections.map((section) => {
			let sectionText = section.trim();
			if (!sectionText) return "";

			// Handle bullet points with proper indentation
			sectionText = sectionText.replace(
				/^([-*])\s+(.+)$/gm,
				(match, _bullet, content) => {
					const isNested = /^\s{2,}/.test(match);
					const indent = isNested ? "ml-8" : "ml-4";

					// Process bold text within the content
					let processedContent = content
						.replace(
							/\*\*([^*]+?)\*\*/g,
							'<strong class="font-semibold sidebar-gradient-text">$1</strong>',
						)
						.replace(
							/__([^_]+?)__/g,
							'<strong class="font-semibold sidebar-gradient-text">$1</strong>',
						);

					// Process italic text
					processedContent = processedContent
						.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
						.replace(/(?<!_)_([^_]+?)_(?!_)/g, "<em>$1</em>");

					return `<div class="${indent} mb-2 flex items-start"><span class="mr-2 text-gray-600 flex-shrink-0">•</span><span class="flex-1">${processedContent.trim()}</span></div>`;
				},
			);

			// Handle numbered lists (1. 2. etc.)
			sectionText = sectionText.replace(
				/^(\d+\.)\s+(.+)$/gm,
				(match, number, content) => {
					const isNested = /^\s{2,}/.test(match);
					const indent = isNested ? "ml-8" : "ml-4";

					// Process bold and italic within content
					let processedContent = content
						.replace(
							/\*\*([^*]+?)\*\*/g,
							'<strong class="font-semibold sidebar-gradient-text">$1</strong>',
						)
						.replace(
							/__([^_]+?)__/g,
							'<strong class="font-semibold sidebar-gradient-text">$1</strong>',
						);

					processedContent = processedContent
						.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
						.replace(/(?<!_)_([^_]+?)_(?!_)/g, "<em>$1</em>");

					return `<div class="${indent} mb-2 flex items-start"><span class="mr-2 font-semibold text-gray-700 flex-shrink-0">${number}</span><span class="flex-1">${processedContent.trim()}</span></div>`;
				},
			);

			// Process any remaining bold text in regular paragraphs
			sectionText = sectionText.replace(
				/\*\*([^*]+?)\*\*/g,
				'<strong class="font-semibold sidebar-gradient-text">$1</strong>',
			);
			sectionText = sectionText.replace(
				/__([^_]+?)__/g,
				'<strong class="font-semibold sidebar-gradient-text">$1</strong>',
			);

			// Process italic text
			sectionText = sectionText.replace(
				/(?<!\*)\*([^*]+?)\*(?!\*)/g,
				"<em>$1</em>",
			);
			sectionText = sectionText.replace(
				/(?<!_)_([^_]+?)_(?!_)/g,
				"<em>$1</em>",
			);

			// Convert remaining single line breaks to <br> but preserve list structure
			sectionText = sectionText.replace(/\n(?!<div)/g, "");

			return sectionText;
		});

		// Join sections with proper spacing - wrap each section appropriately
		formatted = formattedSections
			.filter((s) => s.trim())
			.map((section) => {
				// If section contains lists or headers, wrap in div with spacing
				if (
					section.includes("<div") ||
					section.includes('<strong class="block')
				) {
					return `<div class="mb-4 leading-relaxed">${section}</div>`;
				}
				// Otherwise, wrap plain text paragraphs with paragraph tags
				return `<p class="mb-4 leading-relaxed">${section}</p>`;
			})
			.join("");

		// Clean up any empty divs or paragraphs
		formatted = formatted.replace(
			/<div class="mb-4 leading-relaxed"><\/div>/g,
			"",
		);
		formatted = formatted.replace(/<p class="mb-4 leading-relaxed"><\/p>/g, "");

		// Process any remaining bold text
		formatted = formatted.replace(
			/\*\*([^*]+?)\*\*/g,
			'<strong class="font-semibold sidebar-gradient-text">$1</strong>',
		);

		// Process any remaining italic text
		formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");

		return formatted;
	};

	// Generate document summary
	const generateSummary = useCallback(async () => {
		if (!file.id || !file.name || isGeneratingSummary) return;

		setIsGeneratingSummary(true);
		try {
			// Get file content if available
			const contentToAnalyze = fileContent?.content;
			let urlToUse = file.url;

			// If it's a local PDF and we have extracted content, use that
			if (
				file.type.toLowerCase() === "pdf" &&
				file.url.startsWith("file://") &&
				fileContent
			) {
				urlToUse = "";
			}

			const response = await fetch("/api/ai-analyze", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "analyze",
					fileName: file.name,
					fileType: file.type,
					fileUrl: urlToUse,
					fileContent: contentToAnalyze,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.summary?.trim()) {
					setDocumentSummary(result.summary.trim());
				}
			}
		} catch (error) {
			console.error("Failed to generate summary:", error);
		} finally {
			setIsGeneratingSummary(false);
		}
	}, [
		file.id,
		file.name,
		file.type,
		file.url,
		fileContent,
		isGeneratingSummary,
	]);

	const analyze = useCallback(async () => {
		// Always start with the greeting message
		setChatMessages([
			{
				id: "greeting",
				text: "Hi! I'm your document assistant. I can help you understand and analyze this document. What would you like to know about it?",
				sender: "assistant",
				timestamp: new Date(),
			},
		]);
		setWelcomeMessageLoaded(true);

		try {
			// Use SWR hook to analyze the document
			await analyzeWithAI();
		} catch (error) {
			console.error("AI Analysis failed:", error);
		}
	}, [analyzeWithAI]);

	// Initialize with welcome message and suggested questions when component opens
	useEffect(() => {
		if (isOpen && !welcomeMessageLoaded && chatMessages.length === 0) {
			analyze();
		}
	}, [isOpen, welcomeMessageLoaded, chatMessages.length, analyze]);

	// Fetch creator's full name
	useEffect(() => {
		const fetchCreatorName = async () => {
			if (!file.createdBy) {
				setCreatorName("");
				return;
			}

			try {
				const users = await fetchUserNamesByIds([file.createdBy]);
				if (users && users.length > 0) {
					const user =
						users.find(
							(u) =>
								u?.$id === file.createdBy || u?.accountId === file.createdBy,
						) || users[0];
					setCreatorName(user?.fullName || "Unknown");
				} else {
					setCreatorName("Unknown");
				}
			} catch (error) {
				console.error("Failed to fetch creator name:", error);
				setCreatorName("Unknown");
			}
		};

		if (isOpen && file.createdBy) {
			fetchCreatorName();
		}
	}, [isOpen, file.createdBy]);

	const handleSendMessage = async ({
		message: overrideMessage,
	}: {
		message?: string;
	} = {}) => {
		const message = overrideMessage || newMessage;
		if (!message.trim()) return;
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			text: message,
			sender: "user",
			timestamp: new Date(),
		};
		setChatMessages((prev) => [...prev, userMessage]);
		setNewMessage("");
		setIsLoading(true);

		try {
			// For PDFs, use the extracted content if available
			const contentToAnalyze = fileContent;
			let urlToUse = file.url;

			// If it's a local PDF and we have extracted content, use that
			if (
				file.type.toLowerCase() === "pdf" &&
				file.url.startsWith("file://") &&
				fileContent
			) {
				urlToUse = ""; // Don't pass the file:// URL to the AI API
			}

			console.log("Sending AI question request:", {
				action: "question",
				question: message,
				fileName: file.name,
				fileType: file.type,
				fileUrl: urlToUse,
				hasFileContent: !!contentToAnalyze,
				fileContentLength: contentToAnalyze?.content?.length || 0,
			});

			const response = await fetch("/api/ai-analyze", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "question",
					question: message,
					fileName: file.name,
					fileType: file.type,
					fileUrl: urlToUse,
					fileContent: contentToAnalyze,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const ai = await response.json();
			setChatMessages((prev) => [
				...prev,
				{
					id: `${Date.now().toString()}-ai`,
					text: ai.answer, // Store raw text, format on render
					sender: "assistant",
					timestamp: new Date(),
				},
			]);
		} catch (error) {
			console.error("AI Question failed:", error);
			setChatMessages((prev) => [
				...prev,
				{
					id: `${Date.now().toString()}-ai-error`,
					text: "I'm sorry, I encountered an error while processing your question. Please try again.",
					sender: "assistant",
					timestamp: new Date(),
				},
			]);
		}
		setIsLoading(false);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage({ message: undefined });
		}
	};

	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const uploadedFile = event.target.files?.[0];
		if (!uploadedFile) return;

		setUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", uploadedFile);

			const response = await fetch("/api/upload-pdf", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.status}`);
			}

			const result = await response.json();

			if (result.success) {
				// Update the file content using SWR
				await refreshAll();
				setShowUploadPrompt(false);
				console.log("PDF uploaded and text extracted successfully");
				console.log("Extracted text length:", result.text?.length || 0);

				// Trigger AI analysis after successful upload
				setTimeout(() => {
					analyze();
				}, 100);
			} else {
				console.error("Upload failed:", result.error);
			}
		} catch (error) {
			console.error("File upload error:", error);
		} finally {
			setUploading(false);
		}
	};

	const getFileIcon = (type: string, size: "lg" | "sm" = "lg") => {
		const className =
			size === "lg" ? "h-16 w-16 text-slate-500" : "h-8 w-8 text-slate-500";
		switch (type.toLowerCase()) {
			case "pdf":
			case "txt":
				return <FileText className={className} aria-hidden />;
			case "doc":
			case "docx":
				return <FileType className={className} aria-hidden />;
			case "xls":
			case "xlsx":
				return <FileSpreadsheet className={className} aria-hidden />;
			case "ppt":
			case "pptx":
				return <Presentation className={className} aria-hidden />;
			case "jpg":
			case "jpeg":
			case "png":
			case "gif":
			case "svg":
				return <FileImage className={className} aria-hidden />;
			default:
				return <FileText className={className} aria-hidden />;
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const isImageFile = (type: string) => {
		const imageTypes = ["jpg", "jpeg", "png", "gif", "svg", "webp"];
		return imageTypes.includes(type.toLowerCase());
	};

	const isPdfFile = (type: string) => {
		return type.toLowerCase() === "pdf";
	};

	const isTextFile = (type: string) => {
		const textTypes = ["txt", "md", "json", "xml", "html", "css", "js", "ts"];
		return textTypes.includes(type.toLowerCase());
	};

	const renderFilePreview = () => {
		const fileType = file.type.toLowerCase();

		if (isImageFile(fileType)) {
			return (
				<div className="relative h-full w-full p-4">
					{isPreviewLoading && (
						<div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
							<div className="text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
								<p className="text-sm text-gray-500">Loading image...</p>
							</div>
						</div>
					)}
					<Image
						src={file.url}
						alt={file.name}
						fill
						sizes="72vw"
						className="object-contain rounded-lg shadow-lg"
						onLoad={() => setIsPreviewLoading(false)}
						onError={() => {
							setPreviewError("Failed to load image");
							setIsPreviewLoading(false);
						}}
					/>
				</div>
			);
		}

		if (isPdfFile(fileType)) {
			// Show upload prompt for local files
			if (
				showUploadPrompt ||
				file.url.startsWith("file://") ||
				file.url.startsWith("blob:") ||
				file.url.startsWith("data:")
			) {
				return (
					<div className="h-full flex items-center justify-center">
						<div className="text-center max-w-md">
							<div className="mb-4 flex justify-center">
								{getFileIcon("pdf")}
							</div>
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								Local PDF Detected
							</h3>
							<p className="text-gray-500 mb-6">
								To enable AI analysis, please upload this PDF file to the
								server.
							</p>
							<div className="space-y-3">
								<input
									ref={fileInputRef}
									type="file"
									accept=".pdf"
									onChange={handleFileUpload}
									className="hidden"
								/>
								<Button
									onClick={() => fileInputRef.current?.click()}
									disabled={uploading}
									className="w-full"
								>
									{uploading ? "Uploading..." : "Upload PDF for AI Analysis"}
								</Button>
								<p className="text-xs text-gray-400">
									Your file will be processed securely and text will be
									extracted for AI analysis.
								</p>
							</div>
						</div>
					</div>
				);
			}

			return (
				<div className="h-full flex flex-col">
					{isPreviewLoading && (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
							<div className="text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
								<p className="text-sm text-gray-500">Loading PDF...</p>
							</div>
						</div>
					)}
					<div className="flex-1">
						<iframe
							src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0`}
							className="w-full h-full border-0"
							title={file.name}
							onLoad={() => setIsPreviewLoading(false)}
							onError={() => {
								setPreviewError("Failed to load PDF");
								setIsPreviewLoading(false);
							}}
						/>
					</div>
				</div>
			);
		}

		if (isTextFile(fileType)) {
			return (
				<div className="h-full flex flex-col">
					<div className="flex-1 p-4 overflow-auto">
						{contentLoading ? (
							<div className="h-full flex items-center justify-center">
								<div className="text-center">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
									<p className="text-sm text-gray-500">
										Loading file content...
									</p>
								</div>
							</div>
						) : (
							<pre className="text-sm text-gray-800 bg-white p-4 rounded-lg h-full overflow-auto border">
								<code>{fileContent?.content || "No content available"}</code>
							</pre>
						)}
					</div>
				</div>
			);
		}

		// For other file types, show a preview with download option
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center">
					<div className="mb-4 flex justify-center">
						{getFileIcon(file.type)}
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						{file.name}
					</h3>
					<p className="text-gray-500 mb-4">
						{file.description || "Preview not available for this file type"}
					</p>
					<div className="flex gap-2 justify-center">
						<Button
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (isOpen && !isClosing) {
									window.open(file.url, "_blank");
								}
							}}
							disabled={isClosing}
						>
							Open Full Document
						</Button>
						<Button
							variant="outline"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (isOpen && !isClosing) {
									const link = document.createElement("a");
									link.href = file.url;
									link.download = file.name;
									link.click();
								}
							}}
							disabled={isClosing}
						>
							Download
						</Button>
					</div>
				</div>
			</div>
		);
	};

	if (!isOpen || !file?.id) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
			style={{
				pointerEvents: "auto",
			}}
			onClick={(e) => {
				e.stopPropagation();

				if (e.target === e.currentTarget && !isClosing) {
					setIsClosing(true);
					onClose();
				}
			}}
		>
			<div
				className="bg-white rounded-3xl shadow-drop-2 w-full max-w-7xl h-[90vh] flex flex-col border border-light-300"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="rounded-3xl flex items-center justify-between p-6 border-b border-light-300 bg-gradient-to-r from-light-400 to-white">
					<div className="flex items-center space-x-4">
						<div className="flex items-center">
							{getFileIcon(file.type, "sm")}
						</div>
						<div>
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								{file.name}
							</h2>
							<div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
								<span className="flex items-center">
									<FileText className="w-4 h-4 mr-1" />
									{file.type.toUpperCase()}
								</span>
								<span>{file.size}</span>
								<span className="flex items-center">
									<Calendar className="w-4 h-4 mr-1" />
									{formatDate(file.createdAt)}
								</span>
								{file.expiresAt && (
									<Badge variant="destructive">
										Expires: {formatDate(file.expiresAt)}
									</Badge>
								)}
							</div>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							size="sm"
							className="primary-btn px-3 sm:px-4"
							onClick={() => {
								setIsClosing(true);
								onClose();
							}}
							style={{
								pointerEvents: "auto",
							}}
						>
							<Minimize2 className="w-4 h-4" />
							Close
						</Button>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl">
					{/* Document Preview */}
					<div className="relative w-[72%] border-r border-light-300 bg-light-400 pl-8">
						{previewError ? (
							<div className="h-full flex items-center justify-center">
								<div className="text-center">
									<div className="text-red mb-2">{previewError}</div>
									<Button
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											if (isOpen && !isClosing) {
												window.open(file.url, "_blank");
											}
										}}
										disabled={isClosing}
									>
										Open Full Document
									</Button>
								</div>
							</div>
						) : (
							renderFilePreview()
						)}
					</div>

					{/* AI Analysis Panel */}
					<div
						className="flex w-[28%] min-h-0 flex-col border-l border-light-300 bg-light-400/30 text-left backdrop-blur"
						dir="ltr"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex shrink-0 flex-col items-stretch border-b border-light-300 bg-white/80 p-4 text-left backdrop-blur">
							<div className="mb-4 flex items-center justify-between">
								<h3 className="flex items-center gap-2 font-bold sidebar-gradient-text">
									<Image
										src="/assets/images/assistant.svg"
										alt="AI Assistant"
										width={30}
										height={30}
									/>
									AI Assistant
								</h3>
								{showAIAssistant && (
									<Button
										variant="ghost"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											setShowAIAssistant(false);
										}}
										className="flex h-8 w-8 items-center justify-center rounded-lg pl-6 shadow-sm transition-colors hover:bg-gray-50"
										title="Collapse AI Assistant"
									>
										<Minimize2 className="h-4 w-4 text-black" />
									</Button>
								)}
							</div>
							{!showAIAssistant && (
								<Button
									onClick={async (e) => {
										e.stopPropagation();
										setShowAIAssistant(true);
										// Generate summary and analyze
										await generateSummary();
										analyze();
									}}
									className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#00C1CB] via-[#0E638F] to-[#162768] py-6 font-semibold text-white shadow-drop-1 transition-opacity hover:opacity-90"
								>
									<Lightbulb className="h-5 w-5" />
									Analyze Document
								</Button>
							)}
						</div>

						{/* Scrollable chat + docs; composer pinned to bottom */}
						{showAIAssistant && (
							<>
								<div
									className="min-h-0 flex-1 overflow-y-auto text-left"
									onClick={(e) => e.stopPropagation()}
								>
									<div
										className="space-y-4 p-4 text-left"
										onClick={(e) => e.stopPropagation()}
									>
										{/* Welcome Message */}
										{chatMessages.length > 0 &&
											chatMessages[0].sender === "assistant" && (
												<div className="flex justify-start">
													<div className="flex max-w-[95%] items-start space-x-3">
														<div className="shrink-0">
															<Image
																src="/assets/images/assistant.svg"
																alt="AI Assistant"
																width={40}
																height={40}
																className="h-10 w-10 rounded-full bg-blue-100 p-1"
															/>
														</div>
														<div className="rounded-2xl border border-light-300 bg-white px-4 py-3 text-left shadow-drop-1">
															<p className="whitespace-pre-line text-left text-sm text-gray-700">
																{chatMessages[0].text}
															</p>
															<p className="mt-2 text-left text-xs text-gray-400">
																{chatMessages[0].timestamp.toLocaleTimeString()}
															</p>
														</div>
													</div>
												</div>
											)}

										{(documentSummary || file.description) && (
											<Card className="rounded-lg border border-slate-200 bg-white text-left shadow-sm">
												<CardHeader className="pb-2">
													<CardTitle className="flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
														<FileText className="h-4 w-4 text-cyan-600" />
														Summary
													</CardTitle>
												</CardHeader>
												<CardContent>
													{isGeneratingSummary ? (
														<div className="flex items-center gap-2 text-left text-sm text-slate-500">
															<Loader2 className="h-4 w-4 animate-spin" />
															Generating summary...
														</div>
													) : (
														<p
															className="text-left text-sm leading-relaxed text-slate-700"
															dir="ltr"
														>
															{documentSummary || file.description}
														</p>
													)}
												</CardContent>
											</Card>
										)}

										<Card className="rounded-lg border border-slate-200 bg-white text-left shadow-sm">
											<CardHeader className="pb-2">
												<CardTitle className="flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
													<Calendar className="h-4 w-4 text-cyan-600" />
													Important Dates
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-2 text-left">
													<div className="flex justify-between text-sm">
														<span className="text-gray-600">Created:</span>
														<span className="font-medium text-gray-900">
															{formatDate(file.createdAt)}
														</span>
													</div>
													{file.expiresAt && (
														<div className="flex justify-between text-sm">
															<span className="text-gray-600">Expires:</span>
															<span className="font-medium text-gray-900">
																{formatDate(file.expiresAt)}
															</span>
														</div>
													)}
												</div>
											</CardContent>
										</Card>

										<Card className="rounded-lg border border-slate-200 bg-white text-left shadow-sm">
											<CardHeader className="pb-2">
												<CardTitle className="flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
													<FileText className="h-4 w-4 text-cyan-600" />
													Document Information
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-2 text-left">
													<div className="flex justify-between text-sm">
														<span className="text-gray-600">File Type:</span>
														<span className="font-medium text-gray-900">
															{file.type.toUpperCase()}
														</span>
													</div>
													<div className="flex justify-between text-sm">
														<span className="text-gray-600">File Size:</span>
														<span className="font-medium text-gray-900">
															{convertFileSize({
																sizeInBytes:
																	typeof file.size === "string"
																		? Number.isNaN(Number(file.size))
																			? null
																			: Number(file.size)
																		: file.size,
															})}
														</span>
													</div>
													{file.createdBy && (
														<div className="flex justify-between text-sm">
															<span className="text-gray-600">Created By:</span>
															<span className="font-medium text-gray-900">
																{creatorName || "Loading..."}
															</span>
														</div>
													)}
												</div>
											</CardContent>
										</Card>

										{/* Quick Questions */}
										<div>
											<h4 className="mb-2 flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
												<FileText className="h-4 w-4 text-cyan-600" />
												Quick Questions
											</h4>
											<div className="flex flex-wrap gap-2">
												{[
													"What is this document about?",
													"When does this contract expire?",
													"What are the key terms and conditions?",
													"What actions do I need to take?",
												].map((q) => (
													<Button
														key={q}
														variant="outline"
														size="sm"
														className="rounded-full border-light-300 bg-white text-xs shadow-drop-1 transition-all duration-200 hover:border-[#00C1CB] hover:bg-light-400 focus:outline-none focus:ring-2 focus:ring-[#078FAB]"
														onClick={(e) => {
															e.stopPropagation();
															handleSendMessage({ message: q });
														}}
														disabled={isLoading}
													>
														{q}
													</Button>
												))}
											</div>
										</div>

										{/* Chat Messages — exclude greeting shown at top */}
										{chatMessages.length > 1 && (
											<div className="space-y-3 text-left">
												{chatMessages
													.filter((message) => message.id !== "greeting")
													.map((message) => (
														<div
															key={message.id}
															className={`rounded-lg p-3 text-left ${
																message.sender === "user"
																	? "bg-gradient-to-r from-[#00C1CB] via-[#0E638F] to-[#162768] text-white"
																	: "bg-slate-50 text-slate-700"
															}`}
														>
															{message.sender === "assistant" ? (
																<div
																	className="prose prose-sm max-w-none text-left text-sm text-gray-700 prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1"
																	dangerouslySetInnerHTML={{
																		__html: formatAIResponseHTML(message.text),
																	}}
																/>
															) : (
																<p className="whitespace-pre-line text-left text-sm">
																	{message.text}
																</p>
															)}
															<p
																className={`mt-2 text-left text-xs ${
																	message.sender === "user"
																		? "text-blue-100"
																		: "text-gray-400"
																}`}
															>
																{message.timestamp.toLocaleTimeString()}
															</p>
														</div>
													))}
												{isLoading && (
													<div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
														<Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
														<span className="text-sm text-gray-600">
															Thinking...
														</span>
													</div>
												)}
												<div ref={chatEndRef} />
											</div>
										)}
									</div>
								</div>

								{/* Composer — pinned to bottom */}
								<div
									className="shrink-0 border-t border-light-300 bg-white/95 p-4 text-left backdrop-blur"
									onClick={(e) => e.stopPropagation()}
								>
									<div className="mb-2 flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
										<Sparkles className="h-4 w-4 text-cyan-600" />
										Ask CAALM
									</div>
									<div className="flex items-end gap-2">
										<Textarea
											placeholder="Ask a question about this document..."
											value={newMessage}
											onChange={(e) => setNewMessage(e.target.value)}
											onKeyPress={handleKeyPress}
											onClick={(e) => e.stopPropagation()}
											className="min-h-[72px] flex-1 resize-none border! border-slate-300! bg-white text-left text-sm shadow-sm focus-visible:border-[#078FAB]! focus-visible:ring-1 focus-visible:ring-[#078FAB]"
											rows={2}
											aria-label="Ask CAALM"
										/>
										<Button
											onClick={(e) => {
												e.stopPropagation();
												handleSendMessage({ message: undefined });
											}}
											disabled={!newMessage.trim() || isLoading}
											size="icon"
											className="primary-btn size-8! min-h-8! min-w-8! max-h-8! max-w-8! shrink-0 rounded-full! p-0! px-0! py-0! sm:w-8!"
											aria-label="Send message"
										>
											{isLoading ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<Send className="h-3.5 w-3.5" />
											)}
										</Button>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default DocumentViewer;
