"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Application Monitoring"
			purpose="Frontend and server application performance traces."
			requiredIntegration="APM traces"
			permission="it.view_monitoring"
		/>
	);
}
