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
};

export type AssistantSuggestion = {
	id: string;
	label: string;
	action:
		| { type: "prompt"; text: string }
		| { type: "navigate"; href: string };
};

export type AssistantChatMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	sources?: RetrievedSource[];
	suggestions?: AssistantSuggestion[];
	pendingAction?: AssistantPendingAction;
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
	loadHistory: () => Promise<void>;
	selectConversation: (id: string) => Promise<void>;
	startNewChat: () => Promise<void>;
	sendMessage: (text: string) => Promise<void>;
	confirmAction: () => Promise<void>;
};

export type AssistantConversationSummary = {
	$id: string;
	title: string;
	lastMessagePreview: string;
	status: "active" | "closed";
	lastMessageAt: string;
	$createdAt?: string;
};
