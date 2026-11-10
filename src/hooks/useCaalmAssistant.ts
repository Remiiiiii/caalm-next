"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { mutate as swrMutate } from "swr";
import type {
	AssistantChatMessage,
	AssistantConversationSummary,
	AssistantPendingAction,
	UseCaalmAssistantReturn,
} from "@/components/assistant/assistantTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
	buildFailedActionLifecycle,
	buildPendingActionLifecycle,
} from "@/lib/assistant/actionLifecycle";
import { buildApplyAuditRemediationSteps } from "@/lib/assistant/apply-audit-remediation-steps";
import type { AssistantResearchStep } from "@/lib/assistant/assistant-research-steps";
import {
	type AuditRemediationLaunchContext,
	auditRemediationUserPrompt,
} from "@/lib/assistant/audit-remediation-context";
import type { AssistantCalendarMutation } from "@/lib/assistant/executeTypes";
import type { AssistantClientAction } from "@/lib/assistant/open-close-cap-client";
import { dispatchOpenCloseCap } from "@/lib/assistant/open-close-cap-client";
import { readJsonResponse } from "@/lib/assistant/readJsonResponse";
import { linkRemediationChat } from "@/lib/assistant/remediation-chat-link";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import {
	refreshCalendarCache,
	revalidateCalendarMonth,
} from "@/lib/ui/refreshCalendarCache";
import {
	type DashboardInvitationPrepend,
	refreshDashboardInvitations,
} from "@/lib/ui/refreshDashboardInvitations";

function dashboardInvitationsFromToolPayload(
	payload: Record<string, unknown> | null,
): DashboardInvitationPrepend[] {
	if (!payload) return [];
	const raw = payload.dashboardInvitations;
	if (!Array.isArray(raw)) return [];
	const out: DashboardInvitationPrepend[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const token = String(row.token ?? "").trim();
		const email = String(row.email ?? "").trim();
		if (!token || !email) continue;
		out.push({
			$id: String(row.$id ?? "").trim() || `temp-${token}`,
			name: String(row.name ?? email).trim() || email,
			email,
			role: String(row.role ?? "").trim() || "Viewer",
			token,
			expiresAt:
				typeof row.expiresAt === "string" ? row.expiresAt : undefined,
			status:
				typeof row.status === "string" ? row.status : "pending-review",
			revoked: Boolean(row.revoked),
			$createdAt:
				typeof row.$createdAt === "string"
					? row.$createdAt
					: new Date().toISOString(),
			department:
				typeof row.department === "string" ? row.department : undefined,
			division:
				typeof row.division === "string" ? row.division : undefined,
			invitedBy:
				typeof row.invitedBy === "string" ? row.invitedBy : undefined,
		});
	}
	return out;
}

const CONVERSATION_STORAGE_KEY = "caalm_assistant_conversation_id";
const HISTORY_PAGE_SIZE = 30;

const REMEDIATION_RESEARCH_PENDING: AssistantResearchStep[] = [
	{
		id: "research-start",
		label: "Researching your organization data…",
		kind: "search",
		status: "active",
	},
];

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
		let researchSteps: AssistantChatMessage["researchSteps"];
		if (m.metadataJson) {
			try {
				const meta = JSON.parse(m.metadataJson) as {
					suggestions?: AssistantChatMessage["suggestions"];
					meetingCreated?: AssistantChatMessage["meetingCreated"];
					actionCompleted?: AssistantChatMessage["actionCompleted"];
					actionLifecycle?: AssistantChatMessage["actionLifecycle"];
					activityFeed?: AssistantChatMessage["activityFeed"];
					inputForm?: AssistantChatMessage["inputForm"];
					researchSteps?: AssistantChatMessage["researchSteps"];
				};
				suggestions = meta.suggestions;
				meetingCreated = meta.meetingCreated;
				actionCompleted = meta.actionCompleted;
				actionLifecycle = meta.actionLifecycle;
				activityFeed = meta.activityFeed;
				inputForm = meta.inputForm;
				researchSteps = meta.researchSteps;
			} catch {
				suggestions = undefined;
				meetingCreated = undefined;
				actionCompleted = undefined;
				actionLifecycle = undefined;
				activityFeed = undefined;
				inputForm = undefined;
				researchSteps = undefined;
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
			researchSteps,
			createdAt: m.$createdAt,
		};
	});
}

