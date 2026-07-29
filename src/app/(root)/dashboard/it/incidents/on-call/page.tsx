"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="On-Call"
			purpose="On-call schedules and escalation policies."
			requiredIntegration="On-call scheduling provider"
			permission="it.view_incidents"
		/>
	);
}
