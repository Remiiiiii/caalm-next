"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Error Logs"
			purpose="Aggregated application and API error streams for triage."
			requiredIntegration="Error tracking (Sentry or equivalent)"
			permission="it.view_system_logs"
		/>
	);
}
