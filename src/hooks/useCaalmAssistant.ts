"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type {
	AssistantChatMessage,
	AssistantConversationSummary,
	AssistantPendingAction,
	UseCaalmAssistantReturn,
} from "@/components/assistant/assistantTypes";
import { useToast } from "@/hooks/use-toast";

export function useCaalmAssistant(): UseCaalmAssistantReturn {
	const pathname = usePathname();
	const router = useRouter();
	const { toast } = useToast();

	const [conversationId, setConversationId] = useState<string | null>(null);
	const [conversationStatus, setConversationStatus] = useState<
		"active" | "closed" | null
	>(null);
	const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
	const [conversations, setConversations] = useState<
		AssistantConversationSummary[]
	>([]);
	const [pendingAction, setPendingAction] =
		useState<AssistantPendingAction | null>(null);
	const [isSending, setIsSending] = useState(false);
	const [historyLoading, setHistoryLoading] = useState(false);

	const loadHistory = useCallback(async () => {
		setHistoryLoading(true);
		try {
			const res = await fetch("/api/assistant/conversations?limit=30");
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Failed to load history");
			setConversations(json.data?.conversations ?? []);
		} catch (e) {
			toast({
				title: "Could not load history",
				description: e instanceof Error ? e.message : "Unknown error",
				variant: "destructive",
			});
		} finally {
			setHistoryLoading(false);
		}
	}, [toast]);

	const selectConversation = useCallback(
		async (id: string) => {
			try {
				const res = await fetch(`/api/assistant/conversations/${id}`);
				const json = await res.json();
				if (!res.ok) throw new Error(json.error || "Not found");
				setConversationId(id);
				const status =
					json.data?.conversation?.status === "closed" ? "closed" : "active";
				setConversationStatus(status);
				const loaded = (json.data?.messages ?? []).map(
					(m: {
						$id: string;
						role: string;
						content: string;
						sourcesJson?: string;
						metadataJson?: string;
						$createdAt?: string;
					}) => {
						let suggestions: AssistantChatMessage["suggestions"];
						if (m.metadataJson) {
							try {
								const meta = JSON.parse(m.metadataJson) as {
									suggestions?: AssistantChatMessage["suggestions"];
								};
								suggestions = meta.suggestions;
							} catch {
								suggestions = undefined;
							}
						}
						return {
							id: m.$id,
							role: (m.role === "user" ? "user" : "assistant") as
								| "user"
								| "assistant",
							content: m.content,
							sources: m.sourcesJson ? JSON.parse(m.sourcesJson) : undefined,
							suggestions,
							createdAt: m.$createdAt,
						};
					},
				);
				setMessages(loaded);
				setPendingAction(null);
			} catch (e) {
				toast({
					title: "Could not open conversation",
					description: e instanceof Error ? e.message : "Unknown error",
					variant: "destructive",
				});
			}
		},
		[toast],
	);

	const startNewChat = useCallback(async () => {
		try {
			// Server closes any other active sessions when creating this one
			const res = await fetch("/api/assistant/conversations", {
				method: "POST",
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Failed to create chat");
			const conv = json.data?.conversation;
			setConversationId(conv?.$id ?? null);
			setConversationStatus("active");
			setMessages([]);
			setPendingAction(null);
			void loadHistory();
		} catch (e) {
			toast({
				title: "Could not start chat",
				description: e instanceof Error ? e.message : "Unknown error",
				variant: "destructive",
			});
		}
	}, [loadHistory, toast]);

	const sendMessage = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || isSending || conversationStatus === "closed") return;

			const userMsg: AssistantChatMessage = {
				id: `local-${Date.now()}`,
				role: "user",
				content: trimmed,
				createdAt: new Date().toISOString(),
			};
			setMessages((prev) => [...prev, userMsg]);
			setIsSending(true);
			setPendingAction(null);

			try {
				const history = [...messages, userMsg].map((m) => ({
					role: m.role,
					content: m.content,
				}));

				const res = await fetch("/api/assistant/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						conversationId,
						message: trimmed,
						pathname,
						history,
					}),
				});
				const json = await res.json();
				if (!res.ok) throw new Error(json.error || "Chat failed");

				if (json.data?.conversationId) {
					setConversationId(json.data.conversationId);
					setConversationStatus("active");
				}

				const assistantMsg: AssistantChatMessage = {
					id: `local-a-${Date.now()}`,
					role: "assistant",
					content: json.data.answer,
					sources: json.data.sources,
					suggestions: json.data.suggestions,
					pendingAction: json.data.pendingAction,
					createdAt: new Date().toISOString(),
				};
				setMessages((prev) => [...prev, assistantMsg]);
				if (json.data.pendingAction) {
					setPendingAction(json.data.pendingAction);
				}
				if (json.data.clientAction?.type === "navigate") {
					router.push(json.data.clientAction.href);
				}
				void loadHistory();
			} catch (e) {
				toast({
					title: "Message failed",
					description: e instanceof Error ? e.message : "Unknown error",
					variant: "destructive",
				});
			} finally {
				setIsSending(false);
			}
		},
		[
			conversationId,
			conversationStatus,
			isSending,
			loadHistory,
			messages,
			pathname,
			router,
			toast,
		],
	);

	const confirmAction = useCallback(async () => {
		if (!pendingAction) return;
		setIsSending(true);
		try {
			const res = await fetch("/api/assistant/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					pendingActionId: pendingAction.id,
					conversationId,
					pathname,
				}),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Action failed");
			const summary = json.data?.summary ?? "Action completed.";
			setMessages((prev) => [
				...prev,
				{
					id: `local-sys-${Date.now()}`,
					role: "assistant",
					content: summary,
					createdAt: new Date().toISOString(),
				},
			]);
			setPendingAction(null);
			void loadHistory();
		} catch (e) {
			toast({
				title: "Action failed",
				description: e instanceof Error ? e.message : "Unknown error",
				variant: "destructive",
			});
		} finally {
			setIsSending(false);
		}
	}, [conversationId, loadHistory, pathname, pendingAction, toast]);

	return {
		conversationId,
		conversationStatus,
		messages,
		conversations,
		pendingAction,
		isSending,
		historyLoading,
		loadHistory,
		selectConversation,
		startNewChat,
		sendMessage,
		confirmAction,
	};
}
