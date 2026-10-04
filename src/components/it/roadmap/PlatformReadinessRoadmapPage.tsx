"use client";

import { ClmRoadmapPage } from "@/components/it/roadmap/ClmRoadmapPage";

export function PlatformReadinessRoadmapPage() {
	return (
		<ClmRoadmapPage
			title="Platform Readiness Roadmap"
			subtitle="Market-readiness plan from the current-state assessment — workspace isolation, API coverage, honest dashboards, and buyer trust. Tasks unlock in order; merge + green CI marks complete (not the PR log)."
			progressLabel="Overall platform readiness"
			overviewPath="/api/roadmap/overview?catalog=prd"
		/>
	);
}
