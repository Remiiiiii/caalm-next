"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Build History"
			purpose="Historical build results and artifacts."
			requiredIntegration="CI provider API"
			permission="it.manage_ci_cd"
		/>
	);
}
