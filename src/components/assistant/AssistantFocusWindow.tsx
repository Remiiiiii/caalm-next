"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AtSign, Loader2, Mic, MoveUp, Plus, SquarePen, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import AssistantChatThread from "@/components/assistant/AssistantChatThread";
import type {
	AssistantSuggestion,
	UseCaalmAssistantReturn,
} from "@/components/assistant/assistantTypes";
import { Button } from "@/components/ui/button";
import { useComposerAutoGrow } from "@/hooks/useComposerAutoGrow";
import type { ImplementationChange } from "@/lib/assistant/implementation-analysis";
import type { AssistantMentionRoute } from "@/lib/assistant/mention-routes";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring" as const, stiffness: 280, damping: 28 };

function shortSessionTitle(assistant: UseCaalmAssistantReturn): string {
	const fromHistory = assistant.conversations.find(
		(c) => c.$id === assistant.conversationId,
	)?.title;
	const firstUser = assistant.messages.find((m) => m.role === "user")?.content;
	const raw = (fromHistory || firstUser || "New chat")
		.replace(/\s+/g, " ")
		.trim();
	if (raw.length <= 72) return raw;
	return `${raw.slice(0, 69).trimEnd()}…`;
}

/** Split `findingId — displayTitle` session titles for the Focus header. */
function parseFindingHeader(title: string): {
	findingId: string;
	displayTitle: string;
} | null {
	const match = title.match(/^(.+?)\s+[—-]\s+(.+)$/);
	if (!match?.[1] || !match[2]) return null;
	return { findingId: match[1].trim(), displayTitle: match[2].trim() };
}

