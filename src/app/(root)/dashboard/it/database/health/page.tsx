"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Database Health"
			purpose="Database availability and replica status."
			requiredIntegration="Database health probes"
			permission="it.manage_database"
		/>
	);
}
