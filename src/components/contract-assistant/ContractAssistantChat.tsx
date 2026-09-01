"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
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
		<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
			<div className="mb-2 flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
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
					rows={3}
					className="min-h-20 w-full resize-none border-[0.25px] border-slate-300! bg-white px-3! pt-3! pb-12! pe-14! text-sm focus-visible:border-[#078FAB]!"
					aria-label="Ask CAALM Contract Assistant"
				/>
				{/* Plain button: primary-btn's w-full breaks absolute bottom-right placement */}
				<button
					type="button"
					onClick={() => send(draft)}
					disabled={!draft.trim() || loading}
					aria-label="Send message"
					className="absolute right-3 bottom-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-opacity duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
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
			<p className="mt-2 text-xs text-slate-500">
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
	/** Renders where Ask CAALM used to sit (e.g. Proposal Generation) */
	footer?: ReactNode;
}) {
	const endRef = useRef<HTMLDivElement>(null);
	const hasUserMessage = messages.some((message) => message.role === "user");
	// Summary is already in ContractAnalysisCards — hide the seeded chat copy until Q&A starts
	const visibleMessages = hasUserMessage
		? messages
		: messages.filter((message) => message.id !== "summary");

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, loading]);

	return (
		<div className="flex flex-col">
			<div className="space-y-4 p-4">
				{!hasUserMessage ? (
					<ContractAssistantStarters
						prompts={starterPrompts}
						loading={analyzing}
						onSelect={onSend}
					/>
				) : null}

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

				{hasUserMessage ? (
					<ContractFollowUpSuggestions
						questions={suggestedQuestions}
						disabled={loading}
						onSelect={onSend}
					/>
				) : null}
				<div ref={endRef} />
			</div>

			{footer ? (
				<div className="border-t border-slate-200 bg-white p-4">{footer}</div>
			) : null}
		</div>
	);
}
