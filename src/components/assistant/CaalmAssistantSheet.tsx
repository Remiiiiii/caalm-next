"use client";

import { FileSymlink, Loader2, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	type MutableRefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import AssistantChatThread from "@/components/assistant/AssistantChatThread";
import AssistantFocusWindow from "@/components/assistant/AssistantFocusWindow";
import AssistantHistoryList from "@/components/assistant/AssistantHistoryList";
import AssistantInPanelOverlay, {
	AssistantInPanelActions,
} from "@/components/assistant/AssistantInPanelOverlay";
import AssistantPendingActionCard from "@/components/assistant/AssistantPendingActionCard";
import AssistantPreviewSheetShell from "@/components/assistant/AssistantPreviewSheetShell";
import type { AssistantSheetTab } from "@/components/assistant/AssistantSegmentedTabs";
import AssistantSheetComposer from "@/components/assistant/AssistantSheetComposer";
import AssistantSheetHeader from "@/components/assistant/AssistantSheetHeader";
import type {
	AssistantSuggestion,
	UseCaalmAssistantReturn,
} from "@/components/assistant/assistantTypes";
import { dispatchOpenCloseCap } from "@/lib/assistant/open-close-cap-client";
import { Button } from "@/components/ui/button";
import {
	SHEET_CHIP_IDLE,
	SHEET_CHIP_SELECTED,
} from "@/components/ui/sheet-chip";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useBusyAction } from "@/hooks/useBusyAction";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadAssistantChatTxt } from "@/lib/assistant/exportAssistantChatTxt";
import { mentionableRoutes } from "@/lib/assistant/mention-routes";

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

const FEEDBACK_REASONS = [
	{ label: "Wrong info", value: "wrong_info" },
	{ label: "Incomplete", value: "incomplete" },
	{ label: "Confusing", value: "confusing" },
	{ label: "Off-topic", value: "off_topic" },
	{ label: "Other", value: "other" },
] as const;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	assistant: UseCaalmAssistantReturn;
	/** When true on this open, skip resume so a guided new chat is not overwritten. */
	skipResumeOnOpenRef?: MutableRefObject<boolean>;
	/** Increment to force the Chat tab (Show me how). */
	chatTabNonce?: number;
};

