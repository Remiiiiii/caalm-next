"use client";

import { ITPlaceholderPage } from "@/components/it/ITPlaceholderPage";

export default function Page() {
	return (
		<ITPlaceholderPage
			title="API Documentation"
			purpose="Internal API catalog and OpenAPI docs."
			requiredIntegration="OpenAPI / Scalar docs host"
			permission="it.view_analytics"
		/>
	);
}
