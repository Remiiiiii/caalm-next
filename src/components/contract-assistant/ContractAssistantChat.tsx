"use client";

import { Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ContractAssistantMarkdown } from "@/components/contract-assistant/ContractAssistantMarkdown";
import { ContractAssistantStarters } from "@/components/contract-assistant/ContractAssistantStarters";
import { ContractFollowUpSuggestions } from "@/components/contract-assistant/ContractFollowUpSuggestions";
import { Textarea } from "@/components/ui/textarea";
import type {
	ContractCitation,
	ContractStarterPrompt,
} from "@/lib/ai/contract-assistant.types";

export type ContractChatMessage = {
	id: string;
	role: "user" | "assistant";
	text: string;
	citations?: ContractCitation[];
};

export function AskCaalmComposer({
	loading,
	onSend,
}: {
	loading?: boolean;
	onSend: (text: string) => void;
}) {
	const [draft, setDraft] = useState("");

	const send = (text: string) => {
		const next = text.trim();
		if (!next || loading) return;
		setDraft("");
		onSend(next);
	};

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
			<div className="mb-1.5 flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
				<Sparkles className="h-4 w-4 text-[#0f5384]" />
				Ask CAALM
			</div>
			<div className="relative w-full">
				<Textarea
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							send(draft);
						}
					}}
					placeholder="Ask a question about this contract..."
					rows={1}
					className="min-h-16 max-h-24 w-full resize-none border-[0.25px] border-slate-300! bg-white px-3! py-2.5! pe-14! text-sm focus-visible:border-[#078FAB]!"
					aria-label="Ask CAALM Contract Assistant"
				/>
				{/* Plain button: primary-btn's w-full breaks absolute bottom-right placement */}
				<button
					type="button"
					onClick={() => send(draft)}
					disabled={!draft.trim() || loading}
					aria-label="Send message"
					className="absolute top-1/2 right-5 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-opacity duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					style={{
						backgroundImage:
							"linear-gradient(to right, #00c1cb, #078fab, #0e638f, #11487d, #162768)",
					}}
				>
					{loading ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Send className="h-3.5 w-3.5" />
					)}
				</button>
			</div>
			<p className="mt-1.5 text-xs text-slate-500">
				Be sure to double-check responses; they may be inaccurate.
			</p>
		</div>
	);
}

export function ContractAssistantChat({
	messages,
	starterPrompts,
	suggestedQuestions,
	loading,
	analyzing,
	onSend,
	onJumpToPage,
	footer,
}: {
	messages: ContractChatMessage[];
	starterPrompts: ContractStarterPrompt[];
	suggestedQuestions: string[];
	loading?: boolean;
	analyzing?: boolean;
	onSend: (text: string) => void;
	onJumpToPage?: (page: number) => void;
	/** Optional content above the pinned Ask CAALM input (e.g. Proposal Generation) */
	footer?: ReactNode;
}) {
	const endRef = useRef<HTMLDivElement>(null);
	const hasUserMessage = messages.some((message) => message.role === "user");
	// Hide seeded summary chat copy until the user starts Q&A
	const visibleMessages = hasUserMessage
		? messages
		: messages.filter((message) => message.id !== "summary");

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, loading]);

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			{/* Message list is the only scroll region inside the chat card */}
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
				{!hasUserMessage ? (
					<ContractAssistantStarters
						prompts={starterPrompts}
						loading={analyzing}
						onSelect={onSend}
					/>
				) : null}

				{!hasUserMessage && !loading ? (
					<div className="flex min-h-40 flex-1 flex-col items-center justify-center px-4 py-8 text-center">
						<MessageSquareText
							className="mb-3 h-10 w-10 text-slate-400"
							strokeWidth={1.5}
							aria-hidden
						/>
						<p className="max-w-xs text-sm leading-snug text-slate-500">
							Ask a question or pick a prompt above to get started
						</p>
					</div>
				) : null}

				{hasUserMessage ? (
					<div className="space-y-4">
						{visibleMessages.map((message) =>
							message.role === "user" ? (
								<div
									key={message.id}
									className="ml-6 rounded-2xl bg-linear-to-r from-[#00C1CB] via-[#0E638F] to-[#162768] p-3 text-sm text-white"
								>
									{message.text}
								</div>
							) : (
								<div
									key={message.id}
									className="rounded-xl border border-slate-200 bg-white p-4"
								>
									<ContractAssistantMarkdown
										text={message.text}
										citations={message.citations || []}
										onJumpToPage={onJumpToPage}
									/>
								</div>
							),
						)}

						{loading ? (
							<div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
								<Loader2 className="h-4 w-4 animate-spin text-[#0f5384]" />
								Thinking…
							</div>
						) : null}

						<ContractFollowUpSuggestions
							questions={suggestedQuestions}
							disabled={loading}
							onSelect={onSend}
						/>
						<div ref={endRef} />
					</div>
				) : loading ? (
					<div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
						<Loader2 className="h-4 w-4 animate-spin text-[#0f5384]" />
						Thinking…
					</div>
				) : null}
			</div>

			{/* Always keep a typed input pinned so Q&A can continue after fallbacks */}
			<div className="shrink-0 space-y-3 border-t border-slate-200 bg-white p-4">
				{footer}
				<AskCaalmComposer loading={loading || analyzing} onSend={onSend} />
			</div>
		</div>
	);
}
