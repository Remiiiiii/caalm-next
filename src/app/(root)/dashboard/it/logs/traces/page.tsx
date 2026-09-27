"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Distributed Traces"
			purpose="Request traces across services."
			requiredIntegration="OpenTelemetry traces"
			permission="it.view_system_logs"
		/>
	);
}
