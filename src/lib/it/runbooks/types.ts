export type RunbookSeverity = "low" | "medium" | "high" | "critical";
export type RunbookStatus = "draft" | "published" | "archived";

export type RunbookStep = {
	title: string;
	body: string;
	command?: string;
};

export type Runbook = {
	$id: string;
	title: string;
	slug: string;
	summary: string;
	service: string;
	severity: RunbookSeverity;
	status: RunbookStatus;
	symptoms: string[];
	steps: RunbookStep[];
	verification: string;
	escalation: string;
	ownerId: string;
	orgId: string;
	tags: string[];
	integrationKeys: string[];
	lastReviewedAt?: string;
	$createdAt: string;
	$updatedAt: string;
};

export type RunbookInput = {
	title: string;
	slug?: string;
	summary: string;
	service: string;
	severity: RunbookSeverity;
	status?: RunbookStatus;
	symptoms: string[];
	steps: RunbookStep[];
	verification: string;
	escalation: string;
	tags?: string[];
	integrationKeys?: string[];
	lastReviewedAt?: string;
};

export type RunbookListFilters = {
	search?: string;
	service?: string;
	severity?: RunbookSeverity;
	status?: RunbookStatus;
	limit?: number;
	offset?: number;
};

export type RunbookStorageMode = "appwrite" | "memory";

export type RunbookIntegrationProvider =
	| "pagerduty"
	| "opsgenie"
	| "monitoring";

export type IntegrationStatus = {
	provider: RunbookIntegrationProvider;
	configured: boolean;
	mode: "live" | "stub";
	detail: string;
};
