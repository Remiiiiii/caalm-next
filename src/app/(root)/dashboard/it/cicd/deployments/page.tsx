"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Deployments"
			purpose="Deployment tracking across environments."
			requiredIntegration="Vercel / deploy provider"
			permission="it.manage_deployments"
		/>
	);
}
