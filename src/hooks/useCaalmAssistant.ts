"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	AssistantChatMessage,
	AssistantConversationSummary,
	AssistantPendingAction,
	UseCaalmAssistantReturn,
} from "@/components/assistant/assistantTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { buildPendingActionLifecycle } from "@/lib/assistant/actionLifecycle";
import type { AssistantCalendarMutation } from "@/lib/assistant/executeTypes";
import { readJsonResponse } from "@/lib/assistant/readJsonResponse";
import {
	refreshCalendarCache,
	revalidateCalendarMonth,
} from "@/lib/ui/refreshCalendarCache";

const CONVERSATION_STORAGE_KEY = "caalm_assistant_conversation_id";
const HISTORY_PAGE_SIZE = 30;

function parseHistoryPayload(json: {
	data?: {
		conversations?: AssistantConversationSummary[];
		nextCursor?: string | null;
	};
}): {
	conversations: AssistantConversationSummary[];
	nextCursor: string | null;
} {
	return {
		conversations: json.data?.conversations ?? [],
		nextCursor: json.data?.nextCursor ?? null,
	};
}

function appendUniqueConversations(
	current: AssistantConversationSummary[],
	incoming: AssistantConversationSummary[],
): AssistantConversationSummary[] {
	const seen = new Set(current.map((c) => c.$id));
	const extra = incoming.filter((c) => !seen.has(c.$id));
	return extra.length ? [...current, ...extra] : current;
}

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
		let actionLifecycle: AssistantChatMessage["actionLifecycle"];
		let activityFeed: AssistantChatMessage["activityFeed"];
		let inputForm: AssistantChatMessage["inputForm"];
		if (m.metadataJson) {
			try {
				const meta = JSON.parse(m.metadataJson) as {
					suggestions?: AssistantChatMessage["suggestions"];
					meetingCreated?: AssistantChatMessage["meetingCreated"];
					actionCompleted?: AssistantChatMessage["actionCompleted"];
					actionLifecycle?: AssistantChatMessage["actionLifecycle"];
					activityFeed?: AssistantChatMessage["activityFeed"];
					inputForm?: AssistantChatMessage["inputForm"];
				};
				suggestions = meta.suggestions;
				meetingCreated = meta.meetingCreated;
				actionCompleted = meta.actionCompleted;
				actionLifecycle = meta.actionLifecycle;
				activityFeed = meta.activityFeed;
				inputForm = meta.inputForm;
			} catch {
				suggestions = undefined;
				meetingCreated = undefined;
				actionCompleted = undefined;
				actionLifecycle = undefined;
				activityFeed = undefined;
				inputForm = undefined;
			}
		}
		return {
			id: m.$id,
			role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
			content: m.content,
			sources: m.sourcesJson ? JSON.parse(m.sourcesJson) : undefined,
			suggestions,
			meetingCreated,
			actionCompleted,
			actionLifecycle,
			activityFeed,
			inputForm,
			createdAt: m.$createdAt,
		};
	});
}

