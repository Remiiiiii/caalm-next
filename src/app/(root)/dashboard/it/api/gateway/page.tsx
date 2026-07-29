"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="API Gateway"
			purpose="Gateway routes, keys, and throttles."
			requiredIntegration="API gateway control plane"
			permission="it.manage_api_keys"
		/>
	);
}
