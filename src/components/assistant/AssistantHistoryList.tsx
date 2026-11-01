"use client";

import { Loader2, MessageSquareText } from "lucide-react";
import { useMemo, useState } from "react";
import type { AssistantConversationSummary } from "@/components/assistant/assistantTypes";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/assistant/formatMarkdown";
import {
	filterConversationsByTitle,
	groupAssistantConversations,
} from "@/lib/assistant/groupAssistantHistory";
import { cn } from "@/lib/utils";

type Props = {
	conversations: AssistantConversationSummary[];
	activeId?: string | null;
	onSelect: (id: string) => void;
	loading?: boolean;
	loadingMore?: boolean;
	nextCursor?: string | null;
	onLoadMore?: () => void;
};

function previewText(c: AssistantConversationSummary): string {
	if (c.lastMessagePreview) return c.lastMessagePreview;
	return c.status === "closed" ? "Closed" : "Active conversation";
}

function HistoryRowSkeleton() {
	return (
		<div className="flex items-start gap-3 py-3 opacity-60" aria-hidden="true">
			<Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-md" />
			<div className="min-w-0 flex-1 space-y-2">
				<Skeleton className="h-3.5 w-2/3" />
				<Skeleton className="h-3 w-5/6" />
			</div>
			<Skeleton className="mt-1 h-3 w-8 shrink-0" />
		</div>
	);
}

function GroupHeader({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-3 px-1">
			<div className="h-px flex-1 bg-slate-300" aria-hidden />
			<span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#0f5384]">
				{label}
			</span>
			<div className="h-px flex-1 bg-slate-300" aria-hidden />
		</div>
	);
}

function HistoryRow({
	conversation,
	isActive,
	onSelect,
}: {
	conversation: AssistantConversationSummary;
	isActive: boolean;
	onSelect: (id: string) => void;
}) {
	return (
		<div role="listitem">
			<button
				type="button"
				onClick={() => onSelect(conversation.$id)}
				aria-current={isActive ? "true" : undefined}
				className={cn(
					"group flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-[background-color,box-shadow] duration-150",
					"hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_10px_rgba(7,143,171,0.10)]",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
					isActive && "bg-[#078fab]/[.06]",
				)}
			>
				<div
					className={cn(
						"mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#078fab]/[.08] text-[#078fab] transition-colors duration-150",
						"group-hover:bg-[#078fab]/[.16]",
					)}
				>
					<MessageSquareText
						className="h-4 w-4"
						strokeWidth={1.75}
						aria-hidden
					/>
				</div>
				<div className="min-w-0 flex-1">
					<p
						className={cn(
							"truncate text-sm text-slate-700",
							isActive ? "font-semibold" : "font-medium",
						)}
					>
						{conversation.title || "Conversation"}
					</p>
					<p className="mt-0.5 truncate text-xs text-slate-600">
						{previewText(conversation)}
					</p>
					{conversation.status === "closed" ? (
						<span className="mt-1 inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
							Closed
						</span>
					) : null}
				</div>
				<span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs text-slate-500">
					{formatRelativeTime(
						conversation.lastMessageAt ||
							conversation.$createdAt ||
							new Date().toISOString(),
					)}
					{isActive ? (
						<span
							className="inline-block h-1.5 w-1.5 rounded-full bg-[#078fab]"
							aria-hidden
						/>
					) : null}
				</span>
			</button>
		</div>
	);
}

export default function AssistantHistoryList({
	conversations,
	activeId,
	onSelect,
	loading,
	loadingMore,
	nextCursor,
	onLoadMore,
}: Props) {
	const [query, setQuery] = useState("");
	const trimmedQuery = query.trim();
	const filtered = useMemo(
		() => filterConversationsByTitle(conversations, query),
		[conversations, query],
	);
	const groups = useMemo(
		() => groupAssistantConversations(filtered, { activeId }),
		[activeId, filtered],
	);
	const showInitialLoader = Boolean(loading && !conversations.length);
	const showEmptyAll = !showInitialLoader && !conversations.length;
	const showEmptySearch =
		!showInitialLoader && Boolean(trimmedQuery) && !filtered.length;
	const showLoadMore = Boolean(nextCursor) && !showEmptyAll && !showEmptySearch;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="shrink-0 pb-3">
				<SearchField
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search conversations…"
					aria-label="Search conversations"
					containerClassName="max-w-none md:max-w-none"
				/>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{showInitialLoader ? (
					<p className="py-8 text-center text-sm text-slate-600">
						Loading history…
					</p>
				) : showEmptyAll ? (
					<p className="py-8 text-center text-sm text-slate-600">
						No conversations yet. Start chatting with CAALM to see your history
						here.
					</p>
				) : showEmptySearch ? (
					<p className="py-8 text-center text-sm text-slate-600">
						No conversations match &quot;{trimmedQuery}&quot;
					</p>
				) : (
					<div role="list">
						{groups.map((group, index) => (
							<div key={group.id} className={cn(index > 0 && "mt-4")}>
								<GroupHeader label={group.label} />
								{group.conversations.map((conversation) => (
									<HistoryRow
										key={conversation.$id}
										conversation={conversation}
										isActive={conversation.$id === activeId}
										onSelect={onSelect}
									/>
								))}
							</div>
						))}

						{showLoadMore ? (
							<div className="pt-1 pb-2">
								{loadingMore ? (
									<>
										<p
											className="mb-2 flex items-center gap-2 px-1 text-xs text-slate-500"
											aria-live="polite"
										>
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
											Loading more…
										</p>
										<div>
											<HistoryRowSkeleton />
											<HistoryRowSkeleton />
											<HistoryRowSkeleton />
										</div>
									</>
								) : null}
								<button
									type="button"
									onClick={onLoadMore}
									disabled={loadingMore}
									aria-disabled={loadingMore ? true : undefined}
									aria-label={
										loadingMore
											? "Loading conversations"
											: "Load more conversations"
									}
									className={cn(
										"mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-[0.25px] border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors duration-200",
										"hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										"disabled:pointer-events-none disabled:opacity-60",
									)}
								>
									{loadingMore ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Loading…
										</>
									) : (
										"Load more conversations"
									)}
								</button>
							</div>
						) : null}
					</div>
				)}
			</div>
		</div>
	);
}
