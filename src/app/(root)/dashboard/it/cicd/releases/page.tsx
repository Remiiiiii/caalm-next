"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Releases"
			purpose="Release notes and version rollout status."
			requiredIntegration="Release management API"
			permission="it.manage_ci_cd"
		/>
	);
}
