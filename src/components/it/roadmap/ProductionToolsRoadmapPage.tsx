"use client";

import { ClmRoadmapPage } from "@/components/it/roadmap/ClmRoadmapPage";

export function ProductionToolsRoadmapPage() {
	return (
		<ClmRoadmapPage
			title="Production Tools Roadmap"
			subtitle="Ask CAALM assistant tool build (gap list A–O). Each task is one permission-gated tool with confirm and audit. Tasks unlock in order; merge + green CI marks complete (not the PR log)."
			progressLabel="Overall assistant tool coverage"
			overviewPath="/api/roadmap/overview?catalog=pto"
		/>
	);
}
