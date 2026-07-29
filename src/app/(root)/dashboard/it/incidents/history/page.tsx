"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Incident History"
			purpose="Resolved incident timeline."
			requiredIntegration="Incident management API"
			permission="it.view_incidents"
		/>
	);
}
