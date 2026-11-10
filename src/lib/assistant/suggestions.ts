import {
	extractVerificationNoteFromText,
	isCapClosableStatus,
} from "@/lib/assistant/cap-close-assist";

export type OpenCloseCapSuggestionAction = {
	type: "open_close_cap";
	capId: string;
	findingId: string;
	documentId: string;
	verificationNote: string;
};

export type AssistantSuggestionAction =
	| { type: "prompt"; text: string }
	| { type: "navigate"; href: string }
	| OpenCloseCapSuggestionAction;

export type AssistantSuggestion = {
	id: string;
	label: string;
	action: AssistantSuggestionAction;
};

/** Add open-close chip when research produced verification prose and CAP can close. */
export function withCloseCapSuggestion(
	suggestions: AssistantSuggestion[],
	params: {
		capId: string | null;
		capStatus: string | null;
		canManageCaps: boolean;
		findingId: string;
		documentId: string;
		answerText: string;
	},
): AssistantSuggestion[] {
	if (
		!params.canManageCaps ||
		!params.capId ||
		!isCapClosableStatus(params.capStatus)
	) {
		return suggestions;
	}
	const note = extractVerificationNoteFromText(params.answerText);
	if (!note || note.length < 10) {
		return suggestions;
	}
	const chip = buildOpenCloseCapSuggestion({
		capId: params.capId,
		findingId: params.findingId,
		documentId: params.documentId,
		verificationNote: note,
	});
	if (suggestions.some((s) => s.id === chip.id)) {
		return suggestions;
	}
	return [chip, ...suggestions].slice(0, 2);
}

export function buildOpenCloseCapSuggestion(params: {
	capId: string;
	findingId: string;
	documentId: string;
	verificationNote: string;
}): AssistantSuggestion {
	const note = params.verificationNote.trim();
	const label = note
		? "Open Mark closed with this note"
		: "Open Mark closed dialog";
	return {
		id: "open-close-cap",
		label,
		action: {
			type: "open_close_cap",
			capId: params.capId,
			findingId: params.findingId,
			documentId: params.documentId,
			verificationNote: note,
		},
	};
}

