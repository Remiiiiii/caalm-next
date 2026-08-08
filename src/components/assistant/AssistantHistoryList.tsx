"use client";

import AssistantAvatar from "@/components/assistant/AssistantAvatar";
import type { AssistantConversationSummary } from "@/components/assistant/assistantTypes";
import { formatRelativeTime } from "@/lib/assistant/formatMarkdown";
import { cn } from "@/lib/utils";

type Props = {
	conversations: AssistantConversationSummary[];
	activeId?: string | null;
	onSelect: (id: string) => void;
	loading?: boolean;
};

export default function AssistantHistoryList({
	conversations,
	activeId,
	onSelect,
	loading,
}: Props) {
	if (loading) {
		return (
			<p className="text-sm text-slate-600 py-8 text-center">
				Loading history…
			</p>
		);
	}

	if (!conversations.length) {
		return (
			<p className="text-sm text-slate-600 py-8 text-center">
				No past conversations yet. Start a chat to see history here.
			</p>
		);
	}

	return (
		<ul className="divide-y divide-slate-200/80">
			{conversations.map((c) => {
				const preview =
					c.lastMessagePreview ||
					(c.status === "closed" ? "Closed" : "Active conversation");
				return (
					<li key={c.$id}>
						<button
							type="button"
							onClick={() => onSelect(c.$id)}
							className={cn(
								"flex w-full cursor-pointer items-start gap-3 py-3 text-left transition-colors duration-200",
								"hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 rounded-lg px-1",
								activeId === c.$id && "bg-white/50",
							)}
						>
							<AssistantAvatar size="sm" />
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-slate-700">
									{c.title || "Conversation"}
								</p>
								<p className="truncate text-xs text-slate-600 mt-0.5">
									CAALM: {preview}
								</p>
								{c.status === "closed" ? (
									<p className="mt-0.5 text-xs text-slate-500">Closed</p>
								) : (
									<p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-green">
										<span
											className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-green"
											aria-hidden
										/>
										Active
									</p>
								)}
							</div>
							<span className="shrink-0 text-xs text-slate-500 pt-0.5">
								{formatRelativeTime(
									c.lastMessageAt || c.$createdAt || new Date().toISOString(),
								)}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
