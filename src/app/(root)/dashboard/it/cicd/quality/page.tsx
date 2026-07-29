"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Code Quality"
			purpose="Static analysis and quality gate results."
			requiredIntegration="Sonar / quality scanner"
			permission="it.manage_ci_cd"
		/>
	);
}
