"use client";

// import { Separator } from '@/components/ui/separator';
import {
	Bot,
	Building,
	ChevronDown as ChevronDownIcon,
	ChevronRight,
	Download,
	File,
	FileArchive,
	FileImage,
	FileSpreadsheet,
	FileText,
	Lightbulb,
	Loader2,
	Mail,
	MapPin,
	Minimize2,
	Phone,
	RotateCw,
	Shield,
	Sparkles,
	Star,
	User,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import {
	// useMemo,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import useSWR from "swr";
// import { Input } from '@/components/ui/input';
import { ContractAnalysisCards } from "@/components/contract-assistant/ContractAnalysisCards";
import type { ContractChatMessage } from "@/components/contract-assistant/ContractAssistantChat";
import {
	AskCaalmComposer,
	ContractAssistantChat,
} from "@/components/contract-assistant/ContractAssistantChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ContractStarterPrompt } from "@/lib/ai/contract-assistant.types";
import { splitProseParagraphs } from "@/lib/ai/split-prose";
import type { ContractAnalysis } from "@/lib/ai-contract-analyzer";
import type { SAMContract } from "@/lib/sam-config";

interface ContractDocumentViewerProps {
	isOpen: boolean;
	onClose: () => void;
	contract: SAMContract | null;
	contractContent?: string;
}

// Using the ContractAnalysis interface from the AI analyzer
type AIAnalysis = ContractAnalysis;

const ContractDocumentViewer: React.FC<ContractDocumentViewerProps> = ({
	isOpen,
	onClose,
	contract,
	contractContent,
}) => {
	// Document state
	const [content, setContent] = useState<string>("");
	// const [zoom, setZoom] = useState<number>(100);
	// const [searchTerm, setSearchTerm] = useState<string>('');
	// const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	// const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(-1);

	// AI Analysis state
	const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
	const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
	const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
	const [starterPrompts, setStarterPrompts] = useState<ContractStarterPrompt[]>(
		[],
	);
	const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
	const [contractMessages, setContractMessages] = useState<
		ContractChatMessage[]
	>([]);

	// UI state
	const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
	const [showSmartSummary, setShowSmartSummary] = useState<boolean>(true);
	const [showMainDescription, setShowMainDescription] =
		useState<boolean>(false);
	const [showContractFacts, setShowContractFacts] = useState<boolean>(true);
	const descriptionCardRef = useRef<HTMLDivElement>(null);
	const [aiPaneHeight, setAiPaneHeight] = useState<number | null>(null);

	// SWR fetcher function
	const fetcher = useCallback(async (url: string) => {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	}, []);

	// SWR hook for contract details
	const { data: swrData, error: swrError } = useSWR(
		contract
			? `/api/sam/contract-details?noticeId=${encodeURIComponent(
					contract.noticeId,
				)}`
			: null,
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			dedupingInterval: 60000, // 1 minute
			errorRetryCount: 2,
			onError: (error) => {
				console.error("SWR error fetching contract details:", error);
			},
			onSuccess: (data) => {
				if (data.success && data.data) {
					console.log("Contract details fetched successfully:", {
						source: data.source,
						hasDescription: !!data.data.description,
						resourceLinksCount: data.data.resourceLinks?.length || 0,
						attachmentsCount: data.data.attachments?.length || 0,
					});
				}
			},
		},
	);

	// Extract contract details from SWR response
	const contractDetails = swrData?.success ? swrData.data : null;

	// Keep AI pane height locked to Full Description so bottoms stay parallel
	useEffect(() => {
		if (!showAiPanel) {
			setAiPaneHeight(null);
			return;
		}

		const node = descriptionCardRef.current;
		if (!node || typeof ResizeObserver === "undefined") return;

		const syncHeight = () => {
			setAiPaneHeight(Math.round(node.getBoundingClientRect().height));
		};

		syncHeight();
		const observer = new ResizeObserver(syncHeight);
		observer.observe(node);
		return () => observer.disconnect();
	}, [
		showAiPanel,
		showMainDescription,
		contractDetails?.description,
		contract?.description,
	]);

	// Handle SWR errors
	useEffect(() => {
		if (swrError) {
			console.error("SWR error:", swrError.message);
		}
	}, [swrError]);

	// Generate document content from contract object
	const generateDocumentContent = useCallback(
		(contract: SAMContract): string => {
			const description =
				contractDetails?.description ||
				contract.description ||
				"No description available.";
			const resourceLinks =
				contractDetails?.resourceLinks || contract.resourceLinks || [];

			return `
GOVERNMENT CONTRACT OPPORTUNITY

Document ID: ${contract.noticeId}
Title: ${contract.title}

BASIC INFORMATION
=================

Solicitation Number: ${contract.solicitationNumber || "N/A"}
Type: ${contract.type || "N/A"}
Set-Aside Type: ${contract.typeOfSetAsideDescription || "N/A"}
Competition Type: ${contract.fullParentPathName || "N/A"}

IMPORTANT DATES
===============

Posted Date: ${
				contract.postedDate
					? new Date(contract.postedDate).toLocaleDateString()
					: "N/A"
			}
Response Due Date: ${
				contract.responseDeadLine
					? new Date(contract.responseDeadLine).toLocaleDateString()
					: "N/A"
			}
Archive Date: ${
				contract.archiveDate
					? new Date(contract.archiveDate).toLocaleDateString()
					: "N/A"
			}

LOCATION INFORMATION
===================

Office: ${contract.officeAddress?.city || "N/A"}, ${
				contract.officeAddress?.state || "N/A"
			} ${contract.officeAddress?.zipcode || ""}
Point of Contact: ${contract.pointOfContact?.[0]?.fullName || "N/A"}
Email: ${contract.pointOfContact?.[0]?.email || "N/A"}
Phone: ${contract.pointOfContact?.[0]?.phone || "N/A"}

DESCRIPTION
===========

${description}

ADDITIONAL INFORMATION
=====================

NAICS Code: ${contract.naicsCode || "N/A"}
Classification Code: ${contract.classificationCode || "N/A"}
Active Status: ${contract.active ? "Active" : "Inactive"}

RESOURCE LINKS
==============

${
	resourceLinks.length > 0
		? resourceLinks
				.map(
					(link: { title?: string; url?: string; href?: string }) =>
						`${link.title || "Link"}: ${"url" in link ? link.url : link.href}`,
				)
				.join("\n")
		: "No resource links available."
}

${
	contractDetails?.attachments && contractDetails.attachments.length > 0
		? `
ATTACHMENTS
===========

${contractDetails.attachments
	.map(
		(attachment: { title: string; url: string }) =>
			`${attachment.title}: ${attachment.url}`,
	)
	.join("\n")}
`
		: ""
}
    `;
		},
		[contractDetails],
	);

	// Generate document content from contract data
	useEffect(() => {
		if (contract) {
			const documentContent = generateDocumentContent(contract);
			setContent(contractContent || documentContent);
		}
	}, [contract, contractContent, generateDocumentContent]);

	// Helper function to get time ago
	const getTimeAgo = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		if (diffInDays === 0) return "Today";
		if (diffInDays === 1) return "1 day ago";
		if (diffInDays > 1) return `${diffInDays} days ago`;
		if (diffInDays < 0) return `in ${Math.abs(diffInDays)} days`;
		return "Unknown";
	};

	// Helper function to get urgency indicator
	const getUrgencyIndicator = (dueDate: string) => {
		const due = new Date(dueDate);
		const now = new Date();
		const diffInMs = due.getTime() - now.getTime();
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		if (diffInDays < 0) return { color: "text-red", text: "Overdue" };
		if (diffInDays <= 1) return { color: "text-red", text: "Due today" };
		if (diffInDays <= 3) return { color: "text-yellow-500", text: "Due soon" };
		if (diffInDays <= 7)
			return { color: "text-blue-500", text: "Due this week" };
		return { color: "text-green-500", text: "Upcoming" };
	};

	// Helper function to get file icon
	const getFileIcon = (fileName: string) => {
		const extension = fileName.split(".").pop()?.toLowerCase();
		switch (extension) {
			case "pdf":
				return <FileText className="h-5 w-5 text-red" />;
			case "doc":
			case "docx":
				return <FileText className="h-5 w-5 text-blue-500" />;
			case "xls":
			case "xlsx":
				return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
			case "jpg":
			case "jpeg":
			case "png":
			case "gif":
				return <FileImage className="h-5 w-5 text-purple-500" />;
			case "zip":
			case "rar":
				return <FileArchive className="h-5 w-5 text-orange-500" />;
			default:
				return <File className="h-5 w-5 text-gray-500" />;
		}
	};

	const formatDescription = (description: string): string[] => {
		if (!description) return ["No description available."];

		const stripHtml = (html: string): string => {
			const tmp = document.createElement("div");
			tmp.innerHTML = html;
			return tmp.textContent || tmp.innerText || "";
		};

		return splitProseParagraphs(stripHtml(description));
	};

	// AI Analysis functions
	const performAIAnalysis = async () => {
		if (!content) return;

		setIsAnalyzing(true);
		try {
			console.log("Starting AI contract analysis...");

			const enhancedContent = contractDetails?.description
				? `${content}\n\nENHANCED DESCRIPTION FROM SAM.GOV:\n${contractDetails.description}`
				: content;

			const response = await fetch("/api/contract-analysis", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					content: enhancedContent,
					contractTitle: contract?.title,
					contractType: contract?.type,
					analysisType: "comprehensive",
				}),
			});

			if (!response.ok) {
				throw new Error(
					`AI analysis failed: ${response.status} ${response.statusText}`,
				);
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || "AI analysis failed");
			}

			console.log("AI analysis completed:", {
				keyTermsCount: result.analysis.keyTerms.length,
				confidence: result.analysis.confidence,
				fallback: result.fallback || false,
			});

			setAiAnalysis(result.analysis);
			setStarterPrompts(result.starterPrompts || []);
			setSuggestedQuestions(result.suggestedQuestions || []);
			if (result.analysis?.summary) {
				setContractMessages([
					{
						id: "summary",
						role: "assistant",
						text: result.analysis.summary,
					},
				]);
			}

			if (result.fallback) {
				console.warn(
					"Using fallback analysis - AI service may not be configured",
				);
			}
		} catch (error) {
			console.error("Error performing AI analysis:", error);
			const fallbackAnalysis: AIAnalysis = {
				keyTerms: ["contract", "agreement", "terms", "conditions"],
				importantDates: [
					{
						label: "Posted Date",
						date: contract?.postedDate || "Not specified",
					},
					{
						label: "Response Deadline",
						date: contract?.responseDeadLine || "Not specified",
					},
				],
				financialInfo: [
					{ label: "Contract Type", value: contract?.type || "Not specified" },
					{
						label: "Set-Aside",
						value: contract?.typeOfSetAsideDescription || "None",
					},
				],
				parties: contract?.fullParentPathName
					? [{ name: contract.fullParentPathName, role: "Contracting Agency" }]
					: [],
				risks: [
					{
						risk: "AI analysis service not available",
						severity: "medium",
						context: "Please configure AI service for detailed analysis",
					},
				],
				opportunities: [
					{
						opportunity: "Enable AI analysis for comprehensive insights",
						impact: "high",
						context: "AI service would provide detailed contract analysis",
					},
				],
				recommendations: [
					{
						recommendation: "Configure AI analysis service",
						priority: "high",
						context: "AI service configuration needed for enhanced analysis",
					},
				],
				complianceRequirements: [],
				performanceMetrics: [],
				summary:
					"Basic analysis completed. AI service is required for comprehensive contract analysis.",
				confidence: 0.3,
			};

			setAiAnalysis(fallbackAnalysis);
		} finally {
			setIsAnalyzing(false);
		}
	};

	const sendContractMessage = async (question: string) => {
		if (!question.trim() || !content) return;

		const userMessage: ContractChatMessage = {
			id: `${Date.now()}`,
			role: "user",
			text: question.trim(),
		};
		setContractMessages((prev) => [...prev, userMessage]);
		setIsAiLoading(true);
		try {
			const enhancedContent = contractDetails?.description
				? `${content}\n\nENHANCED DESCRIPTION FROM SAM.GOV:\n${contractDetails.description}`
				: content;

			const previousContext = [...contractMessages, userMessage]
				.slice(-4)
				.map((message) => `${message.role}: ${message.text}`)
				.join("\n");

			const response = await fetch("/api/ai-analyze", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "question",
					context: "contract",
					question: question.trim(),
					fileName: contract?.title || "Contract Document",
					fileType: "contract",
					fileContent: enhancedContent,
					previousContext,
				}),
			});

			if (!response.ok) {
				throw new Error(
					`AI chat failed: ${response.status} ${response.statusText}`,
				);
			}

			const result = await response.json();
			setSuggestedQuestions(result.suggestedQuestions || []);
			setContractMessages((prev) => [
				...prev,
				{
					id: `${Date.now()}-ai`,
					role: "assistant",
					text:
						result.answerMarkdown ||
						result.answer ||
						"I could not answer that.",
					citations: result.citations || [],
				},
			]);
		} catch (error) {
			console.error("Error getting AI response:", error);
			setContractMessages((prev) => [
				...prev,
				{
					id: `${Date.now()}-error`,
					role: "assistant",
					text: "Sorry, I encountered an error while analyzing your question. Please try again.",
				},
			]);
		} finally {
			setIsAiLoading(false);
		}
	};

	if (!contract) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="flex max-h-[95vh] w-[96vw] max-w-384 flex-col overflow-y-auto rounded-[26px] p-0 shadow-drop-1 sm:max-w-384">
				<DialogHeader className="px-6 py-6 pb-4">
					{/* Action Buttons */}
					<div className="flex items-center gap-2 justify-end">
						<Button size="sm" className="primary-btn">
							<Star className="h-4 w-4" />
							Save
						</Button>
						<Button
							size="sm"
							disabled={isAnalyzing}
							onClick={() => {
								setShowAiPanel(true);
								setShowMainDescription(true);
								setShowContractFacts(false);
								void performAIAnalysis();
							}}
							className="shadow-drop-1 primary-btn"
						>
							{isAnalyzing ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Sparkles className="h-4 w-4" />
							)}
							AI Analysis
						</Button>
					</div>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div>
								<DialogTitle className="mt-4 text-xl font-bold sidebar-gradient-text">
									{contract.title}
								</DialogTitle>
								<div className="text-sm text-gray-600 mt-1">
									ID: {contract.noticeId}
								</div>
							</div>
						</div>
					</div>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col space-y-6 px-6 pb-6">
					{/* Smart Summary Section */}
					<Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
						<CardHeader
							className="pb-3 cursor-pointer"
							onClick={() => setShowSmartSummary(!showSmartSummary)}
						>
							<div className="flex items-center justify-between">
								<CardTitle className="text-lg flex items-center gap-2 sidebar-gradient-text font-semibold">
									<Lightbulb className="h-5 w-5 text-cyan-600" />
									Smart Summary
								</CardTitle>
								{showSmartSummary ? (
									<ChevronDownIcon className="h-4 w-4 text-gray-500" />
								) : (
									<ChevronRight className="h-4 w-4 text-gray-500" />
								)}
							</div>
						</CardHeader>
						{showSmartSummary && (
							<CardContent>
								<p className="text-sm text-gray-700 leading-relaxed">
									{aiAnalysis?.summary ||
										`The ${
											contract.fullParentPathName || "Department"
										} is seeking bids for ${
											contract.type?.toLowerCase() || "services"
										} for its ${
											contract.officeAddress?.city || "facilities"
										}. This contract opportunity involves ${
											contract.typeOfSetAsideDescription
												? `a ${contract.typeOfSetAsideDescription.toLowerCase()}`
												: "competitive bidding"
										}. The contract will be performed at ${
											contract.officeAddress?.city || "specified location"
										}, ${
											contract.officeAddress?.state || ""
										} and requires compliance with all applicable federal regulations and requirements.`}
								</p>
							</CardContent>
						)}
					</Card>

					{/* Full Description + AI pane: same row height; AI scrolls internally */}
					<div
						className={
							showAiPanel
								? "grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,36rem)] lg:gap-0"
								: "grid grid-cols-1"
						}
					>
						<Card
							ref={descriptionCardRef}
							className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur"
						>
							<CardHeader
								className="pb-3 cursor-pointer"
								onClick={() => setShowMainDescription(!showMainDescription)}
							>
								<div className="flex items-center justify-between">
									<CardTitle className="text-lg flex items-center gap-2 sidebar-gradient-text font-semibold">
										<FileText className="h-5 w-5 text-cyan-600" />
										Full Description
									</CardTitle>
									{showMainDescription ? (
										<ChevronDownIcon className="h-4 w-4 text-gray-500" />
									) : (
										<ChevronRight className="h-4 w-4 text-gray-500" />
									)}
								</div>
							</CardHeader>
							{showMainDescription && (
								<CardContent>
									<div className="space-y-3 text-sm text-slate-700 leading-relaxed">
										{formatDescription(
											contractDetails?.description ||
												contract.description ||
												"No description available.",
										).map((paragraph, index) => (
											<p key={`${index}-${paragraph.slice(0, 24)}`}>
												{paragraph}
											</p>
										))}
									</div>
								</CardContent>
							)}
						</Card>

						{showAiPanel ? (
							<div
								className="flex flex-col overflow-hidden rounded-xl border border-light-300 bg-light-400/30 backdrop-blur lg:rounded-none lg:border-0 lg:border-l lg:border-light-300"
								style={
									aiPaneHeight != null ? { height: aiPaneHeight } : undefined
								}
							>
								<div className="flex shrink-0 flex-col justify-center border-b border-light-300 bg-white/80 p-4 backdrop-blur">
									<div className="mb-4 flex items-center justify-center">
										<h3 className="flex items-center gap-2 font-bold sidebar-gradient-text">
											<Image
												src="/assets/images/assistant.svg"
												alt="AI Analysis"
												width={30}
												height={30}
											/>
											CAALM Contract Assistant
										</h3>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setShowAiPanel(false)}
											className="shadow-drop-1"
										>
											<Minimize2 className="h-4 w-4" />
										</Button>
									</div>

									{!aiAnalysis ? (
										<Button
											onClick={performAIAnalysis}
											disabled={isAnalyzing}
											className="w-full shadow-drop-1 primary-btn"
										>
											{isAnalyzing ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Analyzing...
												</>
											) : (
												<>
													<Lightbulb className="h-4 w-4" />
													Analyze Document
												</>
											)}
										</Button>
									) : (
										<Button
											onClick={performAIAnalysis}
											variant="outline"
											disabled={isAnalyzing}
											className="w-full! shadow-drop-1 primary-btn"
										>
											{isAnalyzing ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Re-analyzing...
												</>
											) : (
												<>
													<RotateCw className="h-4 w-4" />
													Refresh Analysis
												</>
											)}
										</Button>
									)}
								</div>

								{aiAnalysis ? (
									<>
										<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
											<ContractAnalysisCards analysis={aiAnalysis} />
											<div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
												<ContractAssistantChat
													messages={contractMessages}
													starterPrompts={starterPrompts}
													suggestedQuestions={suggestedQuestions}
													loading={isAiLoading}
													analyzing={isAnalyzing}
													onSend={sendContractMessage}
													footer={
														<div>
															<div className="mb-2 flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
																<FileText className="h-4 w-4 text-[#0f5384]" />
																Proposal Generation
															</div>
															<Button
																size="sm"
																className="w-full! shadow-drop-1 primary-btn"
																onClick={() => {
																	console.log(
																		"Generate proposal for contract:",
																		contract?.noticeId,
																	);
																}}
															>
																Generate Proposal
															</Button>
															<p className="mt-2 text-center text-xs text-gray-500">
																Create a professional proposal based on AI
																analysis
															</p>
														</div>
													}
												/>
											</div>
										</div>

										{/* Footer sits on the pane bottom = Full Description bottom */}
										<div className="shrink-0 px-4 pb-4 pt-0">
											<AskCaalmComposer
												loading={isAiLoading}
												onSend={sendContractMessage}
											/>
										</div>
									</>
								) : null}
							</div>
						) : null}
					</div>

					{/* Rest of document column */}
					<div className="flex min-w-0 flex-col space-y-6">
						{/* 3-Column Information Grid — collapsed when assistant is open */}
						{showAiPanel ? (
							<div className="border-t border-slate-200 pt-4">
								<button
									type="button"
									onClick={() => setShowContractFacts((open) => !open)}
									className="flex w-full cursor-pointer items-center justify-between py-2 text-left"
								>
									<span className="text-sm font-semibold sidebar-gradient-text">
										Contract details
									</span>
									{showContractFacts ? (
										<ChevronDownIcon className="h-4 w-4 text-slate-500" />
									) : (
										<ChevronRight className="h-4 w-4 text-slate-500" />
									)}
								</button>
							</div>
						) : null}
						{(!showAiPanel || showContractFacts) && (
						<div className="flex flex-col lg:flex-row lg:space-x-6">
							{/* Left Column */}
							<div className="flex-1 space-y-4">
								{/* Office */}
								<div className="flex items-center gap-3">
									<Building className="h-10 w-10 text-cyan-600" />
									<div>
										<div className="text-sm font-medium text-gray-900">
											Office
										</div>
										<div className="text-sm text-gray-600">
											{contract.fullParentPathName || "N/A"}
										</div>
										{contract.officeAddress && (
											<div className="text-sm text-gray-600">
												{contract.officeAddress.city},{" "}
												{contract.officeAddress.state}{" "}
												{contract.officeAddress.zipcode}
											</div>
										)}
									</div>
								</div>

								{/* Notice Type */}
								<div className="flex items-center gap-3">
									<File className="h-4 w-4 text-cyan-600" />
									<div>
										<div className="text-sm font-medium text-gray-900">
											Notice Type
										</div>
										<div className="text-sm text-gray-600">
											{contract.type || "N/A"}
										</div>
									</div>
								</div>

								{/* NAICS Code */}
								<div className="flex items-center gap-3">
									<File className="h-4 w-4 text-cyan-600" />
									<div>
										<div className="text-sm font-medium text-gray-900">
											NAICS Code
										</div>
										<div className="text-sm text-gray-600">
											{contract.naicsCode || "N/A"}
										</div>
									</div>
								</div>

								{/* Primary Contact */}
								<div className="flex items-center gap-3">
									<User className="h-4 w-4 text-cyan-600" />
									<div>
										<div className="text-sm font-medium text-gray-900">
											Primary Contact
										</div>
										<div className="text-sm text-gray-600">
											{contract.pointOfContact?.[0]?.fullName || "N/A"}
										</div>
										{contract.pointOfContact?.[0]?.email && (
											<div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
												<Mail className="h-3 w-3" />
												{contract.pointOfContact[0].email}
											</div>
										)}
										{contract.pointOfContact?.[0]?.phone && (
											<div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
												<Phone className="h-3 w-3" />
												{contract.pointOfContact[0].phone}
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Vertical Divider */}
							<div className="hidden lg:block w-px bg-gray-300 self-stretch mx-3"></div>

							{/* Middle Column */}
							<div className="flex-1 space-y-4">
								{/* Buyer */}
								<div className="flex items-center gap-3">
									<Building className="h-10 w-10 text-cyan-600" />
									<div>
										<div className="text-sm font-medium text-gray-900">
											Buyer
										</div>
										<div className="text-sm text-gray-600">
											{contract.fullParentPathName || "N/A"}
										</div>
									</div>
								</div>

								{/* Location */}
								<div className="flex items-center gap-3">
									<MapPin className="h-4 w-4 text-cyan-600" />
									<div>
										<div className="text-sm font-medium text-gray-900">
											Location
										</div>
										<div className="text-sm text-gray-600">
											{contract.placeOfPerformance?.city?.name ||
												contract.officeAddress?.city ||
												"N/A"}
										</div>
										<div className="text-sm text-gray-600">
											{contract.placeOfPerformance?.state?.name ||
												contract.officeAddress?.state ||
												"N/A"}
										</div>
										<div className="text-sm text-gray-600">
											{contract.placeOfPerformance?.zip ||
												contract.officeAddress?.zipcode ||
												"N/A"}
										</div>
									</div>
								</div>

								{/* FPDS Code */}
								<div className="flex items-center gap-3">
									<File className="h-4 w-4 text-cyan-600" />
									<div>
										<div className="text-sm font-medium text-gray-900">
											FPDS Code
										</div>
										<div className="text-sm text-gray-600">
											{contract.classificationCode || "N/A"}
										</div>
									</div>
								</div>

								{/* Set Aside */}
								<div className="flex items-center gap-3">
									<Shield className="h-4 w-4 text-cyan-600" />
									<div>
										<div className="text-sm font-medium text-gray-900">
											Set Aside
										</div>
										<div className="text-sm text-gray-600">
											{contract.typeOfSetAsideDescription || "None"}
										</div>
									</div>
								</div>
							</div>

							{/* Vertical Divider */}
							<div className="hidden lg:block w-px bg-gray-300 self-stretch mx-3"></div>

							{/* Right Column - Timeline */}
							<div className="flex-1 space-y-4">
								<div className="relative">
									{/* Timeline Line */}
									<div className="absolute left-[5px] top-5 bottom-5 w-0.5 h-[70px] bg-gray-300"></div>

									<div className="space-y-6">
										{/* Post Date */}
										<div className="flex items-start gap-4">
											<div className="w-3 h-3 border-2 border-cyan-500 rounded-full mt-1 flex-shrink-0"></div>
											<div className="flex-1">
												<div className="text-sm font-medium text-gray-900">
													POST DATE
												</div>
												<div className="text-lg font-semibold text-gray-900">
													{contract.postedDate
														? new Date(contract.postedDate).toLocaleDateString()
														: "N/A"}
												</div>
												<div className="text-sm text-gray-500">
													{contract.postedDate
														? getTimeAgo(contract.postedDate)
														: "N/A"}
												</div>
											</div>
										</div>

										{/* Due Date */}
										<div className="flex items-start gap-4">
											<div className="w-3 h-3 border-2 border-cyan-500 rounded-full mt-1 flex-shrink-0"></div>

											<div className="flex-1">
												<div className="text-sm font-medium text-gray-900">
													DUE DATE
												</div>
												<div className="text-lg font-semibold text-gray-900">
													{contract.responseDeadLine
														? new Date(
																contract.responseDeadLine,
															).toLocaleDateString()
														: "N/A"}
												</div>
												<div
													className={`text-sm ${
														contract.responseDeadLine
															? getUrgencyIndicator(contract.responseDeadLine)
																	.color
															: "text-gray-500"
													}`}
												>
													{contract.responseDeadLine
														? getUrgencyIndicator(contract.responseDeadLine)
																.text
														: "N/A"}
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						)}

						{/* Attachments Section */}
						{contractDetails?.attachments &&
							contractDetails.attachments.length > 0 && (
								<Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
									<CardHeader className="pb-3">
										<CardTitle className="text-lg flex items-center gap-2 sidebar-gradient-text font-semibold">
											<FileText className="h-5 w-5 text-cyan-600" />
											Attachments
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{contractDetails.attachments.map(
												(
													attachment: {
														title: string;
														url: string;
														type?: string;
													},
													index: number,
												) => (
													<div
														key={index}
														className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
													>
														<div className="flex items-center gap-3">
															{getFileIcon(attachment.title)}
															<div>
																<div className="text-sm font-medium text-gray-900">
																	{attachment.title}
																</div>
																{attachment.type && (
																	<div className="text-xs text-gray-500">
																		({attachment.type})
																	</div>
																)}
															</div>
														</div>
														<div className="flex items-center gap-2">
															<Button
																variant="outline"
																size="sm"
																className="shadow-drop-1 border-cyan-500 hover:border-cyan-600 focus:border-cyan-600"
															>
																<Bot className="h-4 w-4" />
																Summarize
															</Button>
															<Button
																variant="outline"
																size="sm"
																className="shadow-drop-1 border-cyan-500 hover:border-cyan-600 focus:border-cyan-600"
															>
																<Download className="h-4 w-4" />
																Download
															</Button>
														</div>
													</div>
												),
											)}
										</div>
									</CardContent>
								</Card>
							)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ContractDocumentViewer;