export default function CaalmAssistantSheet({
	open,
	onOpenChange,
	assistant,
	skipResumeOnOpenRef,
	chatTabNonce = 0,
}: Props) {
	const { toast } = useToast();
	const { user } = useAuth();
	const { permissions } = usePermissions();
	const router = useRouter();
	const firstName = getFirstName(
		user as { name?: string; fullName?: string } | null,
	);
	const mentions = useMemo(() => mentionableRoutes(permissions), [permissions]);
	const [tab, setTab] = useState<AssistantSheetTab>("chat");
	const [downloadChat, downloadingChat] = useBusyAction(() =>
		downloadAssistantChatTxt(assistant.messages, assistant.conversationId),
	);
	const [input, setInput] = useState("");
	const [newChatOpen, setNewChatOpen] = useState(false);
	const [feedbackOpen, setFeedbackOpen] = useState(false);
	const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(
		null,
	);
	const [feedbackPromptId, setFeedbackPromptId] = useState<string | null>(null);
	const [feedbackReasons, setFeedbackReasons] = useState<string[]>([]);
	const [feedbackComment, setFeedbackComment] = useState("");
	const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
			setTab("chat");
			return;
		}
		void assistant.loadHistory();
		if (skipResumeOnOpenRef?.current) {
			skipResumeOnOpenRef.current = false;
			return;
		}
		void assistant.resumeActiveSession();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- resume when sheet opens only
	}, [open]);

	useEffect(() => {
		if (chatTabNonce > 0) setTab("chat");
	}, [chatTabNonce]);

	useEffect(() => {
		// Scroll only the thread pane — scrollIntoView can move outer sheet ancestors
		// and leave the header/composer looking blank or flipped.
		const scrollArea = endRef.current?.closest(
			".glass-dialog-scroll-area",
		) as HTMLElement | null;
		if (scrollArea) {
			scrollArea.scrollTop = scrollArea.scrollHeight;
		}
	}, [assistant.messages, assistant.isSending]);

	const handleTabChange = (next: AssistantSheetTab) => {
		setTab(next);
		if (next === "history") void assistant.loadHistory();
	};

	const handleSend = (text = input, contextRoutes?: string[]) => {
		const trimmed = text.trim();
		if (!trimmed) return;
		setInput("");
		void assistant.sendMessage(trimmed, { contextRoutes });
		if (tab === "history") setTab("chat");
	};

	/** Leave Focus, hide the sheet, then go to the href (scroll hash on same page). */
	const navigateAssistantHref = (href: string) => {
		setTab("chat");
		onOpenChange(false);
		router.push(href);
		const hashIdx = href.indexOf("#");
		const hash = hashIdx >= 0 ? href.slice(hashIdx + 1) : "";
		if (!hash) return;
		window.setTimeout(() => {
			window.document
				.getElementById(hash)
				?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 120);
	};

	const handleSuggestion = (suggestion: AssistantSuggestion) => {
		if (suggestion.action.type === "navigate") {
			navigateAssistantHref(suggestion.action.href);
			return;
		}
		if (suggestion.action.type === "open_close_cap") {
			dispatchOpenCloseCap(suggestion.action);
			return;
		}
		void assistant.sendMessage(suggestion.action.text);
		if (tab === "history") setTab("chat");
	};

	const confirmNewChat = async () => {
		await assistant.startNewChat();
		setTab("chat");
		setNewChatOpen(false);
	};

	const submitFeedback = async () => {
		if (feedbackReasons.length < 1) return;
		setFeedbackSubmitting(true);
		try {
			const res = await fetch("/api/assistant/feedback", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					rating: "down",
					reasons: feedbackReasons,
					comment: feedbackComment.trim() || undefined,
					conversationId: assistant.conversationId,
					messageId: feedbackMessageId,
				}),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Failed to submit feedback");
			toast({ title: "Thanks for your feedback" });
			setFeedbackOpen(false);
			setFeedbackReasons([]);
			setFeedbackComment("");
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

	const feedbackValid = feedbackReasons.length >= 1;
	const feedbackLen = feedbackComment.length;
	const focusOpen = open && tab === "focus";
	const drawerOpen = open && tab !== "focus";

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
				}}
				title="What went wrong?"
				titleClassName="sidebar-gradient-text"
				footer={
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn cursor-pointer rounded-full px-5"
							aria-disabled={!feedbackValid || feedbackSubmitting}
							disabled={!feedbackValid || feedbackSubmitting}
							onClick={() => void submitFeedback()}
						>
							{feedbackSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<>
									<FileSymlink className="h-4 w-4" />
									Submit
								</>
							)}
						</Button>
					</div>
				}
			>
				<div className="text-left">
					<p className="-mt-1 mb-3 text-sm text-slate-500">
						Tell us what missed the mark.
					</p>
					<div
						role="group"
						aria-label="Reason for downvote"
						className="flex flex-wrap gap-2"
					>
						{FEEDBACK_REASONS.map((r) => {
							const selected = feedbackReasons.includes(r.value);
							return (
								<button
									key={r.value}
									type="button"
									aria-pressed={selected}
									onClick={() =>
										setFeedbackReasons((prev) =>
											selected
												? prev.filter((v) => v !== r.value)
												: [...prev, r.value],
										)
									}
									className={selected ? SHEET_CHIP_SELECTED : SHEET_CHIP_IDLE}
								>
									{r.label}
								</button>
							);
						})}
					</div>

					<label
						htmlFor="assistant-feedback-comment"
						className="mb-1.5 mt-4 block text-sm font-medium text-slate-700"
					>
						Add a comment{" "}
						<span className="font-normal text-slate-400">(optional)</span>
					</label>
					<Textarea
						id="assistant-feedback-comment"
						value={feedbackComment}
						onChange={(e) => setFeedbackComment(e.target.value.slice(0, 500))}
						placeholder="Anything else we should know?"
						rows={3}
						className="resize-y rounded-xl border-[0.25px] border-slate-300! bg-white text-slate-700"
					/>
					<div className="mt-1.5 flex justify-end">
						<span className="shrink-0 text-xs text-slate-500">
							{feedbackLen}/500
						</span>
					</div>
				</div>
			</AssistantInPanelOverlay>
		</>
	);

	const thread = (
		<AssistantChatThread
			assistant={assistant}
			firstName={firstName}
			endRef={endRef}
			feedbackPromptId={feedbackPromptId}
			onSuggestion={handleSuggestion}
			onQuickPrompt={(text) => void assistant.sendMessage(text)}
			onOpenHref={navigateAssistantHref}
			onThumbsDown={(id) => setFeedbackPromptId(id)}
			onLeaveFeedback={(id) => {
				setFeedbackMessageId(id);
				setFeedbackOpen(true);
				setFeedbackReasons([]);
				setFeedbackComment("");
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
	);

	const composerFooter =
		tab !== "history" && !assistant.conversationLoading ? (
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
					{assistant.pendingAction?.toolName === "create_calendar_event" ? (
						<AssistantPendingActionCard
							action={assistant.pendingAction}
							onConfirm={(argsPatch) => void assistant.confirmAction(argsPatch)}
							onArgsChange={(argsPatch) =>
								assistant.patchPendingArgs(argsPatch)
							}
							disabled={assistant.isSending}
						/>
					) : null}
					<AssistantSheetComposer
						value={input}
						onChange={setInput}
						onSend={() => handleSend()}
						sending={assistant.isSending}
						layoutKey={`${assistant.messages.length}:${assistant.isSending ? 1 : 0}`}
					/>
					<p className="w-full text-center text-xs text-slate-500">
						CAALM can make mistakes. Double-check replies.
					</p>
				</div>
			)
		) : undefined;

	return (
		<>
			<AssistantPreviewSheetShell
				open={drawerOpen}
				onOpenChange={onOpenChange}
				title="CAALM Assistant"
				header={
					<AssistantSheetHeader
						tab={tab === "focus" ? "chat" : tab}
						onTabChange={handleTabChange}
						onDownload={() => void downloadChat()}
						downloading={downloadingChat}
						canDownload={assistant.messages.length > 0}
						onNewChat={() => setNewChatOpen(true)}
						onClose={() => onOpenChange(false)}
					/>
				}
				overlay={overlay}
				footer={composerFooter}
			>
				{tab === "history" ? (
					<AssistantHistoryList
						conversations={assistant.conversations}
						activeId={assistant.conversationId}
						loading={assistant.historyLoading}
						loadingMore={assistant.historyLoadingMore}
						nextCursor={assistant.historyNextCursor}
						onLoadMore={() => {
							void assistant.loadMoreHistory();
						}}
						onSelect={(id) => {
							void assistant.selectConversation(id);
							setTab("chat");
						}}
					/>
				) : (
					thread
				)}
			</AssistantPreviewSheetShell>

			<AssistantFocusWindow
				open={focusOpen}
				assistant={assistant}
				firstName={firstName}
				endRef={endRef}
				feedbackPromptId={feedbackPromptId}
				onSuggestion={handleSuggestion}
				onQuickPrompt={(text) => void assistant.sendMessage(text)}
				onOpenHref={navigateAssistantHref}
				onThumbsDown={(id) => setFeedbackPromptId(id)}
				onLeaveFeedback={(id) => {
					setFeedbackMessageId(id);
					setFeedbackOpen(true);
					setFeedbackReasons([]);
					setFeedbackComment("");
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
				overlay={overlay}
				mentions={mentions}
				onSend={(text, contextRoutes) => handleSend(text, contextRoutes)}
				onCloseFocus={() => setTab("chat")}
				onRequestNewChat={() => setNewChatOpen(true)}
			/>
		</>
	);
}
