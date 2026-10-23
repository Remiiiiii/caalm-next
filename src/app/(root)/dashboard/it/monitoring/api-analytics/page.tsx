"use client";

import RateLimitMonitoring from "@/components/admin/RateLimitMonitoring";
import { ITPageShell } from "@/components/it/ITPageShell";

export default function ApiAnalyticsPage() {
	return (
		<ITPageShell
			title="API Analytics"
			subtitle="Rate limit usage, request volume, and violation trends"
		>
			<RateLimitMonitoring />
		</ITPageShell>
	);
}
