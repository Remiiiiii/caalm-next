export type AssistantResearchStepStatus =
	| "pending"
	| "active"
	| "done"
	| "empty"
	| "failed";

export type AssistantResearchStepKind =
	| "search"
	| "database"
	| "file"
	| "progress";

export type AssistantResearchStep = {
	id: string;
	label: string;
	status: AssistantResearchStepStatus;
	kind: AssistantResearchStepKind;
	/** Short suffix when resolved, e.g. "— found 1 open action" */
	resultNote?: string;
};
