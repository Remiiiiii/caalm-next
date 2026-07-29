"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Issues"
			purpose="Engineering issue tracker overview."
			requiredIntegration="GitHub Issues / Jira"
			permission="it.manage_ci_cd"
		/>
	);
}
