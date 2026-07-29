"use client";

import { BarChart3 } from "lucide-react";
import RateLimitMonitoring from "@/components/admin/RateLimitMonitoring";
import { ITPageShell } from "@/components/it/ITPageShell";

export default function ApiAnalyticsPage() {
	return (
		<ITPageShell
			title="API Analytics"
			subtitle="Rate limit usage, request volume, and violation trends"
			icon={BarChart3}
		>
			<RateLimitMonitoring />
		</ITPageShell>
	);
}
