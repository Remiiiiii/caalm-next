"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="API Usage"
			purpose="Per-route usage and consumer metrics."
			requiredIntegration="API gateway analytics"
			permission="it.view_analytics"
		/>
	);
}
