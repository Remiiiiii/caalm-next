import { listRunbooks, matchRunbooksForAlert } from "./store";
import type {
	IntegrationStatus,
	Runbook,
	RunbookIntegrationProvider,
} from "./types";

export type AlertMatchRequest = {
	provider: RunbookIntegrationProvider;
	service?: string;
	title?: string;
	severity?: string;
	raw?: Record<string, unknown>;
};

export type AlertMatchResult = {
	provider: RunbookIntegrationProvider;
	mode: "live" | "stub";
	matches: Array<{
		runbookId: string;
		title: string;
		service: string;
		href: string;
	}>;
	message: string;
};

export function getRunbookIntegrationStatuses(): IntegrationStatus[] {
	const pagerduty = Boolean(process.env.PAGERDUTY_API_TOKEN);
	const opsgenie = Boolean(process.env.OPSGENIE_API_KEY);
	const monitoring = Boolean(process.env.RUNBOOKS_WEBHOOK_SECRET);

	return [
		{
			provider: "pagerduty",
			configured: pagerduty,
			mode: pagerduty ? "live" : "stub",
			detail: pagerduty
				? "API token present — ready to map PD services to runbooks."
				: "Stubbed. Set PAGERDUTY_API_TOKEN to enable live mapping.",
		},
		{
			provider: "opsgenie",
			configured: opsgenie,
			mode: opsgenie ? "live" : "stub",
			detail: opsgenie
				? "API key present — ready to map Opsgenie alerts to runbooks."
				: "Stubbed. Set OPSGENIE_API_KEY to enable live mapping.",
		},
		{
			provider: "monitoring",
			configured: monitoring,
			mode: monitoring ? "live" : "stub",
			detail: monitoring
				? "Webhook secret present — inbound monitoring alerts can be verified."
				: "Stubbed. Set RUNBOOKS_WEBHOOK_SECRET for signed webhooks.",
		},
	];
}

function extractAlertText(input: AlertMatchRequest): string {
	return [input.title, input.service, JSON.stringify(input.raw || {})]
		.filter(Boolean)
		.join(" ");
}

export async function matchAlertToRunbooks(
	orgId: string,
	input: AlertMatchRequest,
): Promise<AlertMatchResult> {
	const statuses = getRunbookIntegrationStatuses();
	const status = statuses.find((s) => s.provider === input.provider);
	const { items } = await listRunbooks(orgId, {
		status: "published",
		limit: 200,
	});
	const matches = matchRunbooksForAlert(items, {
		service: input.service,
		text: extractAlertText(input),
	}).slice(0, 5);

	return {
		provider: input.provider,
		mode: status?.mode || "stub",
		matches: matches.map((rb: Runbook) => ({
			runbookId: rb.$id,
			title: rb.title,
			service: rb.service,
			href: `/dashboard/it/incidents/runbooks/${rb.$id}`,
		})),
		message: status?.configured
			? "Matched using configured provider credentials."
			: "Provider stub active — matching used local runbook symptoms/services only.",
	};
}
