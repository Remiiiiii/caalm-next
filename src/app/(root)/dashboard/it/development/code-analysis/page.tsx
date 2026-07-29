"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Code Analysis"
			purpose="Static analysis findings and coverage."
			requiredIntegration="Code analysis scanner"
			permission="it.manage_ci_cd"
		/>
	);
}
