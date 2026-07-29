"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Database Performance"
			purpose="Query latency and connection pool metrics."
			requiredIntegration="Appwrite / DB metrics"
			permission="it.manage_database"
		/>
	);
}
