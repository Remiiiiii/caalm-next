"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="Team Performance"
			purpose="Engineering delivery and response metrics."
			requiredIntegration="Engineering analytics"
			permission="it.view_analytics"
		/>
	);
}
