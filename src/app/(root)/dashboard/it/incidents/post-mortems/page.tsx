"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Post-Mortems"
			purpose="Post-incident reviews and action items."
			requiredIntegration="Incident docs store"
			permission="it.view_incidents"
		/>
	);
}
