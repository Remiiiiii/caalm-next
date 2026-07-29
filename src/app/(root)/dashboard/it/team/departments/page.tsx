"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Team Departments"
			purpose="Department roster for IT staffing."
			requiredIntegration="Org directory"
			permission="it.view_monitoring"
		/>
	);
}
