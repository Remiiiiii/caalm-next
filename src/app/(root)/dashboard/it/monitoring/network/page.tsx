"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Network Monitoring"
			purpose="Network latency, DNS, and edge connectivity."
			requiredIntegration="Network observability agent"
			permission="it.view_monitoring"
		/>
	);
}
