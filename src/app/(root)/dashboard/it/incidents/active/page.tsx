"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Active Incidents"
			purpose="Currently open operational incidents."
			requiredIntegration="PagerDuty / Opsgenie"
			permission="it.view_incidents"
		/>
	);
}
