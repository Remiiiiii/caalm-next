"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	AssistantChatMessage,
	AssistantConversationSummary,
	AssistantPendingAction,
	UseCaalmAssistantReturn,
} from "@/components/assistant/assistantTypes";
import { useToast } from "@/hooks/use-toast";
import { readJsonResponse } from "@/lib/assistant/readJsonResponse";
import {
	refreshCalendarAfterEventRemoved,
	refreshCalendarAfterEventUpdated,
	refreshCalendarAfterMeetingCreated,
	revalidateCalendarMonth,
} from "@/lib/ui/refreshCalendarCache";

const CONVERSATION_STORAGE_KEY = "caalm_assistant_conversation_id";

function readStoredConversationId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return sessionStorage.getItem(CONVERSATION_STORAGE_KEY);
	} catch {
		return null;
	}
}

function writeStoredConversationId(id: string | null): void {
	if (typeof window === "undefined") return;
	try {
		if (id) sessionStorage.setItem(CONVERSATION_STORAGE_KEY, id);
		else sessionStorage.removeItem(CONVERSATION_STORAGE_KEY);
	} catch {
		// Ignore quota / private mode
	}
}

function mapStoredMessages(
	raw: Array<{
		$id: string;
		role: string;
		content: string;
		sourcesJson?: string;
		metadataJson?: string;
		$createdAt?: string;
	}>,
): AssistantChatMessage[] {
	return raw.map((m) => {
		let suggestions: AssistantChatMessage["suggestions"];
		let meetingCreated: AssistantChatMessage["meetingCreated"];
		let actionCompleted: AssistantChatMessage["actionCompleted"];
		let activityFeed: AssistantChatMessage["activityFeed"];
		if (m.metadataJson) {
			try {
				const meta = JSON.parse(m.metadataJson) as {
					suggestions?: AssistantChatMessage["suggestions"];
					meetingCreated?: AssistantChatMessage["meetingCreated"];
					actionCompleted?: AssistantChatMessage["actionCompleted"];
					activityFeed?: AssistantChatMessage["activityFeed"];
				};
				suggestions = meta.suggestions;
				meetingCreated = meta.meetingCreated;
				actionCompleted = meta.actionCompleted;
				activityFeed = meta.activityFeed;
			} catch {
				suggestions = undefined;
				meetingCreated = undefined;
				actionCompleted = undefined;
				activityFeed = undefined;
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
			meetingCreated,
			actionCompleted,
			activityFeed,
			createdAt: m.$createdAt,
		};
	});
}

export function useCaalmAssistant(): UseCaalmAssistantReturn {
	const pathname = usePathname();
	const router = useRouter();
	const { toast } = useToast();

	const [conversationId, setConversationIdState] = useState<string | null>(
		null,
	);
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
	const [conversationLoading, setConversationLoading] = useState(false);

	const conversationIdRef = useRef<string | null>(null);
	const resumeInFlightRef = useRef(false);

	const setConversationId = useCallback((id: string | null) => {
		conversationIdRef.current = id;
		setConversationIdState(id);
		writeStoredConversationId(id);
	}, []);

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
			setConversationLoading(true);
			setMessages([]);
			setPendingAction(null);
			setConversationId(id);
			try {
				const res = await fetch(`/api/assistant/conversations/${id}`);
				const json = await res.json();
				if (!res.ok) throw new Error(json.error || "Not found");
				const status =
					json.data?.conversation?.status === "closed" ? "closed" : "active";
				setConversationStatus(status);
				setMessages(mapStoredMessages(json.data?.messages ?? []));
			} catch (e) {
				toast({
					title: "Could not open conversation",
					description: e instanceof Error ? e.message : "Unknown error",
					variant: "destructive",
				});
			} finally {
				setConversationLoading(false);
			}
		},
		[setConversationId, toast],
	);

	const resumeActiveSession = useCallback(async () => {
		// Keep the in-memory session when the sheet is only hidden (not remounted).
		if (conversationIdRef.current) return;
		if (resumeInFlightRef.current) return;
		resumeInFlightRef.current = true;
		try {
			const stored = readStoredConversationId();
			if (stored) {
				const res = await fetch(`/api/assistant/conversations/${stored}`);
				const json = await res.json();
				if (res.ok && json.data?.conversation?.status !== "closed") {
					setConversationId(stored);
					setConversationStatus("active");
					setPendingAction(null);
					setMessages(mapStoredMessages(json.data?.messages ?? []));
					return;
				}
				writeStoredConversationId(null);
			}

			const listRes = await fetch("/api/assistant/conversations?limit=30");
			const listJson = await listRes.json();
			if (!listRes.ok) return;
			const list = (listJson.data?.conversations ??
				[]) as AssistantConversationSummary[];
			setConversations(list);
			const active = list.find((c) => c.status === "active");
			if (active?.$id) {
				await selectConversation(active.$id);
			}
		} catch {
			// Stay on empty welcome — first send will create/resume on the server.
		} finally {
			resumeInFlightRef.current = false;
		}
	}, [selectConversation, setConversationId]);

	// Restore session after remount (navigation / layout refresh).
	useEffect(() => {
		void resumeActiveSession();
	}, [resumeActiveSession]);

	const startNewChat = useCallback(async () => {
		try {
			// Server closes any other active sessions when creating this one
			const res = await fetch("/api/assistant/conversations", {
				method: "POST",
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Failed to create chat");
			const conv = json.data?.conversation;
			setConversationLoading(false);
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
	}, [loadHistory, setConversationId, toast]);

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
						conversationId: conversationIdRef.current,
						message: trimmed,
						pathname,
						history,
					}),
				});
				const parsed = await readJsonResponse<{
					error?: string;
					data?: {
						conversationId?: string;
						answer?: string;
						sources?: AssistantChatMessage["sources"];
						suggestions?: AssistantChatMessage["suggestions"];
						pendingAction?: AssistantPendingAction;
						clientAction?: { type: "navigate"; href: string };
						activityFeed?: AssistantChatMessage["activityFeed"];
					};
				}>(res);
				if (!parsed.ok || !parsed.data?.data) {
					throw new Error(parsed.error || "Chat failed");
				}
				const payload = parsed.data.data;

				if (payload.conversationId) {
					setConversationId(payload.conversationId);
					setConversationStatus("active");
				}

				const assistantMsg: AssistantChatMessage = {
					id: `local-a-${Date.now()}`,
					role: "assistant",
					content: payload.answer ?? "",
					sources: payload.sources,
					suggestions: payload.suggestions,
					pendingAction: payload.pendingAction,
					activityFeed: payload.activityFeed,
					createdAt: new Date().toISOString(),
				};
				setMessages((prev) => [...prev, assistantMsg]);
				if (payload.pendingAction) {
					setPendingAction(payload.pendingAction);
				}
				if (payload.clientAction?.type === "navigate") {
					router.push(payload.clientAction.href);
				}
				void loadHistory();
			} catch (e) {
				setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
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
			conversationStatus,
			isSending,
			loadHistory,
			messages,
			pathname,
			router,
			setConversationId,
			toast,
		],
	);

	const confirmAction = useCallback(
		async (argsPatch?: Record<string, unknown>) => {
			if (!pendingAction) return;
			setIsSending(true);
			try {
				const res = await fetch("/api/assistant/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						pendingActionId: pendingAction.id,
						conversationId: conversationIdRef.current,
						pathname,
						...(argsPatch ? { argsPatch } : {}),
					}),
				});
				const parsed = await readJsonResponse<{
					error?: string;
					data?: {
						summary?: string;
						meetingCreated?: AssistantChatMessage["meetingCreated"];
						actionCompleted?: AssistantChatMessage["actionCompleted"];
						result?: {
							result?: unknown;
						};
					};
				}>(res);
				if (!parsed.ok || !parsed.data?.data) {
					throw new Error(parsed.error || "Action failed");
				}
				const jsonData = parsed.data.data;
				const summary = jsonData.summary ?? "Action completed.";
				const meetingCreated = jsonData.meetingCreated;
				const actionCompleted = jsonData.actionCompleted;
				setMessages((prev) => [
					...prev,
					{
						id: `local-sys-${Date.now()}`,
						role: "assistant",
						content: summary,
						meetingCreated,
						actionCompleted,
						createdAt: new Date().toISOString(),
					},
				]);
				setPendingAction(null);
				if (meetingCreated?.date) {
					void refreshCalendarAfterMeetingCreated({
						$id: meetingCreated.eventId || `temp-${Date.now()}`,
						title: meetingCreated.title,
						startDate: meetingCreated.date,
						endDate: meetingCreated.date,
						startTime: meetingCreated.startTime,
						endTime: meetingCreated.endTime,
						description: meetingCreated.description,
						participants: meetingCreated.participants,
						type: "meeting",
					});
				} else if (pendingAction.toolName === "reschedule_calendar_event") {
					const result =
						jsonData.result?.result &&
						typeof jsonData.result.result === "object"
							? (jsonData.result.result as {
									eventId?: string;
									title?: string;
									date?: string;
									startTime?: string;
									endTime?: string;
								})
							: null;
					if (result?.eventId && result.date) {
						void refreshCalendarAfterEventUpdated({
							$id: result.eventId,
							title: result.title || "Meeting",
							startDate: result.date,
							endDate: result.date,
							startTime: result.startTime,
							endTime: result.endTime,
							type: "meeting",
						});
					} else {
						void revalidateCalendarMonth(result?.date);
					}
				} else if (pendingAction.toolName === "cancel_calendar_event") {
					const result =
						jsonData.result?.result &&
						typeof jsonData.result.result === "object"
							? (jsonData.result.result as {
									eventId?: string;
									date?: string;
								})
							: null;
					if (result?.eventId) {
						void refreshCalendarAfterEventRemoved(
							result.eventId,
							result.date,
						);
					} else {
						void revalidateCalendarMonth(result?.date);
					}
				}
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
		},
		[loadHistory, pathname, pendingAction, toast],
	);

	const patchPendingArgs = useCallback((argsPatch: Record<string, unknown>) => {
		setPendingAction((prev) => {
			if (!prev) return prev;
			const nextArgs = { ...(prev.args ?? {}), ...argsPatch };
			const next = {
				...prev,
				args: nextArgs,
				preview: JSON.stringify(nextArgs, null, 2).slice(0, 500),
			};
			// Keep server-side pending action in sync for confirm after remount
			void fetch("/api/assistant/pending", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					pendingActionId: prev.id,
					argsPatch,
				}),
			}).catch(() => undefined);
			return next;
		});
	}, []);

	return {
		conversationId,
		conversationStatus,
		messages,
		conversations,
		pendingAction,
		isSending,
		historyLoading,
		conversationLoading,
		loadHistory,
		selectConversation,
		startNewChat,
		resumeActiveSession,
		sendMessage,
		confirmAction,
		patchPendingArgs,
	};
}
