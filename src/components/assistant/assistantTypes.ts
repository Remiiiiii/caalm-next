export type RetrievedSource = {
	id: string;
	title: string;
	excerpt: string;
	href?: string;
};

export type AssistantPendingAction = {
	id: string;
	label: string;
	preview: string;
	toolName: string;
	/** Structured tool args for rich confirmation UI (e.g. meeting card). */
	args?: Record<string, unknown>;
};

export type AssistantSuggestion = {
	id: string;
	label: string;
	action: { type: "prompt"; text: string } | { type: "navigate"; href: string };
};

export type AssistantMeetingCreated = {
	eventId?: string;
	title: string;
	date: string;
	startTime?: string;
	endTime?: string;
	description?: string;
	participants?: string;
	invitedCount?: number;
	calendarHref?: string;
	conflicts?: string[];
};

export type AssistantActionCompleted = {
	eyebrow?: string;
	headline: string;
	fields: Array<{ label: string; value: string }>;
};

export type AssistantActivityFeedItem = {
	id: string;
	kind: "schedule" | "feedback" | "task";
	verb: string;
	detail?: string;
	who?: string;
	whenLabel: string;
	count?: number;
};

export type AssistantActivityFeed = {
	title: string;
	days: Array<{
		label: string;
		items: AssistantActivityFeedItem[];
	}>;
};

export type AssistantChatMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	sources?: RetrievedSource[];
	suggestions?: AssistantSuggestion[];
	pendingAction?: AssistantPendingAction;
	/** Structured success card after scheduling a meeting */
	meetingCreated?: AssistantMeetingCreated;
	/** Structured success card after confirming a mutating action (e.g. reschedule) */
	actionCompleted?: AssistantActionCompleted;
	/** Structured recent-activity list card */
	activityFeed?: AssistantActivityFeed;
	createdAt?: string;
};

export type UseCaalmAssistantReturn = {
	conversationId: string | null;
	/** Status of the open thread; closed threads are view-only. */
	conversationStatus: "active" | "closed" | null;
	messages: AssistantChatMessage[];
	conversations: AssistantConversationSummary[];
	pendingAction: AssistantPendingAction | null;
	isSending: boolean;
	historyLoading: boolean;
	/** True while a selected conversation's messages are loading */
	conversationLoading: boolean;
	loadHistory: () => Promise<void>;
	selectConversation: (id: string) => Promise<void>;
	startNewChat: () => Promise<void>;
	/** Restore the current active session after hide/remount (does not create a new chat). */
	resumeActiveSession: () => Promise<void>;
	sendMessage: (text: string) => Promise<void>;
	confirmAction: (argsPatch?: Record<string, unknown>) => Promise<void>;
	/** Merge confirmation-card edits into the in-memory pending action */
	patchPendingArgs: (argsPatch: Record<string, unknown>) => void;
};

export type AssistantConversationSummary = {
	$id: string;
	title: string;
	lastMessagePreview: string;
	status: "active" | "closed";
	lastMessageAt: string;
	$createdAt?: string;
};
