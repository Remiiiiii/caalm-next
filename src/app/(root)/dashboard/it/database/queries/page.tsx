"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Database Queries"
			purpose="Slow query and query pattern analysis."
			requiredIntegration="Query analytics"
			permission="it.manage_database"
		/>
	);
}