export function suggestionsForTurn(params: {
	toolName?: string | null;
	dataIntent?: string | null;
	taskCount?: number;
}): AssistantSuggestion[] {
	const { toolName, dataIntent, taskCount } = params;

	if (
		toolName === "invite_user" ||
		toolName === "invite_users" ||
		dataIntent === "invite_user"
	) {
		return [
			{
				id: "open-pending-invites",
				label: "Open Pending Invitations",
				action: { type: "navigate", href: "/dashboard" },
			},
			{
				id: "invite-another",
				label: "Invite someone else",
				action: {
					type: "prompt",
					text: "Invite another person from the connected directory",
				},
			},
		];
	}

	if (toolName === "list_tasks" || dataIntent === "list_tasks") {
		if (taskCount === 0) {
			return [
				{
					id: "tasks-create",
					label: "Help me create my first task",
					action: { type: "prompt", text: "Help me create a new task" },
				},
				{
					id: "tasks-open",
					label: "Open the Tasks page",
					action: { type: "navigate", href: "/team/tasks" },
				},
				{
					id: "expiring",
					label: "What licenses are expiring soon?",
					action: {
						type: "prompt",
						text: "What contracts or licenses are expiring soon?",
					},
				},
			];
		}
		return [
			{
				id: "tasks-open",
				label: "Open the Tasks page",
				action: { type: "navigate", href: "/team/tasks" },
			},
			{
				id: "tasks-create",
				label: "Create a new task for me",
				action: { type: "prompt", text: "Help me create a new task" },
			},
			{
				id: "tasks-due",
				label: "What's due this week?",
				action: {
					type: "prompt",
					text: "Which of my pending tasks are due this week?",
				},
			},
		];
	}

	if (
		toolName === "list_pending_approvals" ||
		dataIntent === "list_pending_approvals"
	) {
		return [
			{
				id: "approvals-open",
				label: "Open calendar approvals",
				action: { type: "navigate", href: "/calendar" },
			},
			{
				id: "tasks-pending",
				label: "Show my pending tasks",
				action: { type: "prompt", text: "Show my pending tasks" },
			},
		];
	}

	if (toolName === "search_contracts" || dataIntent === "search_contracts") {
		return [
			{
				id: "contracts-open",
				label: "Open Contracts",
				action: { type: "navigate", href: "/contracts" },
			},
			{
				id: "expiring",
				label: "What is expiring soon?",
				action: {
					type: "prompt",
					text: "What contracts or licenses are expiring soon?",
				},
			},
		];
	}

	if (toolName === "search_licenses" || dataIntent === "search_licenses") {
		return [
			{
				id: "licenses-open",
				label: "Open Licenses",
				action: { type: "navigate", href: "/licenses" },
			},
			{
				id: "expiring",
				label: "What is expiring soon?",
				action: {
					type: "prompt",
					text: "What contracts or licenses are expiring soon?",
				},
			},
		];
	}

	if (toolName === "list_calendar_events" || dataIntent === "view_schedule") {
		return [
			{
				id: "calendar-open",
				label: "Open Calendar",
				action: { type: "navigate", href: "/calendar" },
			},
			{
				id: "schedule-meeting",
				label: "Schedule a meeting",
				action: {
					type: "prompt",
					text: "Help me schedule a meeting. Ask me for any details you still need.",
				},
			},
			{
				id: "tasks-pending",
				label: "Show my pending tasks",
				action: { type: "prompt", text: "Show my pending tasks" },
			},
		];
	}

	if (toolName === "create_calendar_event" || dataIntent === "schedule_event") {
		return [
			{
				id: "calendar-open",
				label: "Open Calendar",
				action: { type: "navigate", href: "/calendar" },
			},
			{
				id: "view-schedule",
				label: "What's on my calendar today?",
				action: { type: "prompt", text: "What's on my calendar today?" },
			},
		];
	}

	if (
		toolName === "reschedule_calendar_event" ||
		toolName === "cancel_calendar_event" ||
		dataIntent === "reschedule_event" ||
		dataIntent === "cancel_event"
	) {
		return [
			{
				id: "calendar-open",
				label: "Open Calendar",
				action: { type: "navigate", href: "/calendar" },
			},
			{
				id: "view-schedule",
				label: "What's on my calendar today?",
				action: { type: "prompt", text: "What's on my calendar today?" },
			},
		];
	}

	if (toolName === "list_expirations" || dataIntent === "expiring") {
		return [
			{
				id: "contracts-open",
				label: "Open Contracts",
				action: { type: "navigate", href: "/contracts" },
			},
			{
				id: "licenses-open",
				label: "Open Licenses",
				action: { type: "navigate", href: "/licenses" },
			},
			{
				id: "schedule-review",
				label: "Schedule a renewal review",
				action: {
					type: "prompt",
					text: "Schedule a renewal review meeting for next week",
				},
			},
		];
	}

	if (toolName === "list_audit_logs" || dataIntent === "view_audit") {
		return [
			{
				id: "expiring",
				label: "What's expiring soon?",
				action: {
					type: "prompt",
					text: "What contracts or licenses are expiring soon?",
				},
			},
			{
				id: "tasks-pending",
				label: "Show my pending tasks",
				action: { type: "prompt", text: "Show my pending tasks" },
			},
		];
	}

	if (toolName === "complete_task" || dataIntent === "complete_task") {
		return [
			{
				id: "tasks-open",
				label: "Open the Tasks page",
				action: { type: "navigate", href: "/team/tasks" },
			},
			{
				id: "tasks-pending",
				label: "Show my pending tasks",
				action: { type: "prompt", text: "Show my pending tasks" },
			},
		];
	}

	if (dataIntent === "expiring") {
		return [
			{
				id: "licenses-open",
				label: "Open Licenses",
				action: { type: "navigate", href: "/licenses" },
			},
			{
				id: "contracts-open",
				label: "Open Contracts",
				action: { type: "navigate", href: "/contracts" },
			},
			{
				id: "tasks-pending",
				label: "Show my pending tasks",
				action: { type: "prompt", text: "Show my pending tasks" },
			},
		];
	}

	// Default product follow-ups
	return [
		{
			id: "tasks-pending",
			label: "Show my pending tasks",
			action: { type: "prompt", text: "Show my pending tasks" },
		},
		{
			id: "expiring",
			label: "What is expiring soon?",
			action: {
				type: "prompt",
				text: "What contracts or licenses are expiring soon?",
			},
		},
		{
			id: "audits-help",
			label: "How do audits work in CAALM?",
			action: { type: "prompt", text: "What are audits in CAALM?" },
		},
	];
}