export function useCaalmAssistant(): UseCaalmAssistantReturn {
	const pathname = usePathname();
	const router = useRouter();
	const { toast } = useToast();
	const { user } = useAuth();

	const actionActor = () => ({
		userId: user?.$id,
		name:
			(user as { fullName?: string } | null)?.fullName ||
			user?.name ||
			user?.email ||
			"You",
		avatar: (user as { avatar?: string | null } | null)?.avatar ?? null,
		department: (user as { department?: string } | null)?.department,
		departmentLabel: (user as { departmentLabel?: string } | null)
			?.departmentLabel,
	});

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
	const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
	const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(
		null,
	);
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
			const res = await fetch(
				`/api/assistant/conversations?limit=${HISTORY_PAGE_SIZE}`,
			);
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Failed to load history");
			const page = parseHistoryPayload(json);
			setConversations(page.conversations);
			setHistoryNextCursor(page.nextCursor);
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

	const loadMoreHistory = useCallback(async () => {
		if (!historyNextCursor || historyLoadingMore) return;
		setHistoryLoadingMore(true);
		try {
			const res = await fetch(
				`/api/assistant/conversations?limit=${HISTORY_PAGE_SIZE}&cursor=${encodeURIComponent(historyNextCursor)}`,
			);
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Failed to load history");
			const page = parseHistoryPayload(json);
			setConversations((prev) =>
				appendUniqueConversations(prev, page.conversations),
			);
			setHistoryNextCursor(page.nextCursor);
		} catch (e) {
			toast({
				title: "Could not load more conversations",
				description: e instanceof Error ? e.message : "Unknown error",
				variant: "destructive",
			});
		} finally {
			setHistoryLoadingMore(false);
		}
	}, [historyLoadingMore, historyNextCursor, toast]);

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

			const listRes = await fetch(
				`/api/assistant/conversations?limit=${HISTORY_PAGE_SIZE}`,
			);
			const listJson = await listRes.json();
			if (!listRes.ok) return;
			const page = parseHistoryPayload(listJson);
			setConversations(page.conversations);
			setHistoryNextCursor(page.nextCursor);
			const list = page.conversations;
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
						inputForm?: AssistantChatMessage["inputForm"];
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
					content: payload.pendingAction ? "" : (payload.answer ?? ""),
					sources: payload.sources,
					suggestions: payload.suggestions,
					pendingAction: payload.pendingAction,
					actionLifecycle: payload.pendingAction
						? buildPendingActionLifecycle(payload.pendingAction, actionActor())
						: undefined,
					activityFeed: payload.activityFeed,
					inputForm: payload.inputForm,
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
			const pendingSnapshot = pendingAction;
			setIsSending(true);
			try {
				const res = await fetch("/api/assistant/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						pendingActionId: pendingSnapshot.id,
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
						actionLifecycle?: AssistantChatMessage["actionLifecycle"];
						calendarMutation?: AssistantCalendarMutation;
					};
				}>(res);
				if (!parsed.ok || !parsed.data?.data) {
					throw new Error(parsed.error || "Action failed");
				}
				const jsonData = parsed.data.data;
				const summary = jsonData.summary ?? "Action completed.";
				const meetingCreated = jsonData.meetingCreated;
				const actionCompleted = jsonData.actionCompleted;
				const actionLifecycle = jsonData.actionLifecycle;
				const calendarMutation = jsonData.calendarMutation;
				const failed = actionLifecycle?.state === "failed";

				// Transition the same message card — do not add a second result bubble.
				setMessages((prev) => {
					const idx = [...prev]
						.map((m, i) => ({ m, i }))
						.reverse()
						.find(
							({ m }) =>
								m.role === "assistant" &&
								(m.pendingAction?.id === pendingSnapshot.id ||
									m.actionLifecycle?.pendingActionId === pendingSnapshot.id),
						)?.i;

					if (idx === undefined) {
						return [
							...prev,
							{
								id: `local-sys-${Date.now()}`,
								role: "assistant" as const,
								content: summary,
								meetingCreated,
								actionCompleted,
								actionLifecycle,
								createdAt: new Date().toISOString(),
							},
						];
					}

					return prev.map((m, i) =>
						i !== idx
							? m
							: {
									...m,
									content: failed
										? "I couldn't finish that one."
										: meetingCreated
											? "Your meeting is on the calendar."
											: "",
									pendingAction: failed ? pendingSnapshot : undefined,
									meetingCreated: meetingCreated ?? m.meetingCreated,
									actionCompleted: actionCompleted ?? m.actionCompleted,
									actionLifecycle:
										actionLifecycle ??
										(meetingCreated ? undefined : m.actionLifecycle),
								},
					);
				});

				if (!failed) {
					setPendingAction(null);
				}

				if (calendarMutation?.kind === "create" && calendarMutation.date) {
					void refreshCalendarCache({
						mode: "insert",
						event: {
							$id: calendarMutation.eventId || `temp-${Date.now()}`,
							title:
								calendarMutation.title || meetingCreated?.title || "Meeting",
							startDate: calendarMutation.date,
							endDate: calendarMutation.date,
							startTime: calendarMutation.startTime,
							endTime: calendarMutation.endTime,
							description: meetingCreated?.description,
							participants: meetingCreated?.participants,
							type: "meeting",
						},
					});
				} else if (
					calendarMutation?.kind === "update" &&
					calendarMutation.eventId &&
					calendarMutation.date
				) {
					void refreshCalendarCache({
						mode: "patch",
						event: {
							$id: calendarMutation.eventId,
							title: calendarMutation.title || "Meeting",
							startDate: calendarMutation.date,
							endDate: calendarMutation.date,
							startTime: calendarMutation.startTime,
							endTime: calendarMutation.endTime,
							type: "meeting",
						},
					});
				} else if (
					calendarMutation?.kind === "remove" &&
					calendarMutation.eventId
				) {
					void refreshCalendarCache({
						mode: "remove",
						eventId: calendarMutation.eventId,
						dateStr: calendarMutation.date,
					});
				} else if (meetingCreated?.date) {
					void refreshCalendarCache({
						mode: "insert",
						event: {
							$id: meetingCreated.eventId || `temp-${Date.now()}`,
							title: meetingCreated.title,
							startDate: meetingCreated.date,
							endDate: meetingCreated.date,
							startTime: meetingCreated.startTime,
							endTime: meetingCreated.endTime,
							description: meetingCreated.description,
							participants: meetingCreated.participants,
							type: "meeting",
						},
					});
				} else if (
					pendingSnapshot.toolName === "reschedule_calendar_event" ||
					pendingSnapshot.toolName === "cancel_calendar_event"
				) {
					void revalidateCalendarMonth();
				}
				if (!failed) {
					void loadHistory();
				}
			} catch (e) {
				const message = e instanceof Error ? e.message : "Unknown error";
				setMessages((prev) =>
					prev.map((m) =>
						m.pendingAction?.id === pendingSnapshot.id ||
						m.actionLifecycle?.pendingActionId === pendingSnapshot.id
							? {
									...m,
									content: "I couldn't finish that one.",
									actionLifecycle: {
										...(m.actionLifecycle ??
											buildPendingActionLifecycle(
												pendingSnapshot,
												actionActor(),
											)),
										state: "failed",
										errorMessage: message,
										errorCode: "ERR_ACTION",
										retrySafe: true,
										footerNote: "Safe to retry — no duplicate will be created.",
									},
								}
							: m,
					),
				);
				toast({
					title: "Action failed",
					description: message,
					variant: "destructive",
				});
			} finally {
				setIsSending(false);
			}
		},
		[loadHistory, pathname, pendingAction, toast, user],
	);

	const cancelPendingAction = useCallback(() => {
		setPendingAction((prev) => {
			if (!prev) return prev;
			setMessages((msgs) =>
				msgs.map((m) =>
					m.pendingAction?.id === prev.id ||
					m.actionLifecycle?.pendingActionId === prev.id
						? {
								...m,
								content: "Cancelled. Nothing was changed.",
								pendingAction: undefined,
								actionLifecycle: undefined,
							}
						: m,
				),
			);
			return null;
		});
	}, []);

	const patchPendingArgs = useCallback(
		(argsPatch: Record<string, unknown>) => {
			setPendingAction((prev) => {
				if (!prev) return prev;
				const cleanedPatch = { ...argsPatch };
				// Empty due date means "not set"
				if (
					"dueDate" in cleanedPatch &&
					(cleanedPatch.dueDate === "" || cleanedPatch.dueDate == null)
				) {
					cleanedPatch.dueDate = undefined;
				}
				const nextArgs = { ...(prev.args ?? {}), ...cleanedPatch };
				if ("dueDate" in cleanedPatch && cleanedPatch.dueDate === undefined) {
					delete nextArgs.dueDate;
				}
				const title =
					typeof nextArgs.title === "string" ? nextArgs.title.trim() : "";
				const next = {
					...prev,
					args: nextArgs,
					label: title ? `Create task “${title}”` : prev.label,
					preview: JSON.stringify(nextArgs, null, 2).slice(0, 500),
				};
				setMessages((msgs) =>
					msgs.map((m) =>
						m.pendingAction?.id === prev.id ||
						m.actionLifecycle?.pendingActionId === prev.id
							? {
									...m,
									pendingAction: next,
									actionLifecycle: buildPendingActionLifecycle(
										next,
										actionActor(),
									),
								}
							: m,
					),
				);
				// Keep server-side pending action in sync for confirm after remount
				void fetch("/api/assistant/pending", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						pendingActionId: prev.id,
						argsPatch: cleanedPatch,
					}),
				}).catch(() => undefined);
				return next;
			});
		},
		[user],
	);

	return {
		conversationId,
		conversationStatus,
		messages,
		conversations,
		pendingAction,
		isSending,
		historyLoading,
		historyLoadingMore,
		historyNextCursor,
		conversationLoading,
		loadHistory,
		loadMoreHistory,
		selectConversation,
		startNewChat,
		resumeActiveSession,
		sendMessage,
		confirmAction,
		cancelPendingAction,
		patchPendingArgs,
	};
}
