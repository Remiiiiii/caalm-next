"use client";

import {
	Download,
	HelpCircle,
	Loader2,
	PanelRightClose,
	Send,
	SquarePen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AssistantActionCompletedCard from "@/components/assistant/AssistantActionCompletedCard";
import AssistantActivityFeedCard from "@/components/assistant/AssistantActivityFeedCard";
import AssistantAvatar from "@/components/assistant/AssistantAvatar";
import AssistantHistoryList from "@/components/assistant/AssistantHistoryList";
import AssistantInPanelOverlay, {
	AssistantInPanelActions,
} from "@/components/assistant/AssistantInPanelOverlay";
import AssistantMeetingCreatedCard from "@/components/assistant/AssistantMeetingCreatedCard";
import AssistantMessageActions from "@/components/assistant/AssistantMessageActions";
import AssistantPendingActionCard from "@/components/assistant/AssistantPendingActionCard";
import AssistantPreviewSheetShell from "@/components/assistant/AssistantPreviewSheetShell";
import AssistantSuggestions from "@/components/assistant/AssistantSuggestions";
import AssistantThinkingIndicator from "@/components/assistant/AssistantThinkingIndicator";
import type {
	AssistantSuggestion,
	UseCaalmAssistantReturn,
} from "@/components/assistant/assistantTypes";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { downloadAssistantChatTxt } from "@/lib/assistant/exportAssistantChatTxt";
import { formatAssistantMarkdown } from "@/lib/assistant/formatMarkdown";
import { cn } from "@/lib/utils";

function getFirstName(
	user: {
		name?: string | null;
		fullName?: string | null;
	} | null,
): string {
	const raw =
		(user as { fullName?: string } | null)?.fullName || user?.name || "";
	const first = raw.trim().split(/\s+/)[0];
	return first || "there";
}

const QUICK_PROMPTS = [
	"What are audits in CAALM?",
	"How do contract approvals work?",
	"Show my pending tasks",
	"What contracts or licenses are expiring soon?",
];

type Tab = "chat" | "history";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	assistant: UseCaalmAssistantReturn;
};

