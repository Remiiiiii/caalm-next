"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Security Dashboard"
			purpose="Security posture score and open findings."
			requiredIntegration="Security SIEM"
			permission="it.view_security"
		/>
	);
}
