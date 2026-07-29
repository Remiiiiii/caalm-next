"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Performance Metrics"
			purpose="Application and API latency, throughput, and resource utilization."
			requiredIntegration="APM / OpenTelemetry"
			permission="it.view_monitoring"
		/>
	);
}
