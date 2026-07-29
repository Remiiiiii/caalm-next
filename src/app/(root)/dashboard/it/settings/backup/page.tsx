"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Backup Settings"
			purpose="Backup schedules and restore readiness."
			requiredIntegration="Backup / disaster recovery"
			permission="it.manage_database"
		/>
	);
}
