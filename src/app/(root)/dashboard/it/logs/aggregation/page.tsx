"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Log Aggregation"
			purpose="Centralized log search across services."
			requiredIntegration="Log aggregator"
			permission="it.view_system_logs"
		/>
	);
}