export default function AssistantFocusWindow({
	open,
	assistant,
	firstName,
	endRef,
	feedbackPromptId,
	onSuggestion,
	onQuickPrompt,
	onOpenHref,
	onThumbsDown,
	onLeaveFeedback,
	onThumbsUp,
	inlineFeedback,
	overlay,
	implementationChanges,
	mentions,
	onSend,
	onCloseFocus,
	onRequestNewChat,
}: {
	open: boolean;
	assistant: UseCaalmAssistantReturn;
	firstName: string;
	endRef: React.RefObject<HTMLDivElement | null>;
	feedbackPromptId: string | null;
	onSuggestion: (suggestion: AssistantSuggestion) => void;
	onQuickPrompt: (text: string) => void;
	onOpenHref: (href: string) => void;
	onThumbsDown: (id: string) => void;
	onLeaveFeedback: (id: string) => void;
	onThumbsUp: (id: string) => void;
	inlineFeedback?: React.ReactNode;
	overlay?: React.ReactNode;
	implementationChanges?: ImplementationChange[];
	mentions: AssistantMentionRoute[];
	onSend: (text: string, contextRoutes: string[]) => void;
	onCloseFocus: () => void;
	/** Same new-chat confirm path as the sheet when this thread is closed. */
	onRequestNewChat: () => void;
}) {
	const conversationClosed = assistant.conversationStatus === "closed";
	const inputId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const mentionRef = useRef<HTMLDivElement>(null);
	const [text, setText] = useState("");
	const textareaRef = useComposerAutoGrow(text, 44, 140);
	const [files, setFiles] = useState<File[]>([]);
	const [mentionOpen, setMentionOpen] = useState(false);
	const [mentionIndex, setMentionIndex] = useState(0);
	const [selectedRoutes, setSelectedRoutes] = useState<AssistantMentionRoute[]>(
		[],
	);

	const sessionTitle = useMemo(
		() => shortSessionTitle(assistant),
		[assistant.conversationId, assistant.conversations, assistant.messages],
	);
	const findingHeader = useMemo(
		() => parseFindingHeader(sessionTitle),
		[sessionTitle],
	);

	const filteredMentions = useMemo(() => {
		const query = text.split("@").pop()?.toLowerCase() ?? "";
		if (!mentionOpen) return mentions;
		if (!query || text.endsWith("@")) return mentions;
		return mentions.filter((item) => item.label.toLowerCase().includes(query));
	}, [mentionOpen, mentions, text]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				if (mentionOpen) {
					setMentionOpen(false);
					return;
				}
				onCloseFocus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, mentionOpen, onCloseFocus]);


	const insertMention = (route: AssistantMentionRoute) => {
		const at = text.lastIndexOf("@");
		const prefix = at >= 0 ? text.slice(0, at).trimEnd() : text.trimEnd();
		const next = `${prefix}${prefix ? " " : ""}@${route.label} `.trimStart();
		setText(`${next} `);
		setSelectedRoutes((prev) =>
			prev.some((item) => item.href === route.href) ? prev : [...prev, route],
		);
		setMentionOpen(false);
	};

	const submit = () => {
		const trimmed = text.trim();
		if (!trimmed || assistant.isSending || conversationClosed) return;
		onSend(
			trimmed,
			selectedRoutes.map((item) => item.href),
		);
		setText("");
		setFiles([]);
		setSelectedRoutes([]);
	};

	const toolBtn =
		"flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#0f5384]";

	return (
		<AnimatePresence>
			{open ? (
				<div className="fixed inset-0 z-[80] flex items-center justify-center">
					<motion.button
						type="button"
						aria-label="Leave Focus mode"
						className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onCloseFocus}
					/>
					<motion.div
						role="dialog"
						aria-modal="true"
						aria-label={sessionTitle}
						className="glass-card relative z-[81] flex h-[80vh] w-[1088px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl shadow-2xl"
						initial={{ opacity: 0.85, scale: 0.96 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.98 }}
						transition={SPRING}
					>
						<div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-[#e7edf0] px-4 py-3">
							{findingHeader ? (
								<div
									className="flex min-w-0 flex-1 items-center gap-2"
									title={sessionTitle}
								>
									<span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-[#a0c4db]/60 bg-[#e1f3ff] px-2 py-0.5 font-mono text-xs font-semibold text-[#0f5384]">
										{findingHeader.findingId}
									</span>
									<p className="min-w-0 truncate text-sm font-semibold text-slate-700">
										{findingHeader.displayTitle}
									</p>
								</div>
							) : (
								<p
									className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700"
									title={sessionTitle}
								>
									{sessionTitle}
								</p>
							)}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 shrink-0 cursor-pointer hover:bg-slate-100"
								aria-label="Leave Focus mode"
								onClick={onCloseFocus}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						<div className="glass-dialog-scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-3">
							<AssistantChatThread
								assistant={assistant}
								firstName={firstName}
								endRef={endRef}
								feedbackPromptId={feedbackPromptId}
								onSuggestion={onSuggestion}
								onQuickPrompt={onQuickPrompt}
								onOpenHref={onOpenHref}
								onThumbsDown={onThumbsDown}
								onLeaveFeedback={onLeaveFeedback}
								onThumbsUp={onThumbsUp}
								inlineFeedback={inlineFeedback}
								implementationChanges={implementationChanges}
								suggestionsVariant="list"
							/>
						</div>
						{files.length > 0 ? (
							<div className="flex flex-wrap gap-2 border-t border-slate-200/80 px-4 py-2">
								{files.map((file) => (
									<span
										key={`${file.name}-${file.size}`}
										className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-600"
									>
										{file.name}
									</span>
								))}
							</div>
						) : null}
						{selectedRoutes.length > 0 ? (
							<div className="flex flex-wrap gap-1.5 px-4 pb-1">
								{selectedRoutes.map((route) => (
									<span
										key={route.href}
										className="rounded-full border border-[#078fab]/30 bg-[#e1f3ff] px-2 py-0.5 text-[11px] font-medium text-[#0f5384]"
									>
										@{route.label}
									</span>
								))}
							</div>
						) : null}
						<div className="relative border-t border-slate-200/80 px-3 py-3">
							{conversationClosed ? (
								<div className="flex flex-col gap-2 px-1">
									<p className="text-center text-sm text-slate-600">
										This conversation is closed. Start a new chat to continue.
									</p>
									<Button
										type="button"
										className="primary-btn w-full cursor-pointer rounded-full gap-2"
										onClick={onRequestNewChat}
									>
										<SquarePen className="h-4 w-4" />
										Start new chat
									</Button>
								</div>
							) : (
								<>
									{mentionOpen ? (
										<div
											ref={mentionRef}
											role="listbox"
											aria-label="Pages you can mention"
											className="absolute bottom-full left-3 z-10 mb-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
										>
											{filteredMentions.map((route, index) => (
												<button
													key={route.href}
													type="button"
													role="option"
													aria-selected={index === mentionIndex}
													className={cn(
														"flex w-full cursor-pointer px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50",
														index === mentionIndex && "bg-slate-50",
													)}
													onClick={() => insertMention(route)}
												>
													{route.label}
												</button>
											))}
										</div>
									) : null}
									<div className="rounded-2xl border-[0.5px] border-[#0f5384]/20 bg-white px-3 py-2.5 shadow-sm">
										<input
											ref={fileInputRef}
											id={inputId}
											type="file"
											accept="image/*,application/pdf,.pdf"
											className="sr-only"
											multiple
											onChange={(event) => {
												setFiles(Array.from(event.target.files ?? []));
											}}
										/>
										<textarea
											ref={textareaRef}
											value={text}
											onChange={(event) => {
												const next = event.target.value;
												setText(next);
												setMentionOpen(next.includes("@"));
											}}
											placeholder="Ask CAALM anything..."
											rows={1}
											className="min-h-11 max-h-[8.75rem] w-full resize-none overflow-hidden bg-transparent text-[13px] leading-5 text-slate-700 outline-none placeholder:text-slate-400"
											onKeyDown={(event) => {
												if (mentionOpen && filteredMentions.length) {
													if (event.key === "ArrowDown") {
														event.preventDefault();
														setMentionIndex(
															(index) => (index + 1) % filteredMentions.length,
														);
														return;
													}
													if (event.key === "ArrowUp") {
														event.preventDefault();
														setMentionIndex(
															(index) =>
																(index - 1 + filteredMentions.length) %
																filteredMentions.length,
														);
														return;
													}
													if (event.key === "Enter") {
														event.preventDefault();
														const chosen = filteredMentions[mentionIndex];
														if (chosen) insertMention(chosen);
														return;
													}
												}
												if (event.key === "Enter" && !event.shiftKey) {
													event.preventDefault();
													submit();
												}
											}}
										/>
										<div className="mt-2 flex items-center justify-between gap-2">
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													className={toolBtn}
													aria-label="Attach file"
													onClick={() => fileInputRef.current?.click()}
												>
													<Plus className="h-4 w-4" aria-hidden />
												</button>
												<button
													type="button"
													className={toolBtn}
													aria-label="Mention a page"
													onClick={() => {
														setMentionOpen(true);
														setText((prev) =>
															prev.endsWith("@") ? prev : `${prev}@`,
														);
													}}
												>
													<AtSign className="h-4 w-4" aria-hidden />
												</button>
											</div>
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-slate-400 opacity-50"
													aria-label="Voice input coming soon"
													title="Voice input coming soon"
													disabled
												>
													<Mic className="h-4 w-4" aria-hidden />
												</button>
												<button
													type="button"
													aria-label="Send message"
													disabled={assistant.isSending || !text.trim()}
													onClick={submit}
													className={cn(
														"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
														"disabled:pointer-events-none disabled:opacity-40",
														"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
													)}
													style={{
														backgroundImage:
															"linear-gradient(135deg, var(--chat-q-from) 0%, var(--chat-q-to) 100%)",
													}}
												>
													{assistant.isSending ? (
														<Loader2
															className="h-4 w-4 animate-spin text-white"
															aria-hidden
														/>
													) : (
														<MoveUp
															className="h-4 w-4 text-white"
															strokeWidth={2.25}
															aria-hidden
														/>
													)}
												</button>
											</div>
										</div>
									</div>
								</>
							)}
						</div>
						{overlay}
					</motion.div>
				</div>
			) : null}
		</AnimatePresence>
	);
}
