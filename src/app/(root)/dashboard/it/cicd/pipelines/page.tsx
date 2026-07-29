"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="CI/CD Pipelines"
			purpose="Pipeline status across build and deploy workflows."
			requiredIntegration="GitHub Actions / CI provider API"
			permission="it.manage_ci_cd"
		/>
	);
}
