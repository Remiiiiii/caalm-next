"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Incident Response"
			purpose="Playbooks and active security incidents."
			requiredIntegration="Incident response platform"
			permission="it.view_incidents"
		/>
	);
}
