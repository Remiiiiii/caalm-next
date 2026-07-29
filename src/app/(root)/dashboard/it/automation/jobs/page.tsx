"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Automation Jobs"
			purpose="Scheduled jobs and automation runs."
			requiredIntegration="Job scheduler / cron"
			permission="it.manage_deployments"
		/>
	);
}
