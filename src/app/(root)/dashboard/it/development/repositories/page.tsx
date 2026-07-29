"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Repositories"
			purpose="Source repository inventory and branch health."
			requiredIntegration="GitHub / GitLab API"
			permission="it.manage_ci_cd"
		/>
	);
}
