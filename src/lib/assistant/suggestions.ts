export type AssistantSuggestion = {
	id: string;
	label: string;
	action: { type: "prompt"; text: string } | { type: "navigate"; href: string };
};

export function suggestionsForTurn(params: {
	toolName?: string | null;
	dataIntent?: string | null;
	taskCount?: number;
}): AssistantSuggestion[] {
	const { toolName, dataIntent, taskCount } = params;

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