export default function CaalmAssistantSheet({
	open,
	onOpenChange,
	assistant,
}: Props) {
	const { toast } = useToast();
	const { user } = useAuth();
	const router = useRouter();
	const firstName = getFirstName(
		user as { name?: string; fullName?: string } | null,
	);
	const [tab, setTab] = useState<Tab>("chat");
	const [input, setInput] = useState("");
	const [newChatOpen, setNewChatOpen] = useState(false);
	const [feedbackOpen, setFeedbackOpen] = useState(false);
	const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(
		null,
	);
	const [feedbackPromptId, setFeedbackPromptId] = useState<string | null>(null);
	const [feedbackComment, setFeedbackComment] = useState("");
	const [feedbackTouched, setFeedbackTouched] = useState(false);
	const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) {
			void assistant.loadHistory();
			void assistant.resumeActiveSession();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- resume when sheet opens only
	}, [open]);

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [assistant.messages, assistant.isSending]);

	const handleSend = () => {
		const text = input;
		setInput("");
		void assistant.sendMessage(text);
		setTab("chat");
	};

	const handleSuggestion = (suggestion: AssistantSuggestion) => {
		if (suggestion.action.type === "navigate") {
			router.push(suggestion.action.href);
			return;
		}
		void assistant.sendMessage(suggestion.action.text);
		setTab("chat");
	};

	const lastAssistantId = [...assistant.messages]
		.reverse()
		.find((m) => m.role === "assistant")?.id;

	const confirmNewChat = async () => {
		await assistant.startNewChat();
		setTab("chat");
		setNewChatOpen(false);
	};

	const submitFeedback = async () => {
		setFeedbackTouched(true);
		if (feedbackComment.trim().length < 1) return;
		setFeedbackSubmitting(true);
		try {
			const res = await fetch("/api/assistant/feedback", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					rating: "down",
					comment: feedbackComment.trim(),
					conversationId: assistant.conversationId,
					messageId: feedbackMessageId,
				}),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Failed to submit feedback");
			toast({ title: "Thanks for your feedback" });
			setFeedbackOpen(false);
			setFeedbackComment("");
			setFeedbackTouched(false);
			setFeedbackMessageId(null);
			setFeedbackPromptId(null);
		} catch (e) {
			toast({
				title: "Could not send feedback",
				description: e instanceof Error ? e.message : "Unknown error",
				variant: "destructive",
			});
		} finally {
			setFeedbackSubmitting(false);
		}
	};

	const header = (
		<div className="flex items-center justify-between gap-2">
			<div
				className="flex w-fit max-w-35 shrink-0 rounded-full bg-slate-100/90 p-0.5"
				role="tablist"
				aria-label="Assistant views"
			>
				{(["chat", "history"] as const).map((t) => (
					<button
						key={t}
						type="button"
						role="tab"
						aria-selected={tab === t}
						onClick={() => {
							setTab(t);
							if (t === "history") void assistant.loadHistory();
						}}
						className={cn(
							"cursor-pointer rounded-full px-3 py-1 text-xs font-medium capitalize transition-all duration-200",
							tab === t
								? "bg-white text-slate-700 shadow-sm"
								: "text-slate-600 hover:text-slate-700",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						)}
					>
						{t}
					</button>
				))}
			</div>

			<TooltipProvider delayDuration={200}>
				<div className="flex items-center gap-0.5">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-white/50 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								aria-label="Download chat"
								disabled={assistant.messages.length === 0}
								onClick={() =>
									downloadAssistantChatTxt(
										assistant.messages,
										assistant.conversationId,
									)
								}
							>
								<Download className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">Download chat</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-white/50 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								aria-label="Start new chat"
								onClick={() => setNewChatOpen(true)}
							>
								<SquarePen className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">Start new chat</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-white/50 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								aria-label="Hide chat window"
								onClick={() => onOpenChange(false)}
							>
								<PanelRightClose className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">Hide</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>
		</div>
	);

	const feedbackValid = feedbackComment.trim().length >= 1;
	const feedbackLen = feedbackComment.length;

	const overlay = (
		<>
			<AssistantInPanelOverlay
				open={newChatOpen}
				onClose={() => setNewChatOpen(false)}
				title="Start new chat"
				footer={
					<AssistantInPanelActions
						confirmLabel="Start new chat"
						onCancel={() => setNewChatOpen(false)}
						onConfirm={() => void confirmNewChat()}
					/>
				}
			>
				<p>
					After starting new chat, you will be able to access previous chats
					from the history
				</p>
			</AssistantInPanelOverlay>

			<AssistantInPanelOverlay
				open={feedbackOpen}
				onClose={() => {
					setFeedbackOpen(false);
					setFeedbackTouched(false);
				}}
				title="How can we improve your experience?"
				titleClassName="sidebar-gradient-text"
				footer={
					<Button
						type="button"
						className="primary-btn w-full cursor-pointer rounded-full"
						disabled={!feedbackValid || feedbackSubmitting}
						onClick={() => void submitFeedback()}
					>
						{feedbackSubmitting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"Leave feedback"
						)}
					</Button>
				}
			>
				<div className="text-left">
					<label
						htmlFor="assistant-feedback-comment"
						className="mb-1.5 block text-sm font-medium text-slate-700"
					>
						Comments
					</label>
					<Textarea
						id="assistant-feedback-comment"
						value={feedbackComment}
						onChange={(e) => setFeedbackComment(e.target.value.slice(0, 1000))}
						onBlur={() => setFeedbackTouched(true)}
						placeholder="Write your comments"
						rows={4}
						className={cn(
							"min-h-24 resize-y rounded-xl border-[0.25px] border-slate-300! bg-white text-slate-700",
							feedbackTouched &&
								!feedbackValid &&
								"border-red-500! focus-visible:ring-red-500/30",
						)}
					/>
					<div className="mt-1.5 flex items-start justify-between gap-2">
						{feedbackTouched && !feedbackValid ? (
							<p className="text-xs text-red-600">
								This field must be at least 1 characters long
							</p>
						) : (
							<span />
						)}
						<span className="shrink-0 text-xs text-slate-500">
							{feedbackLen}/1000
						</span>
					</div>
				</div>
			</AssistantInPanelOverlay>
		</>
	);

	return (
		<AssistantPreviewSheetShell
			open={open}
			onOpenChange={onOpenChange}
			title="CAALM Assistant"
			header={header}
			overlay={overlay}
			footer={
				tab === "chat" && !assistant.conversationLoading ? (
					assistant.conversationStatus === "closed" ? (
						<div className="flex flex-col gap-2">
							<p className="text-center text-sm text-slate-600">
								This conversation is closed. Start a new chat to continue.
							</p>
							<Button
								type="button"
								className="primary-btn w-full cursor-pointer rounded-full gap-2"
								onClick={() => setNewChatOpen(true)}
							>
								<SquarePen className="h-4 w-4" />
								Start new chat
							</Button>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{assistant.pendingAction ? (
								<AssistantPendingActionCard
									action={assistant.pendingAction}
									onConfirm={(argsPatch) =>
										void assistant.confirmAction(argsPatch)
									}
									onArgsChange={(argsPatch) =>
										assistant.patchPendingArgs(argsPatch)
									}
									disabled={assistant.isSending}
								/>
							) : null}

							<div className="relative w-full">
								<Textarea
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder="Ask CAALM anything…"
									rows={4}
									className={cn(
										"min-h-[7.5rem] w-full resize-none rounded-3xl bg-white text-slate-700 shadow-sm",
										"border-[0.25px] border-slate-300! px-4! pb-14! pt-3.5! pe-14!",
										"placeholder:text-slate-400 focus-visible:border-[#078FAB]! focus-visible:ring-[#078FAB]",
									)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSend();
										}
									}}
								/>
								<button
									type="button"
									onClick={handleSend}
									disabled={assistant.isSending || !input.trim()}
									aria-label="Send message"
									className={cn(
										"absolute z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-opacity duration-200",
										"disabled:pointer-events-none disabled:opacity-50",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									)}
									style={{
										bottom: 12,
										right: 12,
										left: "auto",
										backgroundImage:
											"linear-gradient(to right, #00c1cb, #078fab, #0e638f, #11487d, #162768)",
									}}
								>
									{assistant.isSending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Send className="h-4 w-4" />
									)}
								</button>
							</div>

							<p className="w-full text-center text-xs text-slate-500">
								CAALM can make mistakes. Double-check replies.
							</p>
						</div>
					)
				) : undefined
			}
		>
			{tab === "history" ? (
				<AssistantHistoryList
					conversations={assistant.conversations}
					activeId={assistant.conversationId}
					loading={assistant.historyLoading}
					onSelect={(id) => {
						void assistant.selectConversation(id);
						setTab("chat");
					}}
				/>
			) : (
				<div className="space-y-4">
					{assistant.conversationLoading ? (
						<LoadingSpinner
							size="md"
							label="Loading conversation…"
							className="py-16"
						/>
					) : null}

					{!assistant.conversationLoading &&
					assistant.messages.length === 0 &&
					!assistant.isSending ? (
						<div className="space-y-6 py-6">
							<div className="text-center">
								<div className="mb-4 flex justify-center">
									<AssistantAvatar size="hero" alt="CAALM" priority />
								</div>
								<p className="text-xl font-bold sidebar-gradient-text">
									Hello {firstName}
								</p>
								<p className="mt-1 text-base text-slate-600">
									How can I assist you today?
								</p>
							</div>
							<div className="space-y-3">
								<p className="flex items-center justify-center gap-2 text-sm text-slate-600">
									<HelpCircle className="h-4 w-4 text-[#0f5384]" />
									Try a quick prompt:
								</p>
								<div className="flex flex-wrap justify-center gap-2">
									{QUICK_PROMPTS.map((q) => (
										<button
											key={q}
											type="button"
											onClick={() => void assistant.sendMessage(q)}
											className="cursor-pointer rounded-full border border-slate-200 bg-white/50 px-3 py-1.5 text-xs text-slate-800 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
										>
											{q}
										</button>
									))}
								</div>
							</div>
						</div>
					) : null}

					{!assistant.conversationLoading
						? assistant.messages.map((m) => (
								<div
									key={m.id}
									className={cn(
										"flex gap-2",
										m.role === "user" ? "justify-end" : "justify-start",
									)}
								>
									{m.role === "assistant" ? (
										<AssistantAvatar size="md" />
									) : null}
									<div
										className={cn(
											"max-w-[85%] rounded-2xl px-3 py-2 text-sm",
											m.role === "user"
												? "bg-[#0f5384]/10 text-slate-700"
												: "bg-white/60 text-slate-700 border border-slate-200/80",
										)}
									>
										{m.meetingCreated ? (
											<>
												<p className="text-sm text-slate-700">
													Your meeting is on the calendar.
												</p>
												<AssistantMeetingCreatedCard
													meeting={m.meetingCreated}
													onOpenCalendar={() =>
														router.push(
															m.meetingCreated?.calendarHref || "/calendar",
														)
													}
												/>
											</>
										) : m.actionCompleted ? (
											<AssistantActionCompletedCard
												action={m.actionCompleted}
											/>
										) : m.activityFeed ? (
											<AssistantActivityFeedCard feed={m.activityFeed} />
										) : (
											<div
												className="prose prose-sm max-w-none text-slate-700"
												dangerouslySetInnerHTML={{
													__html: formatAssistantMarkdown(m.content),
												}}
											/>
										)}
										{m.sources?.length ? (
											<ul className="mt-2 space-y-1 border-t border-slate-200/80 pt-2">
												{m.sources.map((s) => (
													<li key={s.id} className="text-xs text-slate-600">
														Source: {s.title}
														{s.href ? (
															<button
																type="button"
																onClick={() => router.push(s.href!)}
																className="ml-1 cursor-pointer text-[#0f5384] underline"
															>
																Open
															</button>
														) : null}
													</li>
												))}
											</ul>
										) : null}
										{m.role === "assistant" &&
										m.id === lastAssistantId &&
										m.suggestions?.length &&
										!assistant.isSending &&
										assistant.conversationStatus !== "closed" ? (
											<AssistantSuggestions
												suggestions={m.suggestions}
												disabled={assistant.isSending}
												onSelect={handleSuggestion}
											/>
										) : null}
										{m.role === "assistant" ? (
											<AssistantMessageActions
												messageId={m.id}
												content={m.content}
												showLeaveFeedback={feedbackPromptId === m.id}
												onThumbsDown={(id) => setFeedbackPromptId(id)}
												onLeaveFeedback={(id) => {
													setFeedbackMessageId(id);
													setFeedbackOpen(true);
													setFeedbackComment("");
													setFeedbackTouched(false);
												}}
												onThumbsUp={(id) => {
													void fetch("/api/assistant/feedback", {
														method: "POST",
														headers: { "Content-Type": "application/json" },
														body: JSON.stringify({
															rating: "up",
															conversationId: assistant.conversationId,
															messageId: id,
														}),
													});
												}}
											/>
										) : null}
									</div>
								</div>
							))
						: null}

					{!assistant.conversationLoading && assistant.isSending ? (
						<AssistantThinkingIndicator />
					) : null}
					<div ref={endRef} />
				</div>
			)}
		</AssistantPreviewSheetShell>
	);
}