export function useCaalmAssistant(options?: {
	enabled?: boolean;
}): UseCaalmAssistantReturn {
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
	const isSendingRef = useRef(false);
	const setSending = useCallback((next: boolean) => {
		isSendingRef.current = next;
		setIsSending(next);
	}, []);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
	const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(
		null,
	);
	const [conversationLoading, setConversationLoading] = useState(false);
	const [pendingResearchSteps, setPendingResearchSteps] = useState<
		AssistantResearchStep[] | null
	>(null);
	const [researchPlaybackMessageId, setResearchPlaybackMessageId] = useState<
		string | null
	>(null);
	const [applyProgressSteps, setApplyProgressSteps] = useState<
		AssistantResearchStep[] | null
	>(null);

	const enabled = options?.enabled ?? true;
	const enabledRef = useRef(enabled);
	enabledRef.current = enabled;

	const conversationIdRef = useRef<string | null>(null);
	const resumeInFlightRef = useRef(false);
	const sessionEpochRef = useRef(0);
	const messagesRef = useRef<AssistantChatMessage[]>([]);
	const conversationStatusRef = useRef<"active" | "closed" | null>(null);
	messagesRef.current = messages;
	conversationStatusRef.current = conversationStatus;

	const setConversationId = useCallback((id: string | null) => {
		conversationIdRef.current = id;
		setConversationIdState(id);
		writeStoredConversationId(id);
	}, []);

	const loadHistory = useCallback(async () => {
		if (!enabledRef.current) return;
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
				description: toUserFacingErrorMessage(
					e,
					"Could not load chat history. Please try again.",
				),
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
				description: toUserFacingErrorMessage(
					e,
					"Could not load more conversations. Please try again.",
				),
				variant: "destructive",
			});
		} finally {
			setHistoryLoadingMore(false);
		}
	}, [historyLoadingMore, historyNextCursor, toast]);

	const selectConversation = useCallback(
		async (id: string) => {
			const epoch = sessionEpochRef.current;
			const previousId = conversationIdRef.current;
			setConversationLoading(true);
			setMessages([]);
			setPendingAction(null);
			setConversationId(id);
			try {
				const res = await fetch(`/api/assistant/conversations/${id}`);
				const json = await res.json();
				if (sessionEpochRef.current !== epoch) return false;
				if (!res.ok) throw new Error(json.error || "Not found");
				const status =
					json.data?.conversation?.status === "closed" ? "closed" : "active";
				setConversationStatus(status);
				conversationStatusRef.current = status;
				const mapped = mapStoredMessages(json.data?.messages ?? []);
				messagesRef.current = mapped;
				setMessages(mapped);
				return true;
			} catch (e) {
				if (sessionEpochRef.current !== epoch) return false;
				setConversationId(previousId);
				toast({
					title: "Could not open conversation",
					description: toUserFacingErrorMessage(
						e,
						"Could not open that conversation. Please try again.",
					),
					variant: "destructive",
				});
				return false;
			} finally {
				setConversationLoading(false);
			}
		},
		[setConversationId, toast],
	);

	const resumeActiveSession = useCallback(async () => {
		if (!enabledRef.current) return;
		// Keep the in-memory session when the sheet is only hidden (not remounted).
		if (conversationIdRef.current) return;
		if (resumeInFlightRef.current) return;
		resumeInFlightRef.current = true;
		const epoch = sessionEpochRef.current;
		try {
			const stored = readStoredConversationId();
			if (stored) {
				const res = await fetch(`/api/assistant/conversations/${stored}`);
				const json = await res.json();
				if (sessionEpochRef.current !== epoch) return;
				if (res.ok && json.data?.conversation?.status !== "closed") {
					setConversationId(stored);
					setConversationStatus("active");
					conversationStatusRef.current = "active";
					setPendingAction(null);
					const mapped = mapStoredMessages(json.data?.messages ?? []);
					messagesRef.current = mapped;
					setMessages(mapped);
					return;
				}
				writeStoredConversationId(null);
			}

			const listRes = await fetch(
				`/api/assistant/conversations?limit=${HISTORY_PAGE_SIZE}`,
			);
			const listJson = await listRes.json();
			if (sessionEpochRef.current !== epoch) return;
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
		if (!enabled) return;
		void resumeActiveSession();
	}, [enabled, resumeActiveSession]);

	const startNewChat = useCallback(async () => {
		if (!enabledRef.current) return false;
		sessionEpochRef.current += 1;
		const epoch = sessionEpochRef.current;
		try {
			// Server closes any other active sessions when creating this one
			const res = await fetch("/api/assistant/conversations", {
				method: "POST",
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Failed to create chat");
			if (sessionEpochRef.current !== epoch) return false;
			const conv = json.data?.conversation;
			setConversationLoading(false);
			setConversationId(conv?.$id ?? null);
			setConversationStatus("active");
			conversationStatusRef.current = "active";
			messagesRef.current = [];
			setMessages([]);
			setPendingAction(null);
			void loadHistory();
			return true;
		} catch (e) {
			toast({
				title: "Could not start chat",
				description: toUserFacingErrorMessage(
					e,
					"Could not start a new chat. Please try again.",
				),
				variant: "destructive",
			});
			return false;
		}
	}, [loadHistory, setConversationId, toast]);

	const sendMessage = useCallback(
		async (
			text: string,
			sendOptions?: {
				launchContext?: AuditRemediationLaunchContext;
				contextRoutes?: string[];
				/** Allow chaining after confirm_finding while the execute call is still marked busy. */
				bypassBusy?: boolean;
				/** Continue research without a second user bubble (UI + stored history). */
				suppressUserBubble?: boolean;
			},
		) => {
			const trimmed = text.trim();
			if (
				!enabledRef.current ||
				!trimmed ||
				(isSendingRef.current && !sendOptions?.bypassBusy) ||
				conversationStatusRef.current === "closed"
			) {
				return null;
			}

			const suppressUser = Boolean(sendOptions?.suppressUserBubble);
			const userMsg: AssistantChatMessage | null = suppressUser
				? null
				: {
						id: `local-${Date.now()}`,
						role: "user",
						content: trimmed,
						createdAt: new Date().toISOString(),
					};
			const historyBase = messagesRef.current;
			if (userMsg) {
				messagesRef.current = [...historyBase, userMsg];
				setMessages(messagesRef.current);
			}
			setSending(true);
			setPendingAction(null);
			if (sendOptions?.launchContext) {
				setPendingResearchSteps(REMEDIATION_RESEARCH_PENDING);
			} else {
				setPendingResearchSteps(null);
			}

			try {
				const history = (userMsg ? [...historyBase, userMsg] : historyBase).map(
					(m) => ({
						role: m.role,
						content: m.content,
					}),
				);

				const res = await fetch("/api/assistant/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						conversationId: conversationIdRef.current,
						message: trimmed,
						pathname,
						history,
						...(suppressUser ? { suppressUserMessage: true } : {}),
						...(sendOptions?.launchContext
							? { launchContext: sendOptions.launchContext }
							: {}),
						...(sendOptions?.contextRoutes?.length
							? { contextRoutes: sendOptions.contextRoutes }
							: {}),
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
						clientAction?: AssistantClientAction;
						activityFeed?: AssistantChatMessage["activityFeed"];
						inputForm?: AssistantChatMessage["inputForm"];
						researchSteps?: AssistantChatMessage["researchSteps"];
					};
				}>(res);
				if (!parsed.ok || !parsed.data?.data) {
					throw new Error(
						toUserFacingErrorMessage(
							parsed.error,
							"I couldn't complete that request. Please try again.",
						),
					);
				}
				const payload = parsed.data.data;

				if (payload.conversationId) {
					setConversationId(payload.conversationId);
					setConversationStatus("active");
					conversationStatusRef.current = "active";
					const launchFindingId = sendOptions?.launchContext?.findingId;
					if (launchFindingId) {
						linkRemediationChat(
							launchFindingId,
							payload.conversationId,
							payload.pendingAction?.toolName === "apply_audit_remediation",
						);
					}
				}

				const hideAnswer =
					payload.pendingAction?.toolName === "create_task" ||
					payload.pendingAction?.toolName === "create_task_for_contract" ||
					payload.pendingAction?.toolName === "create_calendar_event";
				const assistantMsg: AssistantChatMessage = {
					id: `local-a-${Date.now()}`,
					role: "assistant",
					content: hideAnswer ? "" : (payload.answer ?? ""),
					sources: payload.sources,
					suggestions: payload.suggestions,
					pendingAction: payload.pendingAction,
					actionLifecycle: payload.pendingAction
						? buildPendingActionLifecycle(payload.pendingAction, actionActor())
						: undefined,
					activityFeed: payload.activityFeed,
					inputForm: payload.inputForm,
					researchSteps: payload.researchSteps,
					createdAt: new Date().toISOString(),
				};
				setPendingResearchSteps(null);
				if (payload.researchSteps?.length) {
					setResearchPlaybackMessageId(assistantMsg.id);
				}
				messagesRef.current = [...messagesRef.current, assistantMsg];
				setMessages(messagesRef.current);
				if (payload.pendingAction) {
					setPendingAction(payload.pendingAction);
				}
				if (payload.clientAction?.type === "navigate") {
					router.push(payload.clientAction.href);
				} else if (payload.clientAction?.type === "open_close_cap") {
					dispatchOpenCloseCap(payload.clientAction);
				}
				void loadHistory();
				return payload.conversationId ?? conversationIdRef.current;
			} catch (e) {
				setPendingResearchSteps(null);
				const friendly = toUserFacingErrorMessage(
					e,
					"I couldn't complete that request. Please try again.",
				);
				if (userMsg) {
					messagesRef.current = messagesRef.current.map((m) =>
						m.id === userMsg.id
							? { ...m, failed: true, failedMessage: friendly }
							: m,
					);
					setMessages(messagesRef.current);
				} else {
					toast({
						title: "Message failed",
						description: friendly,
						variant: "destructive",
					});
				}
				return null;
			} finally {
				setSending(false);
			}
		},
		[loadHistory, pathname, router, setConversationId, setSending, toast],
	);

	const retryFailedMessage = useCallback(
		async (messageId: string) => {
			const failed = messagesRef.current.find(
				(m) => m.id === messageId && m.role === "user" && m.failed,
			);
			if (!failed?.content.trim()) return null;
			messagesRef.current = messagesRef.current.filter(
				(m) => m.id !== messageId,
			);
			setMessages(messagesRef.current);
			return sendMessage(failed.content);
		},
		[sendMessage],
	);

	const confirmAction = useCallback(
		async (argsPatch?: Record<string, unknown>) => {
			if (!pendingAction) return;
			const pendingSnapshot = pendingAction;
			setSending(true);
			if (pendingSnapshot.toolName === "apply_audit_remediation") {
				const capTitle =
					typeof pendingSnapshot.args?.capTitle === "string"
						? pendingSnapshot.args.capTitle
						: undefined;
				setApplyProgressSteps(buildApplyAuditRemediationSteps(capTitle));
			} else {
				setApplyProgressSteps(null);
			}
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
						result?: { result?: Record<string, unknown> };
						meetingCreated?: AssistantChatMessage["meetingCreated"];
						actionCompleted?: AssistantChatMessage["actionCompleted"];
						actionLifecycle?: AssistantChatMessage["actionLifecycle"];
						calendarMutation?: AssistantCalendarMutation;
						nextInvite?: {
							answer: string;
							inputForm: AssistantChatMessage["inputForm"];
						};
					};
				}>(res);
				if (!parsed.ok || !parsed.data?.data) {
					throw new Error(
						toUserFacingErrorMessage(
							parsed.error,
							"I couldn't finish that action. Please try again.",
						),
					);
				}
				const jsonData = parsed.data.data;
				const summary = jsonData.summary ?? "Action completed.";
				const meetingCreated = jsonData.meetingCreated;
				const actionCompleted = jsonData.actionCompleted;
				const actionLifecycle = jsonData.actionLifecycle;
				const calendarMutation = jsonData.calendarMutation;
				const nextInvite = jsonData.nextInvite;
				const toolPayload =
					jsonData.result?.result && typeof jsonData.result.result === "object"
						? jsonData.result.result
						: null;
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
											: pendingSnapshot.toolName === "apply_audit_remediation"
												? m.content
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

				// Sequential invites: after Confirm, open the next person's form only.
				if (!failed && nextInvite?.inputForm) {
					setMessages((prev) => [
						...prev,
						{
							id: `local-invite-next-${Date.now()}`,
							role: "assistant" as const,
							content: nextInvite.answer,
							inputForm: nextInvite.inputForm,
							createdAt: new Date().toISOString(),
						},
					]);
				}

				if (
					!failed &&
					(pendingSnapshot.toolName === "invite_user" ||
						pendingSnapshot.toolName === "invite_users" ||
						pendingSnapshot.toolName === "resend_invite")
				) {
					const prepend = dashboardInvitationsFromToolPayload(toolPayload);
					void refreshDashboardInvitations(
						prepend.length > 0 ? { prepend } : undefined,
					);
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

				// After confirm-from-assistant, refresh the audit page and continue Show me how.
				if (
					!failed &&
					pendingSnapshot.toolName === "confirm_finding" &&
					toolPayload?.continueRemediation === true
				) {
					const documentId = String(
						toolPayload.documentId ?? pendingSnapshot.args?.documentId ?? "",
					);
					const findingId = String(
						toolPayload.findingId ?? pendingSnapshot.args?.findingId ?? "",
					);
					const findingCode =
						typeof toolPayload.findingCode === "string"
							? toolPayload.findingCode
							: typeof pendingSnapshot.args?.findingCode === "string"
								? pendingSnapshot.args.findingCode
								: null;
					const findingTitle = String(
						toolPayload.title ?? pendingSnapshot.args?.title ?? "finding",
					);
					if (documentId) {
						void swrMutate(`/api/audit/documents/${documentId}`);
					}
					if (documentId && findingId) {
						const existingConv = conversationIdRef.current;
						if (existingConv) {
							// No plan yet — the continued research below will re-link with the real outcome.
							linkRemediationChat(findingId, existingConv, false);
						}
						setApplyProgressSteps(null);
						await sendMessage(
							auditRemediationUserPrompt(findingCode, findingTitle),
							{
								bypassBusy: true,
								suppressUserBubble: true,
								launchContext: {
									kind: "audit_remediation",
									findingId,
									documentId,
								},
							},
						);
						return;
					}
				}
			} catch (e) {
				const failedLifecycle = buildFailedActionLifecycle({
					pending: pendingSnapshot,
					errorMessage: toUserFacingErrorMessage(
						e,
						"Something went wrong. Please try again.",
					),
					errorCode: "ERR_ACTION",
					actor: actionActor(),
				});
				setMessages((prev) =>
					prev.map((m) =>
						m.pendingAction?.id === pendingSnapshot.id ||
						m.actionLifecycle?.pendingActionId === pendingSnapshot.id
							? {
									...m,
									content: "I couldn't finish that one.",
									actionLifecycle: failedLifecycle,
								}
							: m,
					),
				);
				toast({
					title: "Action failed",
					description: toUserFacingErrorMessage(
						failedLifecycle.errorMessage,
						"Something went wrong. Please try again.",
					),
					variant: "destructive",
				});
			} finally {
				setApplyProgressSteps(null);
				setSending(false);
			}
		},
		[
			loadHistory,
			pathname,
			pendingAction,
			sendMessage,
			setSending,
			toast,
			user,
		],
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

	const completeResearchPlayback = useCallback(() => {
		setResearchPlaybackMessageId(null);
	}, []);

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
		retryFailedMessage,
		confirmAction,
		cancelPendingAction,
		patchPendingArgs,
		pendingResearchSteps,
		researchPlaybackMessageId,
		completeResearchPlayback,
		applyProgressSteps,
	};
}
