"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Infrastructure Monitoring"
			purpose="Host, container, and cloud resource health."
			requiredIntegration="CloudWatch / Datadog infrastructure"
			permission="it.view_monitoring"
		/>
	);
}
