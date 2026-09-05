/** Document statuses that close live approval (history only). */
export const TERMINAL_DOCUMENT_STATUSES = ["expired", "inactive"] as const;

export const WORKFLOW_FROZEN_MESSAGE =
	"Approval is closed because this document expired or is inactive";

export function isTerminalDocumentStatus(
	status?: string | null,
): boolean {
	const key = (status || "").trim().toLowerCase();
	return (TERMINAL_DOCUMENT_STATUSES as readonly string[]).includes(key);
}

export class WorkflowFrozenError extends Error {
	status = 409;

	constructor(message = WORKFLOW_FROZEN_MESSAGE) {
		super(message);
		this.name = "WorkflowFrozenError";
	}
}

export function assertWorkflowMutable(status?: string | null): void {
	if (isTerminalDocumentStatus(status)) {
		throw new WorkflowFrozenError();
	}
}
